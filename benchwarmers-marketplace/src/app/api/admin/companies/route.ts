import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError, logInfo, logDb, logBusiness, logAuth } from '@/lib/logger'
import { sendCompanyApprovalEmail } from '@/lib/email'
import { z } from 'zod'

// Schema for company approval/rejection
const companyActionSchema = z.object({
  companyId: z.string().cuid('Invalid company ID format'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
})

// GET - List pending companies for admin review
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    // TODO: Add admin authentication check here
    // For now, we'll skip auth but this should be implemented

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const domainVerified = searchParams.get('domainVerified')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    logInfo('Admin companies list request', { status, search, type, domainVerified, page, limit })

    // Build where clause
    const whereClause: any = {}
    
    if (status !== 'all') {
      whereClause.status = status
    }
    
    if (type && type !== 'all') {
      whereClause.type = type
    }
    
    if (domainVerified !== null) {
      whereClause.domainVerified = domainVerified === 'true'
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get companies with their admin users
    const companiesCheckStartTime = Date.now()
    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        include: {
          users: {
            where: { role: 'admin' },
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              phoneVerified: true,
              createdAt: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.company.count({
        where: whereClause
      })
    ])

    logDb('Admin companies list query', 'company', { 
      status,
      search,
      type,
      domainVerified,
      count: companies.length,
      totalCount,
      duration: Date.now() - companiesCheckStartTime
    })

    requestLogger.end(200)
    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    })

  } catch (error) {
    logError('Admin companies list error', error)
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Approve or reject a company
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    // TODO: Add admin authentication check here
    // For now, we'll skip auth but this should be implemented

    const body = await request.json()
    
    // Validate input data
    const validationResult = companyActionSchema.safeParse(body)
    if (!validationResult.success) {
      logError('Company action failed: Validation error', null, {
        validationErrors: validationResult.error.issues,
        requestBody: body
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { companyId, action, notes, rejectionReason } = validationResult.data

    logInfo('Admin company action attempt', { companyId, action, notes })

    // Find company with admin user
    const companyCheckStartTime = Date.now()
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { role: 'admin' },
          take: 1
        }
      }
    })
    logDb('Company check for admin action', 'company', { 
      companyId, 
      found: !!company,
      duration: Date.now() - companyCheckStartTime
    })

    if (!company) {
      logError('Company action failed: Company not found', null, { companyId })
      requestLogger.end(404)
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (company.status !== 'pending') {
      logError('Company action failed: Company not pending', null, { 
        companyId, 
        currentStatus: company.status 
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Company is not pending approval' },
        { status: 400 }
      )
    }

    // Update company status
    const updateData: any = {
      adminNotes: notes,
      updatedAt: new Date(),
    }

    if (action === 'approve') {
      updateData.status = 'active'
      updateData.verifiedAt = new Date()
    } else {
      updateData.status = 'suspended'
      updateData.rejectionReason = rejectionReason
    }

    const updateStartTime = Date.now()
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
      include: {
        users: {
          where: { role: 'admin' },
          take: 1
        }
      }
    })
    logDb('Company status update', 'company', { 
      companyId,
      action,
      newStatus: updatedCompany.status,
      duration: Date.now() - updateStartTime
    })

    // Send SMS and email notifications to admin user
    if (updatedCompany.users.length > 0) {
      const adminUser = updatedCompany.users[0]
      
      // Send SMS notification
      try {
        const { sendSMS } = await import('@/lib/twilio')
        
        let message: string
        if (action === 'approve') {
          message = `Congratulations! Your BenchWarmers company account for ${company.name} has been approved. You can now log in and start using the platform.`
        } else {
          message = `Your BenchWarmers company registration for ${company.name} has been declined. ${rejectionReason ? `Reason: ${rejectionReason}` : ''} Please contact support for more information.`
        }

        await sendSMS(adminUser.phoneNumber, message)
        logInfo('Company action SMS sent', {
          companyId,
          action,
          phoneNumber: adminUser.phoneNumber
        })
      } catch (smsError) {
        logError('Company action SMS failed', smsError, {
          companyId,
          action,
          phoneNumber: adminUser.phoneNumber
        })
      }

      // Send email notification if email is available
      if (adminUser.email) {
        try {
          await sendCompanyApprovalEmail(
            adminUser.email,
            company.name,
            action === 'approve',
            rejectionReason
          )
          logInfo('Company action email sent', {
            companyId,
            action,
            email: adminUser.email
          })
        } catch (emailError) {
          logError('Company action email failed', emailError, {
            companyId,
            action,
            email: adminUser.email
          })
        }
      }
    }

    // Log business event
    logBusiness(`Company ${action}d by admin`, 'company', {
      companyId: updatedCompany.id,
      companyName: updatedCompany.name,
      domain: updatedCompany.domain,
      action,
      adminNotes: notes,
      rejectionReason,
      newStatus: updatedCompany.status
    })

    logAuth(`Admin ${action}d company`, 'admin', {
      companyId: updatedCompany.id,
      companyName: updatedCompany.name,
      action
    })

    requestLogger.end(200)
    return NextResponse.json({
      message: `Company ${action}d successfully`,
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        domain: updatedCompany.domain,
        status: updatedCompany.status,
        verifiedAt: updatedCompany.verifiedAt,
        adminNotes: updatedCompany.adminNotes,
        rejectionReason: updatedCompany.rejectionReason,
      }
    })

  } catch (error) {
    logError('Company action unexpected error', error)
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}