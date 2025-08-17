import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
})

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

    // Create Stripe payment intent
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/success`
      })
    } catch (stripeError) {
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
        currency: 'usd',
        status: 'completed',
        type: 'milestone',
        stripePaymentIntentId: paymentIntent.id,
        milestoneId,
        processedAt: new Date()
      }
    })

    requestLogger.info('Payment processed successfully', {
      transactionId: transaction.id,
      engagementId,
      amount,
      stripePaymentIntentId: paymentIntent.id
    })

    return NextResponse.json({
      message: 'Payment processed successfully',
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        stripePaymentIntentId: transaction.stripePaymentIntentId
      }
    })

  } catch (error) {
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
