import { paystackService } from '@/lib/paystack'
import logger from '@/lib/logger'

export interface PaystackConnectAccount {
  id: string
  subaccount_code: string
  business_name: string
  settlement_bank: string
  account_number: string
  percentage_charge: number
  is_verified: boolean
}

export interface OnboardingLink {
  onboardingUrl: string
  expires_at: string
}

export class PaystackConnectService {
  /**
   * Create Paystack subaccount for company
   */
  async createConnectAccount(
    companyId: string,
    accountData: {
      name: string
      email: string
      country: string
      business_type: string
    }
  ): Promise<PaystackConnectAccount> {
    try {
      // For Paystack, we need bank details to create subaccount
      // This is a simplified version - in production, collect bank details from user
      const subaccount = await paystackService.createSubaccount(
        accountData.name,
        '044', // Access Bank code (example)
        '0123456789', // Example account number - should be collected from user
        15 // 15% platform fee
      )

      logger.info('Paystack subaccount created', {
        companyId,
        subaccountCode: subaccount.subaccount_code,
        businessName: subaccount.business_name
      })

      return {
        id: subaccount.id,
        subaccount_code: subaccount.subaccount_code,
        business_name: subaccount.business_name,
        settlement_bank: subaccount.settlement_bank,
        account_number: subaccount.account_number,
        percentage_charge: subaccount.percentage_charge,
        is_verified: false // New subaccounts start unverified
      }
    } catch (error) {
      logger.error('Failed to create Paystack subaccount', error as Error)
      throw error
    }
  }

  /**
   * Create onboarding link (for Paystack, this would be bank verification)
   */
  async createOnboardingLink(
    subaccountCode: string,
    companyId: string
  ): Promise<OnboardingLink> {
    try {
      // Paystack doesn't have direct onboarding links like Stripe
      // Instead, return a custom verification URL
      const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/verify-bank?subaccount=${subaccountCode}&company=${companyId}`
      
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

      logger.info('Paystack onboarding link created', {
        subaccountCode,
        companyId,
        onboardingUrl
      })

      return {
        onboardingUrl,
        expires_at: expiresAt.toISOString()
      }
    } catch (error) {
      logger.error('Failed to create onboarding link', error as Error)
      throw error
    }
  }

  /**
   * Get account status
   */
  async getAccountStatus(subaccountCode: string): Promise<PaystackConnectAccount> {
    try {
      // In a real implementation, you'd fetch subaccount details from Paystack
      // For now, return mock data
      return {
        id: subaccountCode,
        subaccount_code: subaccountCode,
        business_name: 'Test Business',
        settlement_bank: '044',
        account_number: '0123456789',
        percentage_charge: 15,
        is_verified: true
      }
    } catch (error) {
      logger.error('Failed to get Paystack account status', error as Error)
      throw error
    }
  }

  /**
   * Create payment intent with subaccount
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: {
      engagementId: string
      seekerCompanyId: string
      providerCompanyId: string
      description: string
    }
  ): Promise<{ id: string; status: string; amount: number; currency: string }> {
    try {
      const paymentIntent = await paystackService.createPaymentIntent(
        amount,
        currency,
        metadata
      )

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    } catch (error) {
      logger.error('Failed to create Paystack payment intent', error as Error)
      throw error
    }
  }

  /**
   * Create transfer to subaccount
   */
  async createTransfer(
    amount: number,
    currency: string,
    recipientCode: string,
    metadata: {
      engagementId: string
      description: string
    }
  ): Promise<{ id: string; amount: number; currency: string }> {
    try {
      const transfer = await paystackService.createTransfer(
        amount,
        recipientCode,
        metadata.description
      )

      return {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency
      }
    } catch (error) {
      logger.error('Failed to create Paystack transfer', error as Error)
      throw error
    }
  }

  /**
   * Get payment intent status
   */
  async getPaymentIntentStatus(paymentId: string): Promise<{
    status: string
    amount: number
    currency: string
    last_payment_error?: { message: string }
  }> {
    try {
      const payment = await paystackService.verifyPayment(paymentId)
      
      return {
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        last_payment_error: payment.status === 'failed' ? { message: 'Payment failed' } : undefined
      }
    } catch (error) {
      logger.error('Failed to get Paystack payment status', error as Error)
      throw error
    }
  }
}

export const paystackConnectService = new PaystackConnectService()
