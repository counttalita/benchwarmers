import Stripe from 'stripe'
import { logger } from './logger'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export interface PaymentIntentOptions {
  amount: number
  currency: string
  customerId?: string
  metadata?: Record<string, string>
  captureMethod?: 'automatic' | 'manual'
  confirm?: boolean
}

export interface TransferOptions {
  amount: number
  currency: string
  destination: string
  metadata?: Record<string, string>
}

export interface ConnectAccountOptions {
  type: 'express' | 'standard' | 'custom'
  country: string
  email: string
  businessType?: 'individual' | 'company'
  capabilities?: {
    card_payments?: { requested: boolean }
    transfers?: { requested: boolean }
  }
}

/**
 * Creates a payment intent
 */
export async function createPaymentIntent(options: PaymentIntentOptions): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: options.amount,
      currency: options.currency,
      customer: options.customerId,
      metadata: options.metadata,
      capture_method: options.captureMethod || 'automatic',
      confirm: options.confirm || false
    })

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    })

    return paymentIntent
  } catch (error) {
    logger.error(error as Error, 'Failed to create payment intent')
    throw error
  }
}

/**
 * Confirms a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    })

    logger.info('Payment intent confirmed', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    })

    return paymentIntent
  } catch (error) {
    logger.error(error as Error, 'Failed to confirm payment intent')
    throw error
  }
}

/**
 * Captures a payment intent
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount
    })

    logger.info('Payment intent captured', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    })

    return paymentIntent
  } catch (error) {
    logger.error(error as Error, 'Failed to capture payment intent')
    throw error
  }
}

/**
 * Creates a transfer to a connected account
 */
export async function createTransfer(options: TransferOptions): Promise<Stripe.Transfer> {
  try {
    const transfer = await stripe.transfers.create({
      amount: options.amount,
      currency: options.currency,
      destination: options.destination,
      metadata: options.metadata
    })

    logger.info('Transfer created', {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination
    })

    return transfer
  } catch (error) {
    logger.error(error as Error, 'Failed to create transfer')
    throw error
  }
}

/**
 * Creates a connected account for providers
 */
export async function createConnectAccount(options: ConnectAccountOptions): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.create({
      type: options.type,
      country: options.country,
      email: options.email,
      business_type: options.businessType,
      capabilities: options.capabilities || {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    })

    logger.info('Connected account created', {
      accountId: account.id,
      type: account.type,
      country: account.country
    })

    return account
  } catch (error) {
    logger.error(error as Error, 'Failed to create connected account')
    throw error
  }
}

/**
 * Creates an account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    })

    logger.info('Account link created', {
      accountId,
      url: accountLink.url
    })

    return accountLink
  } catch (error) {
    logger.error(error as Error, 'Failed to create account link')
    throw error
  }
}

/**
 * Retrieves account capabilities
 */
export async function getAccountCapabilities(accountId: string): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.retrieve(accountId)

    logger.info('Account capabilities retrieved', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    })

    return account
  } catch (error) {
    logger.error(error as Error, 'Failed to retrieve account capabilities')
    throw error
  }
}

/**
 * Creates a refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason
    })

    logger.info('Refund created', {
      refundId: refund.id,
      paymentIntentId: refund.payment_intent,
      amount: refund.amount,
      reason: refund.reason
    })

    return refund
  } catch (error) {
    logger.error(error as Error, 'Failed to create refund')
    throw error
  }
}

/**
 * Verifies webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    logger.info('Webhook signature verified', { eventType: event.type })
    return event
  } catch (error) {
    logger.error(error as Error, 'Webhook signature verification failed')
    throw error
  }
}

/**
 * Calculates Stripe fees
 */
export function calculateStripeFees(amount: number, currency: string = 'usd'): {
  fee: number
  netAmount: number
} {
  // Standard Stripe fee: 2.9% + 30 cents for US
  const percentageFee = 0.029
  const fixedFee = currency.toLowerCase() === 'usd' ? 30 : 0

  const fee = Math.round(amount * percentageFee + fixedFee)
  const netAmount = amount - fee

  return { fee, netAmount }
}

export { stripe }
