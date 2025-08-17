import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { escrowPaymentService } from '@/lib/payments/escrow'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      logger.error('Missing Stripe signature in webhook')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.error('Invalid Stripe webhook signature', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    logger.info('Stripe webhook received', {
      type: event.type,
      id: event.id,
    })

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'transfer.failed':
        await handleTransferFailed(event.data.object as Stripe.Transfer)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      default:
        logger.info('Unhandled Stripe webhook event', { type: event.type })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error('Webhook handler error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const engagementId = paymentIntent.metadata.engagement_id
    const seekerCompanyId = paymentIntent.metadata.seeker_company_id
    const providerCompanyId = paymentIntent.metadata.provider_company_id

    if (!engagementId) {
      logger.error('Payment intent missing engagement_id metadata', {
        paymentIntentId: paymentIntent.id,
      })
      return
    }

    // Find escrow payment by payment intent ID
    const escrowPayment = await prisma.escrowPayment.findFirst({
      where: { paymentIntentId: paymentIntent.id },
      include: { engagement: true },
    })

    if (!escrowPayment) {
      logger.error('Escrow payment not found for payment intent', {
        paymentIntentId: paymentIntent.id,
        engagementId,
      })
      return
    }

    // Update escrow payment status to held
    await prisma.escrowPayment.update({
      where: { id: escrowPayment.id },
      data: {
        status: 'held',
        updatedAt: new Date(),
      },
    })

    // Update engagement status
    await prisma.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'active',
        paymentStatus: 'paid',
        updatedAt: new Date(),
      },
    })

    logger.info('Payment intent succeeded - payment held in escrow', {
      paymentIntentId: paymentIntent.id,
      escrowPaymentId: escrowPayment.id,
      engagementId,
      amount: paymentIntent.amount / 100,
    })

  } catch (error) {
    logger.error('Failed to handle payment intent succeeded', {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentIntentId: paymentIntent.id,
    })
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const engagementId = paymentIntent.metadata.engagement_id

    if (!engagementId) {
      logger.error('Payment intent missing engagement_id metadata', {
        paymentIntentId: paymentIntent.id,
      })
      return
    }

    // Find escrow payment by payment intent ID
    const escrowPayment = await prisma.escrowPayment.findFirst({
      where: { paymentIntentId: paymentIntent.id },
    })

    if (escrowPayment) {
      // Update escrow payment status
      await prisma.escrowPayment.update({
        where: { id: escrowPayment.id },
        data: {
          status: 'pending',
          updatedAt: new Date(),
        },
      })
    }

    // Update engagement status
    await prisma.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'pending',
        paymentStatus: 'failed',
        updatedAt: new Date(),
      },
    })

    logger.info('Payment intent failed', {
      paymentIntentId: paymentIntent.id,
      engagementId,
      error: paymentIntent.last_payment_error?.message,
    })

  } catch (error) {
    logger.error('Failed to handle payment intent failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentIntentId: paymentIntent.id,
    })
  }
}

/**
 * Handle Connect account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    const companyId = account.metadata.company_id

    if (!companyId) {
      logger.error('Connect account missing company_id metadata', {
        accountId: account.id,
      })
      return
    }

    // Update company's Connect account status
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeConnectAccountId: account.id,
        stripeConnectStatus: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
        updatedAt: new Date(),
      },
    })

    logger.info('Connect account updated', {
      accountId: account.id,
      companyId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    })

  } catch (error) {
    logger.error('Failed to handle account updated', {
      error: error instanceof Error ? error.message : 'Unknown error',
      accountId: account.id,
    })
  }
}

/**
 * Handle successful transfer
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    const engagementId = transfer.metadata.engagement_id

    if (!engagementId) {
      logger.error('Transfer missing engagement_id metadata', {
        transferId: transfer.id,
      })
      return
    }

    // Find escrow payment by transfer ID
    const escrowPayment = await prisma.escrowPayment.findFirst({
      where: { transferId: transfer.id },
    })

    if (escrowPayment) {
      // Update escrow payment status
      await prisma.escrowPayment.update({
        where: { id: escrowPayment.id },
        data: {
          status: 'released',
          updatedAt: new Date(),
        },
      })
    }

    logger.info('Transfer created successfully', {
      transferId: transfer.id,
      engagementId,
      amount: transfer.amount / 100,
      destination: transfer.destination,
    })

  } catch (error) {
    logger.error('Failed to handle transfer created', {
      error: error instanceof Error ? error.message : 'Unknown error',
      transferId: transfer.id,
    })
  }
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(transfer: Stripe.Transfer) {
  try {
    const engagementId = transfer.metadata.engagement_id

    if (!engagementId) {
      logger.error('Transfer missing engagement_id metadata', {
        transferId: transfer.id,
      })
      return
    }

    // Find escrow payment by transfer ID
    const escrowPayment = await prisma.escrowPayment.findFirst({
      where: { transferId: transfer.id },
    })

    if (escrowPayment) {
      // Update escrow payment status back to held
      await prisma.escrowPayment.update({
        where: { id: escrowPayment.id },
        data: {
          status: 'held',
          updatedAt: new Date(),
        },
      })
    }

    logger.error('Transfer failed', {
      transferId: transfer.id,
      engagementId,
      failureCode: transfer.failure_code,
      failureMessage: transfer.failure_message,
    })

  } catch (error) {
    logger.error('Failed to handle transfer failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      transferId: transfer.id,
    })
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const paymentIntentId = charge.payment_intent as string

    if (!paymentIntentId) {
      logger.error('Charge missing payment_intent', {
        chargeId: charge.id,
      })
      return
    }

    // Find escrow payment by payment intent ID
    const escrowPayment = await prisma.escrowPayment.findFirst({
      where: { paymentIntentId },
    })

    if (escrowPayment) {
      // Update escrow payment status
      await prisma.escrowPayment.update({
        where: { id: escrowPayment.id },
        data: {
          status: 'refunded',
          updatedAt: new Date(),
        },
      })

      // Update engagement status
      await prisma.engagement.update({
        where: { id: escrowPayment.engagementId },
        data: {
          status: 'cancelled',
          paymentStatus: 'refunded',
          updatedAt: new Date(),
        },
      })
    }

    logger.info('Charge refunded', {
      chargeId: charge.id,
      paymentIntentId,
      escrowPaymentId: escrowPayment?.id,
      amount: charge.amount_refunded / 100,
    })

  } catch (error) {
    logger.error('Failed to handle charge refunded', {
      error: error instanceof Error ? error.message : 'Unknown error',
      chargeId: charge.id,
    })
  }
}
