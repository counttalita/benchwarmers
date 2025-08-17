import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              talentRequests: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.company.count({ where })
    ])

    requestLogger.info('Admin companies retrieved successfully', {
      count: companies.length,
      totalCount,
      status,
      page,
      limit
    })

    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Failed to retrieve companies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const body = await request.json()
    const { companyId, action, reason } = body

    if (!companyId || !action) {
      return NextResponse.json(
        { error: 'Company ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either approve or reject' },
        { status: 400 }
      )
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (company.status !== 'pending') {
      return NextResponse.json(
        { error: 'Company is not pending approval' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    let message = ''

    if (action === 'approve') {
      updateData.status = 'active'
      updateData.verifiedAt = new Date()
      message = 'Company approved successfully'
    } else if (action === 'reject') {
      updateData.status = 'suspended'
      updateData.rejectionReason = reason || 'Rejected by admin'
      message = 'Company rejected successfully'
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData
    })

    requestLogger.info('Company status updated', {
      companyId,
      action,
      newStatus: updatedCompany.status
    })

    return NextResponse.json({
      message,
      company: updatedCompany
    })

  } catch (error) {
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Failed to update company status' },
      { status: 500 }
    )
  }
}