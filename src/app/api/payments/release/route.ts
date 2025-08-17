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
    const { transactionId, providerAccountId } = body

    if (!transactionId || !providerAccountId) {
      return NextResponse.json(
        { error: 'Transaction ID and provider account ID are required' },
        { status: 400 }
      )
    }

    // Get transaction and validate it's in escrowed status
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (transaction.status !== 'escrowed') {
      return NextResponse.json(
        { error: 'Transaction is not in escrowed status' },
        { status: 400 }
      )
    }

    // Calculate platform fee (15%)
    const platformFee = Math.round(transaction.amount * 0.15)
    const providerAmount = transaction.amount - platformFee

    // Create Stripe transfer to provider
    let transfer
    try {
      transfer = await stripe.transfers.create({
        amount: Math.round(providerAmount * 100), // Convert to cents
        currency: 'usd',
        destination: providerAccountId,
        description: `Payment for engagement ${transaction.engagementId}`,
        metadata: {
          transactionId: transaction.id,
          engagementId: transaction.engagementId,
          platformFee: platformFee.toString()
        }
      })
    } catch (stripeError) {
      return NextResponse.json(
        { error: 'Failed to create transfer' },
        { status: 500 }
      )
    }

    // Update transaction status
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'released',
        releasedAt: new Date(),
        stripeTransferId: transfer.id,
        platformFee,
        providerAmount
      }
    })

    requestLogger.info('Payment released successfully', {
      transactionId: transaction.id,
      engagementId: transaction.engagementId,
      amount: transaction.amount,
      platformFee,
      providerAmount,
      stripeTransferId: transfer.id
    })

    return NextResponse.json({
      message: 'Payment released successfully',
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        amount: updatedTransaction.amount,
        platformFee: updatedTransaction.platformFee,
        providerAmount: updatedTransaction.providerAmount,
        stripeTransferId: updatedTransaction.stripeTransferId
      }
    })

  } catch (error) {
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Failed to release payment' },
      { status: 500 }
    )
  }
}
