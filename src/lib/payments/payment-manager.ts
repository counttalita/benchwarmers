import { logError, logInfo, createError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import logger from '@/lib/logger'
// import { sendEmail } from '@/lib/notifications/email' // TODO: Fix email import
import crypto from 'crypto'
import axios from 'axios'

export interface PaymentReleaseRequest {
  engagementId: string
  amount: number
  currency: string
  reason: 'completion' | 'milestone' | 'partial' | 'dispute_resolution'
  verificationData?: {
    deliverables: string[]
    approvedBy: string
    approvedAt: Date
    notes?: string
  }
  milestoneId?: string
}

export interface PaymentHoldRequest {
  engagementId: string
  amount: number
  currency: string
  reason: 'dispute' | 'quality_issue' | 'breach_of_contract'
  holdUntil?: Date
  notes?: string
}

// Paystack Integration Interfaces
export interface PaystackSubscriptionData {
  customer: string
  plan: string
  start_date?: string
}

export interface PaystackTransactionData {
  amount: number
  email: string
  reference: string
  callback_url?: string
  metadata?: Record<string, string>
}

export interface PaystackTransferData {
  source: 'balance'
  amount: number
  recipient: string
  reason?: string
  currency?: string
}

export interface PaystackRecipientData {
  type: 'nuban'
  name: string
  account_number: string
  bank_code: string
  currency?: string
}

export class PaymentManager {
  private paystackBaseUrl = 'https://api.paystack.co'
  private secretKey: string
  private publicKey: string
  private planCode: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY!
    this.planCode = process.env.PAYSTACK_PLAN_CODE!
  }

  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    }
  }

  // Subscription Management
  async createSubscription(data: PaystackSubscriptionData) {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/subscription`,
        {
          customer: data.customer,
          plan: this.planCode,
          start_date: data.start_date || new Date().toISOString()
        },
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getSubscription(subscriptionId: string) {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/subscription/${subscriptionId}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/subscription/disable`,
        { code: subscriptionId },
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Transaction Management
  async initializeTransaction(data: PaystackTransactionData) {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          amount: data.amount * 100, // Convert to kobo (smallest currency unit)
          email: data.email,
          reference: data.reference,
          callback_url: data.callback_url,
          metadata: data.metadata
        },
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to initialize transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to verify transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Transfer Management (for paying providers)
  async createRecipient(data: PaystackRecipientData) {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transferrecipient`,
        {
          type: data.type,
          name: data.name,
          account_number: data.account_number,
          bank_code: data.bank_code,
          currency: data.currency || 'NGN'
        },
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to create recipient: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createTransfer(data: PaystackTransferData) {
    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transfer`,
        {
          source: data.source,
          amount: data.amount * 100, // Convert to kobo
          recipient: data.recipient,
          reason: data.reason,
          currency: data.currency || 'NGN'
        },
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to create transfer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Facilitation Fee Calculation
  calculateFacilitationFee(transactionAmount: number): number {
    // 5% facilitation fee
    return Math.round(transactionAmount * 0.05)
  }

  calculateNetAmount(grossAmount: number): number {
    const facilitationFee = this.calculateFacilitationFee(grossAmount)
    return grossAmount - facilitationFee
  }

  // Webhook Processing
  async processWebhook(payload: string, signature: string) {
    try {
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
        .update(payload)
        .digest('hex')

      if (hash !== signature) {
        throw new Error('Invalid webhook signature')
      }

      const event = JSON.parse(payload)
      return event
    } catch (error) {
      throw new Error(`Invalid webhook: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Release payment from escrow to provider
   */
  async releasePayment(request: PaymentReleaseRequest, correlationId?: string): Promise<{
    success: boolean
    transactionId?: string
    error?: string
  }> {
    try {
      logInfo('Processing payment release', {
        correlationId,
        engagementId: request.engagementId,
        amount: request.amount,
        reason: request.reason
      })

      // Get engagement and validate
      const engagement = await prisma.engagement.findUnique({
        where: { id: request.engagementId },
        include: {
          contract: {
            include: {
              offer: {
                include: {
                  seekerCompany: true,
                  providerCompany: true
                }
              }
            }
          },
          payments: true
        }
      })

      if (!engagement) {
        return { success: false, error: 'Engagement not found' }
      }

      if (engagement.status !== 'active' && engagement.status !== 'completed') {
        return { success: false, error: 'Payment can only be released for active or completed engagements' }
      }

      // Check if payment amount is valid
      const totalPaid = engagement.payments
        .filter((p: any) => p.status === 'completed' && p.type === 'release')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      const maxPayable = Number(engagement.contract.offer.providerAmount)

      if (totalPaid + request.amount > maxPayable) {
        return {
          success: false,
          error: `Payment amount exceeds remaining balance. Max: ${maxPayable - totalPaid}`
        }
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: `PAY-${Date.now()}`,
          engagementId: request.engagementId,
          amount: request.amount,
          currency: request.currency,
          type: 'release',
          status: 'processing',
          reason: request.reason,
          verificationData: request.verificationData ? JSON.stringify(request.verificationData) : null,
          milestoneId: request.milestoneId,
          processedAt: new Date()
        }
      })

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'completed' }
      })

      // Calculate total paid after this payment
      const newTotalPaid = engagement.payments
        .filter((p: any) => p.status === 'completed' && p.type === 'release')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0) + request.amount

      // Check if engagement should be marked as completed
      if (newTotalPaid >= maxPayable) {
        await prisma.engagement.update({
          where: { id: request.engagementId },
          data: { status: 'completed' }
        })
      }

      logInfo('Payment released successfully', {
        correlationId,
        paymentId: payment.id,
        amount: request.amount,
        engagementId: request.engagementId
      })

      return {
        success: true,
        transactionId: payment.id
      }

    } catch (error) {
      logError('Failed to release payment', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      })

      return {
        success: false,
        error: 'Failed to release payment'
      }
    }
  }

  /**
   * Hold payment in escrow (dispute or quality issues)
   */
  async holdPayment(request: PaymentHoldRequest, correlationId?: string): Promise<{
    success: boolean
    holdId?: string
    error?: string
  }> {
    try {
      logInfo('Processing payment hold', {
        correlationId,
        engagementId: request.engagementId,
        amount: request.amount,
        reason: request.reason
      })

      // Create payment hold record
      const hold = await prisma.paymentHold.create({
        data: {
          id: `HOLD-${Date.now()}`,
          engagementId: request.engagementId,
          amount: request.amount,
          currency: request.currency,
          reason: request.reason,
          holdUntil: request.holdUntil,
          notes: request.notes,
          status: 'active',
          createdAt: new Date()
        }
      })

      // Update engagement status
      await prisma.engagement.update({
        where: { id: request.engagementId },
        data: { 
          status: 'disputed',
          disputedAt: new Date()
        }
      })

      logInfo('Payment hold created successfully', {
        correlationId,
        holdId: hold.id,
        engagementId: request.engagementId
      })

      return {
        success: true,
        holdId: hold.id
      }

    } catch (error) {
      logError(createError.internal('PAYMENT_HOLD_ERROR', 'Failed to hold payment', { 
        error, 
        correlationId,
        engagementId: request.engagementId 
      }))
      
      return {
        success: false,
        error: 'Internal error processing payment hold'
      }
    }
  }

  /**
   * Verify engagement completion and trigger payment release
   */
  async verifyCompletionAndRelease(
    engagementId: string,
    verificationData: {
      deliverables: string[]
      approvedBy: string
      notes?: string
    },
    correlationId?: string
  ): Promise<{ success: boolean; paymentReleased?: boolean; error?: string }> {
    try {
      logInfo('Verifying engagement completion', {
        correlationId,
        engagementId,
        approvedBy: verificationData.approvedBy
      })

      // Get engagement details
      const engagement = await prisma.engagement.findUnique({
        where: { id: engagementId },
        include: {
          contract: {
            include: {
              offer: true
            }
          },
          payments: true
        }
      })

      if (!engagement) {
        return { success: false, error: 'Engagement not found' }
      }

      if (engagement.status !== 'active') {
        return { success: false, error: 'Only active engagements can be completed' }
      }

      // Create completion verification record
      await prisma.engagementVerification.create({
        data: {
          id: `VER-${Date.now()}`,
          engagementId,
          verifiedBy: verificationData.approvedBy,
          verifiedAt: new Date(),
          deliverables: JSON.stringify(verificationData.deliverables),
          notes: verificationData.notes,
          status: 'approved'
        }
      })

      // Calculate remaining payment amount
      const totalPaid = engagement.payments
        .filter((p: any) => p.status === 'completed' && p.type === 'release')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      const remainingAmount = Number(engagement.contract.offer.providerAmount) - totalPaid

      if (remainingAmount > 0) {
        // Release remaining payment
        const releaseResult = await this.releasePayment({
          engagementId,
          amount: remainingAmount,
          currency: engagement.contract.offer.currency,
          reason: 'completion',
          verificationData: {
            deliverables: verificationData.deliverables,
            approvedBy: verificationData.approvedBy,
            approvedAt: new Date(),
            notes: verificationData.notes
          }
        }, correlationId)

        if (releaseResult.success) {
          logInfo('Engagement completed and payment released', {
            correlationId,
            engagementId,
            releasedAmount: remainingAmount
          })

          return {
            success: true,
            paymentReleased: true
          }
        } else {
          return {
            success: false,
            error: `Completion verified but payment release failed: ${releaseResult.error}`
          }
        }
      } else {
        // Mark as completed (already fully paid)
        await prisma.engagement.update({
          where: { id: engagementId },
          data: { 
            status: 'completed',
            completedAt: new Date()
          }
        })

        logInfo('Engagement completed (already fully paid)', {
          correlationId,
          engagementId
        })

        return {
          success: true,
          paymentReleased: false
        }
      }

    } catch (error) {
      logError(createError.internal('COMPLETION_VERIFICATION_ERROR', 'Failed to verify completion', { 
        error, 
        correlationId,
        engagementId 
      }))
      
      return {
        success: false,
        error: 'Internal error verifying completion'
      }
    }
  }

  /**
   * Mock Stripe payment processing (replace with actual Stripe integration)
   */
  private async processStripePayment(params: {
    amount: number
    currency: string
    recipientAccountId: string
    metadata: Record<string, string>
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // TODO: Replace with actual Stripe API calls
    // This is a mock implementation
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock success (90% success rate for testing)
      if (Math.random() > 0.1) {
        return {
          success: true,
          transactionId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      } else {
        return {
          success: false,
          error: 'Insufficient funds in platform account'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Payment processor error'
      }
    }
  }

  /**
   * Get payment history for an engagement
   */
  async getPaymentHistory(engagementId: string): Promise<unknown[]> {
    return await prisma.payment.findMany({
      where: { engagementId },
      orderBy: { createdAt: 'desc' },
      include: {
        milestone: true
      }
    })
  }

  /**
   * Get pending payment releases
   */
  async getPendingReleases(): Promise<unknown[]> {
    return await prisma.payment.findMany({
      where: { 
        status: 'processing',
        type: 'release'
      },
      include: {
        engagement: {
          include: {
            contract: {
              include: {
                offer: true
              }
            }
          }
        }
      }
    })
  }
}

// Export singleton instance
export const paymentManager = new PaymentManager()

