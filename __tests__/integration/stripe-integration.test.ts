import Stripe from 'stripe'
import { PaymentManager } from '@/lib/payments/payment-manager'
import { EscrowService } from '@/lib/payments/escrow'

// Mock Stripe with realistic responses
jest.mock('stripe')

describe('Stripe Integration Tests', () => {
  let stripe: jest.Mocked<Stripe>
  let paymentManager: PaymentManager
  let escrowService: EscrowService

  const mockStripeResponses = {
    paymentIntent: {
      id: 'pi_test_1234567890',
      object: 'payment_intent',
      amount: 5000,
      currency: 'usd',
      status: 'succeeded',
      client_secret: 'pi_test_1234567890_secret_test',
      created: Math.floor(Date.now() / 1000),
      payment_method: 'pm_test_card'
    },
    account: {
      id: 'acct_test_1234567890',
      object: 'account',
      business_profile: {
        name: 'Test Business'
      },
      capabilities: {
        card_payments: 'active',
        transfers: 'active'
      },
      charges_enabled: true,
      payouts_enabled: true
    },
    transfer: {
      id: 'tr_test_1234567890',
      object: 'transfer',
      amount: 4500,
      currency: 'usd',
      destination: 'acct_test_provider',
      created: Math.floor(Date.now() / 1000)
    }
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock Stripe instance
    stripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        confirm: jest.fn(),
        cancel: jest.fn()
      },
      accounts: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn()
      },
      accountLinks: {
        create: jest.fn()
      },
      transfers: {
        create: jest.fn(),
        retrieve: jest.fn()
      },
      refunds: {
        create: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    } as any

    // Mock Stripe constructor
    ;(Stripe as any).mockImplementation(() => stripe)

    paymentManager = new PaymentManager()
    escrowService = new EscrowService()
  })

  describe('Payment Intent Management', () => {
    it('should create payment intent with correct parameters', async () => {
      stripe.paymentIntents.create.mockResolvedValue(mockStripeResponses.paymentIntent as any)

      const paymentData = {
        amount: 5000,
        currency: 'usd',
        paymentMethodId: 'pm_test_card',
        customerId: 'cus_test_customer'
      }

      const result = await paymentManager.createPaymentIntent(paymentData)

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        payment_method: 'pm_test_card',
        customer: 'cus_test_customer',
        confirmation_method: 'manual',
        capture_method: 'manual', // For escrow
        metadata: expect.any(Object)
      })

      expect(result.id).toBe('pi_test_1234567890')
      expect(result.status).toBe('succeeded')
    })

    it('should handle payment intent creation failures', async () => {
      const stripeError = new Error('Your card was declined') as any
      stripeError.type = 'card_error'
      stripeError.code = 'card_declined'
      
      stripe.paymentIntents.create.mockRejectedValue(stripeError)

      const paymentData = {
        amount: 5000,
        currency: 'usd',
        paymentMethodId: 'pm_test_declined_card'
      }

      await expect(paymentManager.createPaymentIntent(paymentData))
        .rejects.toThrow('Your card was declined')
    })

    it('should confirm payment intent for immediate capture', async () => {
      const confirmedIntent = {
        ...mockStripeResponses.paymentIntent,
        status: 'succeeded'
      }

      stripe.paymentIntents.confirm.mockResolvedValue(confirmedIntent as any)

      const result = await paymentManager.confirmPaymentIntent('pi_test_1234567890')

      expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_1234567890')
      expect(result.status).toBe('succeeded')
    })

    it('should retrieve payment intent status', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue(mockStripeResponses.paymentIntent as any)

      const result = await paymentManager.getPaymentIntentStatus('pi_test_1234567890')

      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_1234567890')
      expect(result.status).toBe('succeeded')
    })
  })

  describe('Connected Accounts Management', () => {
    it('should create connected account for provider', async () => {
      const accountData = {
        type: 'express' as const,
        country: 'US',
        email: 'provider@example.com',
        business_type: 'individual' as const
      }

      stripe.accounts.create.mockResolvedValue(mockStripeResponses.account as any)

      const result = await paymentManager.createConnectedAccount(accountData)

      expect(stripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'US',
        email: 'provider@example.com',
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      })

      expect(result.id).toBe('acct_test_1234567890')
    })

    it('should create account link for onboarding', async () => {
      const accountLink = {
        object: 'account_link',
        created: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        url: 'https://connect.stripe.com/express/oauth/authorize?client_id=ca_test'
      }

      stripe.accountLinks.create.mockResolvedValue(accountLink as any)

      const result = await paymentManager.createAccountLink({
        account: 'acct_test_1234567890',
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://example.com/return',
        type: 'account_onboarding'
      })

      expect(stripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_test_1234567890',
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://example.com/return',
        type: 'account_onboarding'
      })

      expect(result.url).toContain('connect.stripe.com')
    })

    it('should retrieve account capabilities', async () => {
      stripe.accounts.retrieve.mockResolvedValue(mockStripeResponses.account as any)

      const result = await paymentManager.getAccountCapabilities('acct_test_1234567890')

      expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_test_1234567890')
      expect(result.capabilities.card_payments).toBe('active')
      expect(result.capabilities.transfers).toBe('active')
    })
  })

  describe('Transfer and Payout Management', () => {
    it('should create transfer to connected account', async () => {
      stripe.transfers.create.mockResolvedValue(mockStripeResponses.transfer as any)

      const transferData = {
        amount: 4500, // After platform fees
        currency: 'usd',
        destination: 'acct_test_provider',
        source_transaction: 'pi_test_1234567890'
      }

      const result = await paymentManager.createTransfer(transferData)

      expect(stripe.transfers.create).toHaveBeenCalledWith({
        amount: 4500,
        currency: 'usd',
        destination: 'acct_test_provider',
        source_transaction: 'pi_test_1234567890',
        metadata: expect.any(Object)
      })

      expect(result.id).toBe('tr_test_1234567890')
      expect(result.amount).toBe(4500)
    })

    it('should handle transfer failures', async () => {
      const transferError = new Error('Insufficient funds') as any
      transferError.type = 'invalid_request_error'
      
      stripe.transfers.create.mockRejectedValue(transferError)

      const transferData = {
        amount: 10000,
        currency: 'usd',
        destination: 'acct_test_provider'
      }

      await expect(paymentManager.createTransfer(transferData))
        .rejects.toThrow('Insufficient funds')
    })
  })

  describe('Refund Management', () => {
    it('should create refund for payment intent', async () => {
      const refund = {
        id: 're_test_1234567890',
        object: 'refund',
        amount: 2500,
        currency: 'usd',
        payment_intent: 'pi_test_1234567890',
        status: 'succeeded'
      }

      stripe.refunds.create.mockResolvedValue(refund as any)

      const result = await paymentManager.createRefund({
        payment_intent: 'pi_test_1234567890',
        amount: 2500,
        reason: 'requested_by_customer'
      })

      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_1234567890',
        amount: 2500,
        reason: 'requested_by_customer',
        metadata: expect.any(Object)
      })

      expect(result.id).toBe('re_test_1234567890')
      expect(result.amount).toBe(2500)
    })

    it('should handle partial refunds correctly', async () => {
      const originalAmount = 5000
      const refundAmount = 2000
      
      const refund = {
        id: 're_test_partial',
        amount: refundAmount,
        payment_intent: 'pi_test_1234567890',
        status: 'succeeded'
      }

      stripe.refunds.create.mockResolvedValue(refund as any)

      const result = await paymentManager.createRefund({
        payment_intent: 'pi_test_1234567890',
        amount: refundAmount
      })

      expect(result.amount).toBe(refundAmount)
      expect(result.amount).toBeLessThan(originalAmount)
    })
  })

  describe('Webhook Processing', () => {
    it('should verify and process webhook events', async () => {
      const webhookPayload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: mockStripeResponses.paymentIntent
        }
      })

      const webhookSignature = 'test_signature'
      const webhookSecret = 'whsec_test_secret'

      const event = {
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: {
          object: mockStripeResponses.paymentIntent
        }
      }

      stripe.webhooks.constructEvent.mockReturnValue(event as any)

      const result = await paymentManager.processWebhook(
        webhookPayload,
        webhookSignature,
        webhookSecret
      )

      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        webhookPayload,
        webhookSignature,
        webhookSecret
      )

      expect(result.type).toBe('payment_intent.succeeded')
      expect(result.data.object.id).toBe('pi_test_1234567890')
    })

    it('should handle invalid webhook signatures', async () => {
      const webhookError = new Error('Invalid signature') as any
      webhookError.type = 'StripeSignatureVerificationError'

      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw webhookError
      })

      await expect(
        paymentManager.processWebhook('invalid_payload', 'invalid_sig', 'secret')
      ).rejects.toThrow('Invalid signature')
    })
  })

  describe('Escrow Integration with Stripe', () => {
    it('should hold payment in escrow using manual capture', async () => {
      const escrowIntent = {
        ...mockStripeResponses.paymentIntent,
        status: 'requires_capture',
        capture_method: 'manual'
      }

      stripe.paymentIntents.create.mockResolvedValue(escrowIntent as any)

      const result = await escrowService.createEscrowPayment({
        amount: 5000,
        paymentMethodId: 'pm_test_card',
        holdUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          capture_method: 'manual'
        })
      )

      expect(result.status).toBe('requires_capture')
    })

    it('should release escrowed payment by capturing', async () => {
      const capturedIntent = {
        ...mockStripeResponses.paymentIntent,
        status: 'succeeded'
      }

      stripe.paymentIntents.confirm.mockResolvedValue(capturedIntent as any)

      const result = await escrowService.releaseEscrowPayment('pi_test_1234567890')

      expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_1234567890')
      expect(result.status).toBe('succeeded')
    })

    it('should cancel escrowed payment if conditions not met', async () => {
      const cancelledIntent = {
        ...mockStripeResponses.paymentIntent,
        status: 'canceled'
      }

      stripe.paymentIntents.cancel.mockResolvedValue(cancelledIntent as any)

      const result = await escrowService.cancelEscrowPayment('pi_test_1234567890')

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_1234567890')
      expect(result.status).toBe('canceled')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout') as any
      timeoutError.type = 'StripeConnectionError'

      stripe.paymentIntents.create.mockRejectedValue(timeoutError)

      await expect(
        paymentManager.createPaymentIntent({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow('Request timeout')
    })

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Too many requests') as any
      rateLimitError.type = 'RateLimitError'
      rateLimitError.statusCode = 429

      stripe.paymentIntents.create.mockRejectedValue(rateLimitError)

      await expect(
        paymentManager.createPaymentIntent({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow('Too many requests')
    })

    it('should validate minimum payment amounts', async () => {
      await expect(
        paymentManager.createPaymentIntent({ amount: 10, currency: 'usd' }) // Below $0.50 minimum
      ).rejects.toThrow('Amount below minimum')
    })

    it('should handle currency validation', async () => {
      await expect(
        paymentManager.createPaymentIntent({ amount: 1000, currency: 'invalid' })
      ).rejects.toThrow('Invalid currency')
    })
  })

  describe('Fee Calculations with Stripe', () => {
    it('should calculate accurate Stripe fees', () => {
      const testCases = [
        { amount: 1000, expectedFee: 59 }, // $10.00 -> $0.59 (2.9% + $0.30)
        { amount: 5000, expectedFee: 175 }, // $50.00 -> $1.75
        { amount: 100, expectedFee: 33 } // $1.00 -> $0.33
      ]

      testCases.forEach(({ amount, expectedFee }) => {
        const fee = paymentManager.calculateStripeFee(amount)
        expect(fee).toBe(expectedFee)
      })
    })

    it('should calculate net amount after all fees', () => {
      const grossAmount = 10000 // $100.00
      const stripeFee = paymentManager.calculateStripeFee(grossAmount) // $3.20
      const platformFee = paymentManager.calculatePlatformFee(grossAmount) // $5.00 (5%)
      const netAmount = paymentManager.calculateNetAmount(grossAmount)

      expect(netAmount).toBe(grossAmount - stripeFee - platformFee)
    })
  })
})
