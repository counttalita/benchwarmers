import axios from 'axios'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import crypto from 'crypto'

export interface PaystackConfig {
  secretKey: string
  publicKey: string
  webhookSecret: string
  planCode: string
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
  reference: string
  metadata: Record<string, any>
}

export interface Subscription {
  id: string
  customerId: string
  planCode: string
  status: string
  startDate: Date
  endDate: Date
  amount: number
  currency: string
}

export interface Transfer {
  id: string
  amount: number
  currency: string
  recipient: string
  status: string
  reference: string
}

export class PaymentManager {
  private config: PaystackConfig
  private baseUrl = 'https://api.paystack.co'

  constructor() {
    this.config = {
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
      planCode: process.env.PAYSTACK_PLAN_CODE || ''
    }
  }

  /**
   * Create a subscription for a user
   */
  async createSubscription(userId: string, planCode?: string): Promise<Subscription> {
    try {
      // Get or create customer
      const customer = await this.createOrGetCustomer(userId)
      
      // Create subscription
      const response = await axios.post(
        `${this.baseUrl}/subscription`,
        {
          customer: customer.customer_code,
          plan: planCode || this.config.planCode,
          start_date: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const subscription = response.data.data

      // Store subscription in database
      await prisma.subscription.create({
        data: {
          userId,
          paystackSubscriptionId: subscription.subscription_code,
          paystackCustomerId: customer.customer_code,
          paystackPlanCode: planCode || this.config.planCode,
          status: subscription.status,
          startDate: new Date(subscription.start),
          endDate: new Date(subscription.next_payment_date),
          amount: subscription.amount / 100, // Convert from kobo to naira
          currency: subscription.currency
        }
      })

      logger.info('Subscription created successfully', {
        userId,
        subscriptionId: subscription.subscription_code,
        amount: subscription.amount
      })

      return {
        id: subscription.subscription_code,
        customerId: customer.customer_code,
        planCode: planCode || this.config.planCode,
        status: subscription.status,
        startDate: new Date(subscription.start),
        endDate: new Date(subscription.next_payment_date),
        amount: subscription.amount / 100,
        currency: subscription.currency
      }

    } catch (error) {
      logger.error('Failed to create subscription', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get subscription status
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/subscription/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`
          }
        }
      )

      const subscription = response.data.data

      return {
        id: subscription.subscription_code,
        customerId: subscription.customer,
        planCode: subscription.plan.plan_code,
        status: subscription.status,
        startDate: new Date(subscription.start),
        endDate: new Date(subscription.next_payment_date),
        amount: subscription.amount / 100,
        currency: subscription.currency
      }

    } catch (error) {
      logger.error('Failed to get subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/subscription/disable`,
        {
          code: subscriptionId,
          token: this.generateToken()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      // Update subscription status in database
      await prisma.subscription.update({
        where: { paystackSubscriptionId: subscriptionId },
        data: { status: 'cancelled' }
      })

      logger.info('Subscription cancelled successfully', { subscriptionId })

    } catch (error) {
      logger.error('Failed to cancel subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Initialize a transaction for payment
   */
  async initializeTransaction(data: {
    amount: number
    email: string
    reference: string
    metadata?: Record<string, any>
    callbackUrl?: string
  }): Promise<PaymentIntent> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: data.amount * 100, // Convert to kobo
          email: data.email,
          reference: data.reference,
          metadata: data.metadata,
          callback_url: data.callbackUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const transaction = response.data.data

      // Store transaction in database
      await prisma.payment.create({
        data: {
          paystackPaymentId: transaction.reference,
          amount: data.amount,
          currency: 'ZAR',
          status: 'pending',
          type: 'transaction',
          metadata: {
            authorizationUrl: transaction.authorization_url,
            accessCode: transaction.access_code,
            ...data.metadata
          }
        }
      })

      logger.info('Transaction initialized successfully', {
        reference: transaction.reference,
        amount: data.amount
      })

      return {
        id: transaction.reference,
        amount: data.amount,
        currency: 'ZAR',
        status: 'pending',
        reference: transaction.reference,
        metadata: {
          authorizationUrl: transaction.authorization_url,
          accessCode: transaction.access_code,
          ...data.metadata
        }
      }

    } catch (error) {
      logger.error('Failed to initialize transaction', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<PaymentIntent> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`
          }
        }
      )

      const transaction = response.data.data

      // Update payment status in database
      await prisma.payment.update({
        where: { paystackPaymentId: reference },
        data: {
          status: transaction.status === 'success' ? 'completed' : 'failed',
          verificationData: transaction,
          processedAt: new Date()
        }
      })

      logger.info('Transaction verified successfully', {
        reference,
        status: transaction.status,
        amount: transaction.amount / 100
      })

      return {
        id: transaction.reference,
        amount: transaction.amount / 100,
        currency: transaction.currency,
        status: transaction.status,
        reference: transaction.reference,
        metadata: transaction
      }

    } catch (error) {
      logger.error('Failed to verify transaction', {
        reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Create a transfer recipient
   */
  async createRecipient(data: {
    type: 'nuban' | 'mobile_money' | 'basa'
    name: string
    accountNumber: string
    bankCode: string
    currency?: string
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: data.type,
          name: data.name,
          account_number: data.accountNumber,
          bank_code: data.bankCode,
          currency: data.currency || 'ZAR'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      logger.info('Transfer recipient created successfully', {
        recipientId: response.data.data.recipient_code,
        name: data.name
      })

      return response.data.data

    } catch (error) {
      logger.error('Failed to create transfer recipient', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Create a transfer
   */
  async createTransfer(data: {
    amount: number
    recipient: string
    reason?: string
    currency?: string
  }): Promise<Transfer> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: data.amount * 100, // Convert to kobo
          recipient: data.recipient,
          reason: data.reason,
          currency: data.currency || 'ZAR'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const transfer = response.data.data

      logger.info('Transfer created successfully', {
        transferId: transfer.reference,
        amount: data.amount,
        recipient: data.recipient
      })

      return {
        id: transfer.reference,
        amount: data.amount,
        currency: data.currency || 'ZAR',
        recipient: data.recipient,
        status: transfer.status,
        reference: transfer.reference
      }

    } catch (error) {
      logger.error('Failed to create transfer', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process webhook events
   */
  async processWebhook(payload: string, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', this.config.webhookSecret)
        .update(payload)
        .digest('hex')

      if (hash !== signature) {
        throw new Error('Invalid webhook signature')
      }

      const event = JSON.parse(payload)

      logger.info('Processing webhook event', {
        event: event.event,
        reference: event.data?.reference
      })

      switch (event.event) {
        case 'charge.success':
          await this.handleChargeSuccess(event.data)
          break
        case 'subscription.create':
          await this.handleSubscriptionCreate(event.data)
          break
        case 'subscription.disable':
          await this.handleSubscriptionDisable(event.data)
          break
        case 'transfer.success':
          await this.handleTransferSuccess(event.data)
          break
        case 'transfer.failed':
          await this.handleTransferFailed(event.data)
          break
        default:
          logger.info('Unhandled webhook event', { event: event.event })
      }

    } catch (error) {
      logger.error('Failed to process webhook', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Calculate facilitation fee (5%)
   */
  calculateFacilitationFee(amount: number): number {
    return amount * 0.05
  }

  /**
   * Calculate net amount after facilitation fee
   */
  calculateNetAmount(amount: number): number {
    return amount - this.calculateFacilitationFee(amount)
  }

  /**
   * Get available banks for transfers
   */
  async getBanks(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`
          }
        }
      )

      return response.data.data

    } catch (error) {
      logger.error('Failed to get banks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  // Private helper methods
  private async createOrGetCustomer(userId: string): Promise<any> {
    try {
      // Check if customer already exists
      const existingCustomer = await prisma.user.findUnique({
        where: { id: userId },
        select: { paystackCustomerId: true }
      })

      if (existingCustomer?.paystackCustomerId) {
        // Get customer details from Paystack
        const response = await axios.get(
          `${this.baseUrl}/customer/${existingCustomer.paystackCustomerId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.secretKey}`
            }
          }
        )
        return response.data.data
      }

      // Create new customer
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const response = await axios.post(
        `${this.baseUrl}/customer`,
        {
          email: user.email,
          first_name: user.name?.split(' ')[0] || 'User',
          last_name: user.name?.split(' ').slice(1).join(' ') || 'Name'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const customer = response.data.data

      // Update user with customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { paystackCustomerId: customer.customer_code }
      })

      return customer

    } catch (error) {
      logger.error('Failed to create or get customer', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private async handleChargeSuccess(data: any): Promise<void> {
    // Update payment status
    await prisma.payment.update({
      where: { paystackPaymentId: data.reference },
      data: {
        status: 'completed',
        verificationData: data,
        processedAt: new Date()
      }
    })

    logger.info('Payment completed successfully', {
      reference: data.reference,
      amount: data.amount / 100
    })
  }

  private async handleSubscriptionCreate(data: any): Promise<void> {
    // Update subscription status
    await prisma.subscription.update({
      where: { paystackSubscriptionId: data.subscription_code },
      data: {
        status: data.status,
        startDate: new Date(data.start),
        endDate: new Date(data.next_payment_date)
      }
    })

    logger.info('Subscription created via webhook', {
      subscriptionId: data.subscription_code,
      status: data.status
    })
  }

  private async handleSubscriptionDisable(data: any): Promise<void> {
    // Update subscription status
    await prisma.subscription.update({
      where: { paystackSubscriptionId: data.subscription_code },
      data: { status: 'cancelled' }
    })

    logger.info('Subscription disabled via webhook', {
      subscriptionId: data.subscription_code
    })
  }

  private async handleTransferSuccess(data: any): Promise<void> {
    logger.info('Transfer completed successfully', {
      reference: data.reference,
      amount: data.amount / 100
    })
  }

  private async handleTransferFailed(data: any): Promise<void> {
    logger.error('Transfer failed', {
      reference: data.reference,
      reason: data.failure_reason
    })
  }
}

export const paymentManager = new PaymentManager()

