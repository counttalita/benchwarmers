import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const verificationDecisionSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  decision: z.enum(['approve', 'reject', 'request_info']),
  reason: z.string().optional(),
  requiredDocuments: z.array(z.string()).optional(),
  notes: z.string().optional()
})

const kycDocumentSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  documentType: z.enum(['business_registration', 'tax_certificate', 'bank_statement', 'identity_document', 'proof_of_address']),
  documentUrl: z.string().url('Valid document URL is required'),
  expiryDate: z.string().optional().transform(str => str ? new Date(str) : undefined)
})

// GET /api/admin/verification - Get companies pending verification
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    logInfo('Fetching companies for verification', {
      correlationId,
      status,
      page,
      limit
    })

    // Build where clause based on status
    let whereClause: any = {}
    
    switch (status) {
      case 'pending':
        whereClause = { 
          verified: false, 
          status: 'PENDING_VERIFICATION' 
        }
        break
      case 'approved':
        whereClause = { 
          verified: true 
        }
        break
      case 'rejected':
        whereClause = { 
          verified: false, 
          status: 'SUSPENDED' 
        }
        break
      case 'all':
        // No additional filter
        break
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          },
          verificationDocuments: {
            orderBy: { createdAt: 'desc' }
          },
          verificationHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.company.count({ where: whereClause })
    ])

    logInfo('Companies for verification retrieved successfully', {
      correlationId,
      count: companies.length,
      total
    })

    return NextResponse.json({
      success: true,
      data: companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_verification_queue' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve verification queue',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/admin/verification - Make verification decision
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Processing verification decision', {
      correlationId,
      requestBody: body
    })

    // Validate request data
    const validatedData = verificationDecisionSchema.parse(body)

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
      include: {
        users: true,
        verificationDocuments: true
      }
    })

    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Company not found',
        correlationId
      }, { status: 404 })
    }

    // Process verification decision
    let updateData: any = {
      updatedAt: new Date()
    }

    let verificationStatus: string
    let notificationMessage: string

    switch (validatedData.decision) {
      case 'approve':
        updateData.verified = true
        updateData.verifiedAt = new Date()
        updateData.status = 'ACTIVE'
        verificationStatus = 'APPROVED'
        notificationMessage = 'Your company has been successfully verified and approved.'
        break

      case 'reject':
        updateData.verified = false
        updateData.status = 'SUSPENDED'
        verificationStatus = 'REJECTED'
        notificationMessage = `Your company verification has been rejected. Reason: ${validatedData.reason || 'Please contact support for more information.'}`
        break

      case 'request_info':
        updateData.status = 'PENDING_VERIFICATION'
        verificationStatus = 'INFO_REQUESTED'
        notificationMessage = `Additional information required for verification. ${validatedData.reason || 'Please check your dashboard for required documents.'}`
        break
    }

    // Update company status
    const updatedCompany = await prisma.company.update({
      where: { id: validatedData.companyId },
      data: updateData
    })

    // Create verification history record
    await prisma.verificationHistory.create({
      data: {
        companyId: validatedData.companyId,
        status: verificationStatus,
        decision: validatedData.decision,
        reason: validatedData.reason,
        requiredDocuments: validatedData.requiredDocuments,
        notes: validatedData.notes,
        processedBy: 'admin', // TODO: Get from session
        processedAt: new Date()
      }
    })

    // TODO: Send notification to company
    // await notificationService.sendVerificationUpdate({
    //   companyId: validatedData.companyId,
    //   status: verificationStatus,
    //   message: notificationMessage
    // })

    logInfo('Verification decision processed successfully', {
      correlationId,
      companyId: validatedData.companyId,
      decision: validatedData.decision,
      newStatus: updateData.status
    })

    return NextResponse.json({
      success: true,
      data: {
        companyId: validatedData.companyId,
        decision: validatedData.decision,
        status: verificationStatus,
        company: updatedCompany
      },
      message: 'Verification decision processed successfully',
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'VERIFICATION_VALIDATION_ERROR',
        'Validation error processing verification decision',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'process_verification_decision' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process verification decision',
      correlationId
    }, { status: 500 })
  }
}

// PUT /api/admin/verification - Upload KYC/KYB documents
export async function PUT(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Uploading KYC/KYB document', {
      correlationId,
      companyId: body.companyId,
      documentType: body.documentType
    })

    // Validate request data
    const validatedData = kycDocumentSchema.parse(body)

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId }
    })

    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Company not found',
        correlationId
      }, { status: 404 })
    }

    // Create or update document record
    const document = await prisma.verificationDocument.upsert({
      where: {
        companyId_documentType: {
          companyId: validatedData.companyId,
          documentType: validatedData.documentType
        }
      },
      update: {
        documentUrl: validatedData.documentUrl,
        expiryDate: validatedData.expiryDate,
        status: 'PENDING_REVIEW',
        uploadedAt: new Date()
      },
      create: {
        companyId: validatedData.companyId,
        documentType: validatedData.documentType,
        documentUrl: validatedData.documentUrl,
        expiryDate: validatedData.expiryDate,
        status: 'PENDING_REVIEW',
        uploadedAt: new Date()
      }
    })

    // Check if all required documents are uploaded
    const requiredDocuments = ['business_registration', 'tax_certificate', 'identity_document']
    const uploadedDocuments = await prisma.verificationDocument.count({
      where: {
        companyId: validatedData.companyId,
        documentType: { in: requiredDocuments },
        status: { in: ['PENDING_REVIEW', 'APPROVED'] }
      }
    })

    // Update company status if all documents are uploaded
    if (uploadedDocuments >= requiredDocuments.length && company.status !== 'PENDING_VERIFICATION') {
      await prisma.company.update({
        where: { id: validatedData.companyId },
        data: { status: 'PENDING_VERIFICATION' }
      })
    }

    logInfo('KYC/KYB document uploaded successfully', {
      correlationId,
      documentId: document.id,
      companyId: validatedData.companyId
    })

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document uploaded successfully',
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'DOCUMENT_UPLOAD_VALIDATION_ERROR',
        'Validation error uploading document',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'upload_kyc_document' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to upload document',
      correlationId
    }, { status: 500 })
  }
}
