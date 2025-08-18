import logger from './logger'

// Initialize Paystack client
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || ''

export interface PaystackPaymentIntent {
  id: string
  status: string
  amount: number
  currency: string
  reference: string
  authorization_url?: string
}

export interface PaystackTransfer {
  id: string
  amount: number
  currency: string
  recipient: string
  status: string
  reference: string
}

export interface PaystackCustomer {
  id: string
  email: string
  customer_code: string
}

export interface PaystackSubaccount {
  id: string
  subaccount_code: string
  business_name: string
  settlement_bank: string
  account_number: string
  percentage_charge: number
}

export class PaystackService {
  private baseUrl = 'https://api.paystack.co'
  private headers = {
    'Authorization': `Bearer ${paystackSecretKey}`,
    'Content-Type': 'application/json'
  }

  /**
   * Create payment intent (initialize transaction)
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'NGN',
    metadata: Record<string, any> = {}
  ): Promise<PaystackPaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to kobo
          currency,
          reference: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metadata
        })
      })

      const data = await response.json()
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to create payment intent')
      }

      return {
        id: data.data.reference,
        status: 'pending',
        amount: amount,
        currency,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url
      }
    } catch (error) {
      logger.error('Failed to create Paystack payment intent', error as Error)
      throw error
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string): Promise<PaystackPaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: this.headers
      })

      const data = await response.json()
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to verify payment')
      }

      return {
        id: data.data.reference,
        status: data.data.status === 'success' ? 'succeeded' : data.data.status,
        amount: data.data.amount / 100, // Convert from kobo
        currency: data.data.currency,
        reference: data.data.reference
      }
    } catch (error) {
      logger.error('Failed to verify Paystack payment', error as Error)
      throw error
    }
  }

  /**
   * Create subaccount (equivalent to Stripe Connect)
   */
  async createSubaccount(
    businessName: string,
    settlementBank: string,
    accountNumber: string,
    percentageCharge: number = 15
  ): Promise<PaystackSubaccount> {
    try {
      const response = await fetch(`${this.baseUrl}/subaccount`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          business_name: businessName,
          settlement_bank: settlementBank,
          account_number: accountNumber,
          percentage_charge: percentageCharge
        })
      })

      const data = await response.json()
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to create subaccount')
      }

      return {
        id: data.data.id,
        subaccount_code: data.data.subaccount_code,
        business_name: data.data.business_name,
        settlement_bank: data.data.settlement_bank,
        account_number: data.data.account_number,
        percentage_charge: data.data.percentage_charge
      }
    } catch (error) {
      logger.error('Failed to create Paystack subaccount', error as Error)
      throw error
    }
  }

  /**
   * Create transfer recipient
   */
  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string
  ): Promise<{ recipient_code: string; id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN'
        })
      })

      const data = await response.json()
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to create transfer recipient')
      }

      return {
        recipient_code: data.data.recipient_code,
        id: data.data.id
      }
    } catch (error) {
      logger.error('Failed to create Paystack transfer recipient', error as Error)
      throw error
    }
  }

  /**
   * Initiate transfer
   */
  async createTransfer(
    amount: number,
    recipientCode: string,
    reason: string = 'Payment release'
  ): Promise<PaystackTransfer> {
    try {
      const response = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(amount * 100), // Convert to kobo
          recipient: recipientCode,
          reason,
          reference: `tfr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      })

      const data = await response.json()
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to create transfer')
      }

      return {
        id: data.data.id,
        amount: data.data.amount / 100, // Convert from kobo
        currency: data.data.currency,
        recipient: data.data.recipient,
        status: data.data.status,
        reference: data.data.reference
      }
    } catch (error) {
      logger.error('Failed to create Paystack transfer', error as Error)
      throw error
    }
  }

  /**
   * Get banks list
   */
  async getBanks(): Promise<Array<{ name: string; code: string; slug: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/bank`, {
        method: 'GET',
        headers: this.headers
      })

      const data = await response.json()
      
      if (!data.status) {
        throw new Error(data.message || 'Failed to get banks')
      }

      return data.data
    } catch (error) {
      logger.error('Failed to get Paystack banks', error as Error)
      throw error
    }
  }
}

export const paystackService = new PaystackService()
