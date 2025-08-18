import { prisma } from '@/lib/prisma'
import { PaymentManager } from './payment-manager'
import { logInfo, logError } from '@/lib/logger'

export interface SubscriptionData {
  userId: string
  companyId?: string
  email: string
  planType: 'monthly' | 'yearly'
  startDate?: Date
}

export interface SubscriptionStatus {
  isActive: boolean
  currentPlan?: string
  nextBillingDate?: Date
  amount?: number
  currency?: string
}

export class SubscriptionService {
  private paymentManager: PaymentManager

  constructor() {
    this.paymentManager = new PaymentManager()
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(data: SubscriptionData) {
    try {
      logInfo('Creating subscription', {
        userId: data.userId,
        email: data.email,
        planType: data.planType
      })

      // Create or get Paystack customer
      const customer = await this.createOrGetCustomer(data.email, data.userId)

      // Create Paystack subscription
      const paystackSubscription = await this.paymentManager.createSubscription({
        customer: customer.customer_code,
        plan: process.env.PAYSTACK_PLAN_CODE!,
        start_date: data.startDate?.toISOString()
      })

      // Store subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          userId: data.userId,
          companyId: data.companyId,
          paystackSubscriptionId: paystackSubscription.data.subscription_code,
          paystackCustomerId: customer.customer_code,
          planType: data.planType,
          amount: 850, // 850 ZAR
          currency: 'ZAR',
          status: 'active',
          startDate: data.startDate || new Date(),
          nextBillingDate: this.calculateNextBillingDate(data.planType, data.startDate),
          metadata: {
            paystackPlanCode: process.env.PAYSTACK_PLAN_CODE
          }
        }
      })

      logInfo('Subscription created successfully', {
        subscriptionId: subscription.id,
        paystackSubscriptionId: paystackSubscription.data.subscription_code
      })

      return subscription

    } catch (error) {
      logError('Failed to create subscription', {
        userId: data.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' }
      })

      if (!subscription) {
        return { isActive: false }
      }

      // Get latest status from Paystack
      const paystackSubscription = await this.paymentManager.getSubscription(
        subscription.paystackSubscriptionId
      )

      const isActive = paystackSubscription.data.status === 'active'

      return {
        isActive,
        currentPlan: subscription.planType,
        nextBillingDate: subscription.nextBillingDate,
        amount: subscription.amount,
        currency: subscription.currency
      }

    } catch (error) {
      logError('Failed to get subscription status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId, status: 'active' }
      })

      if (!subscription) {
        throw new Error('No active subscription found')
      }

      // Cancel in Paystack
      await this.paymentManager.cancelSubscription(subscription.paystackSubscriptionId)

      // Update in database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      })

      logInfo('Subscription cancelled successfully', {
        userId,
        subscriptionId: subscription.id
      })

      return { success: true }

    } catch (error) {
      logError('Failed to cancel subscription', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process subscription renewal
   */
  async processRenewal(subscriptionId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
      })

      if (!subscription) {
        throw new Error('Subscription not found')
      }

      // Update next billing date
      const nextBillingDate = this.calculateNextBillingDate(
        subscription.planType,
        subscription.nextBillingDate
      )

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          nextBillingDate,
          lastBillingDate: new Date()
        }
      })

      logInfo('Subscription renewed successfully', {
        subscriptionId,
        nextBillingDate
      })

    } catch (error) {
      logError('Failed to process subscription renewal', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(userId)
      return status.isActive
    } catch (error) {
      logError('Failed to check subscription status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get subscription amount
   */
  getSubscriptionAmount(): number {
    return 850 // 850 ZAR
  }

  /**
   * Get subscription currency
   */
  getSubscriptionCurrency(): string {
    return 'ZAR'
  }

  private async createOrGetCustomer(email: string, userId: string) {
    // This would typically create a customer in Paystack
    // For now, we'll return a mock customer code
    return {
      customer_code: `CUS_${userId}_${Date.now()}`
    }
  }

  private calculateNextBillingDate(planType: string, currentDate?: Date): Date {
    const date = currentDate || new Date()
    
    if (planType === 'monthly') {
      return new Date(date.setMonth(date.getMonth() + 1))
    } else if (planType === 'yearly') {
      return new Date(date.setFullYear(date.getFullYear() + 1))
    }
    
    return new Date(date.setMonth(date.getMonth() + 1)) // Default to monthly
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService()
