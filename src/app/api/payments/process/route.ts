import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { paystackService } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { engagementId, amount, milestoneId, paymentMethodId } = body

    if (!engagementId || !amount || !milestoneId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Engagement ID, amount, milestone ID, and payment method ID are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate engagement exists and is active
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    if (engagement.status !== 'active') {
      return NextResponse.json(
        { error: 'Engagement must be active for payment' },
        { status: 400 }
      )
    }

    // Calculate facilitation fee (5% of transaction amount)
    const facilitationFee = Math.round(amount * 0.05)
    const netAmount = amount - facilitationFee

    // Create Paystack payment intent
    let paymentIntent
    try {
      paymentIntent = await paystackService.createPaymentIntent(
        amount,
        'ZAR', // Changed to ZAR for South African Rand
        {
          engagementId,
          milestoneId,
          paymentMethodId,
          facilitationFee: facilitationFee.toString(),
          netAmount: netAmount.toString()
        }
      )
    } catch (paystackError) {
      return NextResponse.json(
        { error: 'Payment failed' },
        { status: 400 }
      )
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment failed' },
        { status: 400 }
      )
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        engagementId,
        amount,
        currency: 'ZAR',
        status: 'completed',
        type: 'milestone',
        paystackPaymentId: paymentIntent.id,
        milestoneId,
        facilitationFee,
        netAmount,
        processedAt: new Date()
      }
    })

    logger.info('Payment processed successfully', {
      transactionId: transaction.id,
      engagementId,
      amount,
      facilitationFee,
      netAmount,
      paystackPaymentId: paymentIntent.id
    })

    return NextResponse.json({
      message: 'Payment processed successfully',
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        facilitationFee: transaction.facilitationFee,
        netAmount: transaction.netAmount,
        currency: transaction.currency,
        paystackPaymentId: transaction.paystackPaymentId
      }
    })

  } catch (error) {
    logger.error('Failed to process payment', error as Error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
