import { logError, logInfo, createError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

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

export class PaymentManager {
  
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
        .filter(p => p.status === 'completed' && p.type === 'release')
        .reduce((sum, p) => sum + Number(p.amount), 0)

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

      // TODO: Integrate with actual payment processor (Stripe, etc.)
      const paymentResult = await this.processStripePayment({
        amount: request.amount,
        currency: request.currency,
        recipientAccountId: engagement.contract.offer.providerCompany.stripeAccountId,
        metadata: {
          engagementId: request.engagementId,
          paymentId: payment.id,
          reason: request.reason
        }
      })

      if (paymentResult.success) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            transactionId: paymentResult.transactionId,
            completedAt: new Date()
          }
        })

        // Update engagement status if fully paid
        const newTotalPaid = totalPaid + request.amount
        if (newTotalPaid >= maxPayable && request.reason === 'completion') {
          await prisma.engagement.update({
            where: { id: request.engagementId },
            data: { 
              status: 'completed',
              completedAt: new Date()
            }
          })
        }

        logInfo('Payment released successfully', {
          correlationId,
          paymentId: payment.id,
          transactionId: paymentResult.transactionId,
          amount: request.amount
        })

        return {
          success: true,
          transactionId: paymentResult.transactionId
        }
      } else {
        // Update payment status to failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            failureReason: paymentResult.error
          }
        })

        return {
          success: false,
          error: paymentResult.error
        }
      }

    } catch (error) {
      logError(createError.internal('PAYMENT_RELEASE_ERROR', 'Failed to release payment', { 
        error, 
        correlationId,
        engagementId: request.engagementId 
      }))
      
      return {
        success: false,
        error: 'Internal error processing payment release'
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
        .filter(p => p.status === 'completed' && p.type === 'release')
        .reduce((sum, p) => sum + Number(p.amount), 0)

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
