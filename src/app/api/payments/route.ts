import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/payments - Get payment history
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/payments',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (userId) {
      where.OR = [
        { talentId: userId },
        { companyId: userId }
      ]
    }

    if (companyId) {
      where.companyId = companyId
    }

    if (status) {
      where.status = status
    }

    // Get payments with pagination
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          talent: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          },
          engagement: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              rate: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.payment.count({ where })
    ])

    requestLogger.info('Payments retrieved successfully', {
      count: payments.length,
      total,
      page,
      limit,
      filters: { userId, companyId, status }
    })

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve payments', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/payments - Process payment
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/payments',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      engagementId,
      amount,
      paymentMethod,
      description
    } = body

    if (!engagementId || !amount || !paymentMethod) {
      requestLogger.warn('Missing required fields in payment processing')
      return NextResponse.json(
        { error: 'Engagement ID, amount, and payment method are required' },
        { status: 400 }
      )
    }

    // Validate engagement exists
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        talent: true,
        company: true
      }
    })

    if (!engagement) {
      requestLogger.warn('Engagement not found for payment processing', { engagementId })
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    if (engagement.status !== 'active') {
      requestLogger.warn('Engagement not active for payment', { engagementId, status: engagement.status })
      return NextResponse.json(
        { error: 'Engagement must be active for payment' },
        { status: 400 }
      )
    }

    // Calculate platform fee (15%)
    const platformFee = Math.round(amount * 0.15)
    const talentAmount = amount - platformFee

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        engagementId,
        talentId: engagement.talentId,
        companyId: engagement.companyId,
        amount,
        platformFee,
        talentAmount,
        paymentMethod,
        description,
        status: 'pending'
      },
      include: {
        talent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        engagement: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            rate: true
          }
        }
      }
    })

    // TODO: Integrate with actual payment processor (Stripe, etc.)
    // For now, simulate successful payment
    const paymentResult = {
      success: true,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'succeeded'
    }

    if (paymentResult.success) {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          transactionId: paymentResult.transactionId,
          completedAt: new Date()
        }
      })

      // Update engagement with payment info
      await prisma.engagement.update({
        where: { id: engagementId },
        data: {
          totalPaid: {
            increment: amount
          },
          lastPaymentDate: new Date()
        }
      })

      requestLogger.info('Payment processed successfully', {
        paymentId: payment.id,
        engagementId,
        amount,
        platformFee,
        talentAmount,
        transactionId: paymentResult.transactionId
      })

      return NextResponse.json({
        message: 'Payment processed successfully',
        payment: {
          ...payment,
          status: 'completed',
          transactionId: paymentResult.transactionId,
          completedAt: new Date()
        }
      })
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          failedAt: new Date()
        }
      })

      requestLogger.error('Payment processing failed', {
        paymentId: payment.id,
        engagementId,
        amount
      })

      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    requestLogger.error('Failed to process payment', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
