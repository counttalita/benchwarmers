import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logger

  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const engagementId = searchParams.get('engagementId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const companyId = request.headers.get('x-company-id')

    const where: any = {}
    
    // Check if user can access payments for this company
    if (companyId) {
      // Verify user belongs to this company
      const userCompany = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true }
      })

      if (!userCompany || userCompany.companyId !== companyId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      where.engagement = {
        contract: {
          offer: {
            seekerCompanyId: companyId
          }
        }
      }
    }

    if (engagementId) {
      where.engagementId = engagementId
    }

    if (status) {
      where.status = status
    }

    const [payments, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          engagement: {
            include: {
              contract: {
                include: {
                  offer: {
                    include: {
                      seekerCompany: true,
                      providerCompany: true
                    }
                  }
                }
              }
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ])

    const sanitizedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      type: payment.type,
      reason: payment.reason,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      engagement: {
        id: payment.engagement.id,
        title: payment.engagement.title,
        status: payment.engagement.status
      }
    }))

    requestLogger.info('Payments retrieved successfully', {
      count: payments.length,
      totalCount,
      page,
      limit
    })

    return NextResponse.json({
      payments: sanitizedPayments,
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
      { error: 'Failed to retrieve payments' },
      { status: 500 }
    )
  }
}
