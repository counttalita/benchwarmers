import Stripe from 'stripe'
import { logger } from '@/lib/logger'

// Initialize Stripe with Connect
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export interface StripeConnectAccount {
  id: string
  business_type: 'individual' | 'company'
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  }
  capabilities: {
    card_payments: 'active' | 'inactive' | 'pending'
    transfers: 'active' | 'inactive' | 'pending'
  }
}

export interface StripeConnectOnboarding {
  accountId: string
  onboardingUrl: string
  requirements: string[]
}

export class StripeConnectService {
  /**
   * Create a Stripe Connect account for a company
   */
  async createConnectAccount(companyId: string, companyData: {
    name: string
    email: string
    country: string
    business_type: 'individual' | 'company'
  }): Promise<StripeConnectAccount> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: companyData.country,
        email: companyData.email,
        business_type: companyData.business_type,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: companyData.name,
          url: `https://benchwarmers.com/company/${companyId}`,
        },
        metadata: {
          company_id: companyId,
        },
      })

      logger.info('Stripe Connect account created', {
        accountId: account.id,
        companyId,
        businessType: companyData.business_type,
      })

      return {
        id: account.id,
        business_type: account.business_type!,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
        capabilities: {
          card_payments: account.capabilities?.card_payments?.status || 'inactive',
          transfers: account.capabilities?.transfers?.status || 'inactive',
        },
      }
    } catch (error) {
      logger.error('Failed to create Stripe Connect account', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId,
      })
      throw new Error('Failed to create payment account')
    }
  }

  /**
   * Generate onboarding URL for Stripe Connect account
   */
  async createOnboardingLink(accountId: string, companyId: string): Promise<StripeConnectOnboarding> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/company/onboarding/refresh`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/company/onboarding/complete`,
        type: 'account_onboarding',
        collect: 'eventually_due',
      })

      const account = await stripe.accounts.retrieve(accountId)

      logger.info('Stripe Connect onboarding link created', {
        accountId,
        companyId,
        onboardingUrl: accountLink.url,
      })

      return {
        accountId,
        onboardingUrl: accountLink.url,
        requirements: account.requirements?.eventually_due || [],
      }
    } catch (error) {
      logger.error('Failed to create onboarding link', {
        error: error instanceof Error ? error.message : 'Unknown error',
        accountId,
        companyId,
      })
      throw new Error('Failed to create onboarding link')
    }
  }

  /**
   * Get Connect account status and requirements
   */
  async getAccountStatus(accountId: string): Promise<StripeConnectAccount> {
    try {
      const account = await stripe.accounts.retrieve(accountId)

      return {
        id: account.id,
        business_type: account.business_type!,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
        capabilities: {
          card_payments: account.capabilities?.card_payments?.status || 'inactive',
          transfers: account.capabilities?.transfers?.status || 'inactive',
        },
      }
    } catch (error) {
      logger.error('Failed to retrieve Stripe Connect account', {
        error: error instanceof Error ? error.message : 'Unknown error',
        accountId,
      })
      throw new Error('Failed to retrieve account status')
    }
  }

  /**
   * Create a payment intent for marketplace transactions
   */
  async createPaymentIntent(amount: number, currency: string, metadata: {
    engagementId: string
    seekerCompanyId: string
    providerCompanyId: string
    description: string
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        application_fee_amount: Math.round(amount * 0.15 * 100), // 15% platform fee
        transfer_data: {
          destination: metadata.providerCompanyId, // Provider's Connect account
        },
        metadata: {
          engagement_id: metadata.engagementId,
          seeker_company_id: metadata.seekerCompanyId,
          provider_company_id: metadata.providerCompanyId,
          description: metadata.description,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        engagementId: metadata.engagementId,
      })

      return paymentIntent
    } catch (error) {
      logger.error('Failed to create payment intent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        amount,
        currency,
        metadata,
      })
      throw new Error('Failed to create payment')
    }
  }

  /**
   * Create a transfer to provider's Connect account
   */
  async createTransfer(amount: number, currency: string, destinationAccountId: string, metadata: {
    engagementId: string
    description: string
  }): Promise<Stripe.Transfer> {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        destination: destinationAccountId,
        metadata: {
          engagement_id: metadata.engagementId,
          description: metadata.description,
        },
      })

      logger.info('Transfer created', {
        transferId: transfer.id,
        amount,
        currency,
        destinationAccountId,
        engagementId: metadata.engagementId,
      })

      return transfer
    } catch (error) {
      logger.error('Failed to create transfer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        amount,
        currency,
        destinationAccountId,
        metadata,
      })
      throw new Error('Failed to create transfer')
    }
  }

  /**
   * Get payment intent status
   */
  async getPaymentIntentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      return paymentIntent
    } catch (error) {
      logger.error('Failed to retrieve payment intent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentIntentId,
      })
      throw new Error('Failed to retrieve payment status')
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund> {
    try {
      const refundData: { payment_intent: string; amount?: number; reason?: string } = {
        payment_intent: paymentIntentId,
      }

      if (amount) {
        refundData.amount = Math.round(amount * 100) // Convert to cents
      }

      if (reason) {
        refundData.reason = reason
      }

      const refund = await stripe.refunds.create(refundData)

      logger.info('Payment refunded', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
        reason: refund.reason,
      })

      return refund
    } catch (error) {
      logger.error('Failed to refund payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentIntentId,
        amount,
        reason,
      })
      throw new Error('Failed to refund payment')
    }
  }
}

export const stripeConnectService = new StripeConnectService()
