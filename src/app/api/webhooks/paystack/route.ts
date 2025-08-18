import { NextRequest, NextResponse } from 'next/server'
import { paymentManager } from '@/lib/payments/payment-manager'
import { subscriptionService } from '@/lib/payments/subscription-service'
import { logInfo, logError } from '@/lib/logger'

// POST /api/webhooks/paystack - Handle Paystack webhooks
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const event = await paymentManager.processWebhook(payload, signature)

    logInfo('Paystack webhook received', {
      event: event.event,
      reference: event.data?.reference
    })

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data)
        break

      case 'subscription.create':
        await handleSubscriptionCreate(event.data)
        break

      case 'subscription.disable':
        await handleSubscriptionDisable(event.data)
        break

      case 'transfer.success':
        await handleTransferSuccess(event.data)
        break

      case 'transfer.failed':
        await handleTransferFailed(event.data)
        break

      default:
        logInfo('Unhandled Paystack event', { event: event.event })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logError('Webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}

async function handleChargeSuccess(data: any) {
  try {
    // Update payment status in database
    if (data.reference) {
      // Find payment by reference and update status
      await logInfo('Payment successful', {
        reference: data.reference,
        amount: data.amount,
        status: data.status
      })
    }
  } catch (error) {
    logError('Failed to handle charge success', { error })
  }
}

async function handleSubscriptionCreate(data: any) {
  try {
    logInfo('Subscription created', {
      subscriptionCode: data.subscription_code,
      customerCode: data.customer_code
    })
  } catch (error) {
    logError('Failed to handle subscription create', { error })
  }
}

async function handleSubscriptionDisable(data: any) {
  try {
    logInfo('Subscription disabled', {
      subscriptionCode: data.subscription_code
    })
  } catch (error) {
    logError('Failed to handle subscription disable', { error })
  }
}

async function handleTransferSuccess(data: any) {
  try {
    logInfo('Transfer successful', {
      transferCode: data.transfer_code,
      amount: data.amount,
      recipient: data.recipient
    })
  } catch (error) {
    logError('Failed to handle transfer success', { error })
  }
}

async function handleTransferFailed(data: any) {
  try {
    logError('Transfer failed', {
      transferCode: data.transfer_code,
      failureReason: data.failure_reason
    })
  } catch (error) {
    logError('Failed to handle transfer failure', { error })
  }
}
