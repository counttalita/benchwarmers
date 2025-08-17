import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export interface EscrowPaymentData {
  amount: number
  paymentMethodId: string
  holdUntil: Date
  releaseConditions?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface EscrowReleaseData {
  paymentIntentId: string
  releaseAmount?: number
  metadata?: Record<string, unknown>
}

export class EscrowService {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-07-30.basil'
    })
  }

  async createEscrowPayment(data: EscrowPaymentData) {
    try {
      // Create payment intent with manual capture for escrow
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: data.amount,
        currency: 'usd',
        payment_method: data.paymentMethodId,
        confirmation_method: 'manual',
        capture_method: 'manual', // This enables escrow functionality
        metadata: {
          escrow: 'true',
          holdUntil: data.holdUntil.toISOString(),
          ...data.metadata
        }
      })

      console.log('Escrow payment created', {
        paymentIntentId: paymentIntent.id,
        amount: data.amount,
        holdUntil: data.holdUntil
      })

      return paymentIntent
    } catch (error) {
      console.error('Failed to create escrow payment', { error, data })
      throw error
    }
  }

  async releaseEscrowPayment(paymentIntentId: string, releaseData?: EscrowReleaseData) {
    try {
      // Confirm and capture the payment to release from escrow
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId)

      console.log('Escrow payment released', {
        paymentIntentId,
        releaseAmount: releaseData?.releaseAmount,
        status: paymentIntent.status
      })

      return paymentIntent
    } catch (error) {
      console.error('Failed to release escrow payment', { error, paymentIntentId })
      throw error
    }
  }

  async cancelEscrowPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId)

      console.log('Escrow payment cancelled', {
        paymentIntentId,
        status: paymentIntent.status
      })

      return paymentIntent
    } catch (error) {
      console.error('Failed to cancel escrow payment', { error, paymentIntentId })
      throw error
    }
  }

  async getEscrowStatus(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        capturable: paymentIntent.status === 'requires_capture',
        metadata: paymentIntent.metadata
      }
    } catch (error) {
      console.error('Failed to get escrow status', { error, paymentIntentId })
      throw error
    }
  }
}
