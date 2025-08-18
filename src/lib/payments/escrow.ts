import { prisma } from '@/lib/prisma'
import { paystackConnectService } from '@/lib/paystack/connect'
import logger from '@/lib/logger'

export interface EscrowPayment {
  id: string
  engagementId: string
  amount: number
  platformFee: number
  providerAmount: number
  currency: string
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed'
  paymentIntentId?: string
  transferId?: string
  createdAt: Date
  updatedAt: Date
}

export interface PaymentBreakdown {
  totalAmount: number
  platformFee: number
  providerAmount: number
  platformFeePercentage: number
  currency: string
}

export class EscrowPaymentService {
  private readonly PLATFORM_FEE_PERCENTAGE = 0.15 // 15%

  /**
   * Calculate payment breakdown with platform fee
   */
  calculatePaymentBreakdown(totalAmount: number, currency: string = 'USD'): PaymentBreakdown {
    const platformFee = totalAmount * this.PLATFORM_FEE_PERCENTAGE
    const providerAmount = totalAmount - platformFee

    return {
      totalAmount,
      platformFee: Math.round(platformFee * 100) / 100, // Round to 2 decimal places
      providerAmount: Math.round(providerAmount * 100) / 100,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE * 100,
      currency,
    }
  }

  /**
   * Create escrow payment record
   */
  async createEscrowPayment(engagementId: string, amount: number, currency: string = 'USD'): Promise<EscrowPayment> {
    try {
      const breakdown = this.calculatePaymentBreakdown(amount, currency)

      const escrowPayment = await prisma.escrowPayment.create({
        data: {
          engagementId,
          amount: breakdown.totalAmount,
          platformFee: breakdown.platformFee,
          providerAmount: breakdown.providerAmount,
          currency,
          status: 'pending',
        },
      })

      logger.info('Escrow payment created', {
        escrowPaymentId: escrowPayment.id,
        engagementId,
        amount: breakdown.totalAmount,
        platformFee: breakdown.platformFee,
        providerAmount: breakdown.providerAmount,
      })

      return escrowPayment
    } catch (error) {
      logger.error('Failed to create escrow payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        engagementId,
        amount,
        currency,
      })
      throw new Error('Failed to create escrow payment')
    }
  }

  /**
   * Process payment and hold in escrow
   */
  async processPayment(
    escrowPaymentId: string,
    seekerCompanyId: string,
    providerCompanyId: string,
    paymentMethodId: string
  ): Promise<EscrowPayment> {
    try {
      // Get escrow payment
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId },
        include: { engagement: true },
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      if (escrowPayment.status !== 'pending') {
        throw new Error('Payment already processed')
      }

      // Get provider's Stripe Connect account
      const providerCompany = await prisma.company.findUnique({
        where: { id: providerCompanyId },
        select: { stripeConnectAccountId: true },
      })

      if (!providerCompany?.stripeConnectAccountId) {
        throw new Error('Provider not set up for payments')
      }

      // Create payment intent with Paystack
      const paymentIntent = await paystackConnectService.createPaymentIntent(
        escrowPayment.amount,
        escrowPayment.currency,
        {
          engagementId: escrowPayment.engagementId,
          seekerCompanyId,
          providerCompanyId: providerCompany.stripeConnectAccountId,
          description: `Payment for engagement: ${escrowPayment.engagement.title}`,
        }
      )

      // Update escrow payment with payment intent
      const updatedPayment = await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: {
          paymentIntentId: paymentIntent.id,
          status: 'held',
          updatedAt: new Date(),
        },
      })

      logger.info('Payment processed and held in escrow', {
        escrowPaymentId,
        paymentIntentId: paymentIntent.id,
        amount: escrowPayment.amount,
      })

      return updatedPayment
    } catch (error) {
      logger.error('Failed to process payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
        seekerCompanyId,
        providerCompanyId,
      })
      throw new Error('Failed to process payment')
    }
  }

  /**
   * Release payment to provider (85%) and retain platform fee (15%)
   */
  async releasePayment(escrowPaymentId: string, providerAccountId: string): Promise<EscrowPayment> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId },
        include: { engagement: true },
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      if (escrowPayment.status !== 'held') {
        throw new Error('Payment not held in escrow')
      }

      if (!escrowPayment.paymentIntentId) {
        throw new Error('No payment intent found')
      }

      // Get provider's Stripe Connect account
      const providerCompany = await prisma.company.findUnique({
        where: { id: escrowPayment.engagement.providerCompanyId },
        select: { stripeConnectAccountId: true },
      })

      if (!providerCompany?.stripeConnectAccountId) {
        throw new Error('Provider not set up for payments')
      }

      // Create transfer to provider
      const transfer = await paystackConnectService.createTransfer(
        escrowPayment.providerAmount,
        escrowPayment.currency,
        providerAccountId,
        {
          engagementId: escrowPayment.engagementId,
          description: `Payment release for engagement: ${escrowPayment.engagement.title}`,
        }
      )

      // Update escrow payment status
      const updatedPayment = await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: {
          transferId: transfer.id,
          status: 'released',
          updatedAt: new Date(),
        },
      })

      logger.info('Payment released to provider', {
        escrowPaymentId,
        transferId: transfer.id,
        providerAmount: escrowPayment.providerAmount,
        platformFee: escrowPayment.platformFee,
      })

      return updatedPayment
    } catch (error) {
      logger.error('Failed to release payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
      })
      throw new Error('Failed to release payment')
    }
  }

  /**
   * Refund payment to seeker
   */
  async refundPayment(escrowPaymentId: string, reason: string): Promise<EscrowPayment> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId },
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      if (escrowPayment.status !== 'held') {
        throw new Error('Payment not held in escrow')
      }

      if (!escrowPayment.paymentIntentId) {
        throw new Error('No payment intent found')
      }

      // For Paystack, refunds are handled differently - typically through customer service
      // This is a simplified implementation for testing
      const refund = {
        id: `refund_${Date.now()}`,
        amount: escrowPayment.amount,
        currency: escrowPayment.currency,
        status: 'pending',
        reason
      }

      // Update escrow payment status
      const updatedPayment = await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: {
          status: 'refunded',
          updatedAt: new Date(),
        },
      })

      logger.info('Payment refunded', {
        escrowPaymentId,
        refundId: refund.id,
        amount: escrowPayment.amount,
        reason,
      })

      return updatedPayment
    } catch (error) {
      logger.error('Failed to refund payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
        reason,
      })
      throw new Error('Failed to refund payment')
    }
  }

  /**
   * Get escrow payment by ID
   */
  async getEscrowPayment(escrowPaymentId: string): Promise<EscrowPayment | null> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId },
        include: { engagement: true },
      })

      return escrowPayment
    } catch (error) {
      logger.error('Failed to get escrow payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
      })
      throw new Error('Failed to retrieve escrow payment')
    }
  }

  /**
   * Get escrow payments for an engagement
   */
  async getEscrowPaymentsByEngagement(engagementId: string): Promise<EscrowPayment[]> {
    try {
      const escrowPayments = await prisma.escrowPayment.findMany({
        where: { engagementId },
        orderBy: { createdAt: 'desc' },
      })

      return escrowPayments
    } catch (error) {
      logger.error('Failed to get escrow payments for engagement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        engagementId,
      })
      throw new Error('Failed to retrieve escrow payments')
    }
  }

  /**
   * Get payment status from Stripe
   */
  async getPaymentStatus(escrowPaymentId: string): Promise<{ status: string; amount?: number; currency?: string; error?: string }> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId },
      })

      if (!escrowPayment?.paymentIntentId) {
        throw new Error('No payment intent found')
      }

      const paymentIntent = await paystackConnectService.getPaymentIntentStatus(
        escrowPayment.paymentIntentId
      )

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount, // Already in main currency units for Paystack
        currency: paymentIntent.currency,
        error: paymentIntent.last_payment_error?.message,
      }
    } catch (error) {
      logger.error('Failed to get payment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
      })
      throw new Error('Failed to retrieve payment status')
    }
  }
}

export const escrowPaymentService = new EscrowPaymentService()
