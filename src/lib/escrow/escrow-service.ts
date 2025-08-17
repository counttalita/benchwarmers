import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'

export interface EscrowPayment {
  id: string
  engagementId: string
  amount: number
  currency: string
  status: 'pending' | 'held' | 'released' | 'refunded'
  stripePaymentIntentId: string
  providerAccountId: string
  platformFee: number
  providerAmount: number
  createdAt: Date
  releasedAt?: Date
}

export interface CreateEscrowPaymentOptions {
  engagementId: string
  amount: number
  currency: string
  paymentMethodId: string
  providerAccountId: string
}

export interface ReleaseEscrowPaymentOptions {
  escrowPaymentId: string
  providerAccountId: string
}

export class EscrowService {
  /**
   * Creates an escrow payment
   */
  async createEscrowPayment(options: CreateEscrowPaymentOptions): Promise<EscrowPayment> {
    try {
      const { engagementId, amount, currency, paymentMethodId, providerAccountId } = options

      // Validate engagement exists and is active
      const engagement = await prisma.engagement.findUnique({
        where: { id: engagementId }
      })

      if (!engagement) {
        throw new Error('Engagement not found')
      }

      if (engagement.status !== 'active') {
        throw new Error('Engagement is not active')
      }

      // Calculate fees
      const platformFee = Math.round(amount * 0.15) // 15% platform fee
      const providerAmount = amount - platformFee

      // Create payment intent with manual capture (escrow)
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        capture_method: 'manual',
        confirm: true,
        metadata: {
          engagementId,
          providerAccountId,
          platformFee: platformFee.toString(),
          providerAmount: providerAmount.toString()
        }
      })

      // Create escrow payment record
      const escrowPayment = await prisma.escrowPayment.create({
        data: {
          engagementId,
          amount,
          currency,
          status: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          providerAccountId,
          platformFee,
          providerAmount
        }
      })

      logger.info('Escrow payment created', {
        escrowPaymentId: escrowPayment.id,
        engagementId,
        amount,
        currency,
        paymentIntentId: paymentIntent.id
      })

      return escrowPayment
    } catch (error) {
      logger.error(error as Error, 'Failed to create escrow payment')
      throw error
    }
  }

  /**
   * Holds payment in escrow
   */
  async holdPayment(escrowPaymentId: string): Promise<EscrowPayment> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId }
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      if (escrowPayment.status !== 'pending') {
        throw new Error('Escrow payment is not in pending status')
      }

      // Capture the payment intent (this holds the funds)
      await stripe.paymentIntents.capture(escrowPayment.stripePaymentIntentId)

      // Update escrow payment status
      const updatedEscrowPayment = await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: { status: 'held' }
      })

      logger.info('Payment held in escrow', {
        escrowPaymentId,
        paymentIntentId: escrowPayment.stripePaymentIntentId
      })

      return updatedEscrowPayment
    } catch (error) {
      logger.error(error as Error, 'Failed to hold payment in escrow')
      throw error
    }
  }

  /**
   * Releases payment from escrow to provider
   */
  async releasePayment(options: ReleaseEscrowPaymentOptions): Promise<EscrowPayment> {
    try {
      const { escrowPaymentId, providerAccountId } = options

      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId }
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      if (escrowPayment.status !== 'held') {
        throw new Error('Escrow payment is not held')
      }

      if (escrowPayment.providerAccountId !== providerAccountId) {
        throw new Error('Provider account mismatch')
      }

      // Create transfer to provider's connected account
      const transfer = await stripe.transfers.create({
        amount: escrowPayment.providerAmount,
        currency: escrowPayment.currency,
        destination: providerAccountId,
        metadata: {
          escrowPaymentId,
          engagementId: escrowPayment.engagementId
        }
      })

      // Update escrow payment status
      const updatedEscrowPayment = await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: {
          status: 'released',
          releasedAt: new Date()
        }
      })

      logger.info('Payment released from escrow', {
        escrowPaymentId,
        transferId: transfer.id,
        providerAmount: escrowPayment.providerAmount
      })

      return updatedEscrowPayment
    } catch (error) {
      logger.error(error as Error, 'Failed to release payment from escrow')
      throw error
    }
  }

  /**
   * Refunds payment from escrow
   */
  async refundPayment(escrowPaymentId: string, reason?: string): Promise<EscrowPayment> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId }
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      if (escrowPayment.status !== 'held') {
        throw new Error('Escrow payment is not held')
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: escrowPayment.stripePaymentIntentId,
        reason: 'requested_by_customer'
      })

      // Update escrow payment status
      const updatedEscrowPayment = await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: {
          status: 'refunded'
        }
      })

      logger.info('Payment refunded from escrow', {
        escrowPaymentId,
        refundId: refund.id,
        reason
      })

      return updatedEscrowPayment
    } catch (error) {
      logger.error(error as Error, 'Failed to refund payment from escrow')
      throw error
    }
  }

  /**
   * Gets escrow payment by ID
   */
  async getEscrowPayment(escrowPaymentId: string): Promise<EscrowPayment | null> {
    try {
      return await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId }
      })
    } catch (error) {
      logger.error(error as Error, 'Failed to get escrow payment')
      throw error
    }
  }

  /**
   * Gets escrow payments for an engagement
   */
  async getEscrowPaymentsByEngagement(engagementId: string): Promise<EscrowPayment[]> {
    try {
      return await prisma.escrowPayment.findMany({
        where: { engagementId },
        orderBy: { createdAt: 'desc' }
      })
    } catch (error) {
      logger.error(error as Error, 'Failed to get escrow payments by engagement')
      throw error
    }
  }

  /**
   * Calculates platform fees
   */
  calculatePlatformFees(amount: number): { platformFee: number; providerAmount: number } {
    const platformFee = Math.round(amount * 0.15) // 15% platform fee
    const providerAmount = amount - platformFee
    return { platformFee, providerAmount }
  }
}
