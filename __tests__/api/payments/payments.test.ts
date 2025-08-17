import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { processPayment, releasePayment, getPayment } from '@/app/api/payments/route'
import { createPaymentIntent } from '@/app/api/payments/stripe/route'

// Mock Appwrite
jest.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  createPaymentIntent: jest.fn(),
  confirmPaymentIntent: jest.fn(),
  transferToConnectAccount: jest.fn()
}))

// Mock Twilio
jest.mock('@/lib/twilio', () => ({
  sendSMS: jest.fn()
}))

describe('Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/payments', () => {
    it('should process payment for accepted offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          paymentMethodId: 'pm_1234567890'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock offer data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'accepted',
        totalAmount: 12000,
        platformFee: 1800,
        providerAmount: 10200,
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      // Mock Stripe payment intent
      jest.mocked(require('@/lib/stripe').createPaymentIntent).mockResolvedValue({
        id: 'pi_1234567890',
        status: 'succeeded',
        amount: 12000
      })

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.payment).toBeDefined()
      expect(data.payment.status).toBe('held_in_escrow')
      expect(data.payment.amount).toBe(12000)
    })

    it('should validate offer is accepted before payment', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          paymentMethodId: 'pm_1234567890'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock pending offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'pending'
      })

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Payment can only be processed for accepted offers')
    })

    it('should validate offer belongs to seeker', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          paymentMethodId: 'pm_1234567890'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'different-company'
      })

      // Mock offer from different company
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'accepted',
        seekerCompanyId: 'seeker-company-123'
      })

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Offer does not belong to your company')
    })

    it('should handle Stripe payment failure', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          paymentMethodId: 'pm_1234567890'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock offer data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'accepted',
        totalAmount: 12000,
        seekerCompanyId: 'seeker-company-123'
      })

      // Mock Stripe payment failure
      jest.mocked(require('@/lib/stripe').createPaymentIntent).mockRejectedValue(new Error('Payment failed'))

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Payment processing failed')
    })
  })

  describe('POST /api/payments/release', () => {
    it('should release payment from escrow upon completion', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: 'payment-123',
          engagementId: 'engagement-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock payment data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'payment-123',
        status: 'held_in_escrow',
        amount: 12000,
        platformFeeAmount: 1800,
        providerAmount: 10200,
        offerId: 'offer-123'
      })

      // Mock engagement data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'completed',
        offerId: 'offer-123'
      })

      // Mock Stripe transfer
      jest.mocked(require('@/lib/stripe').transferToConnectAccount).mockResolvedValue({
        id: 'tr_1234567890',
        amount: 10200
      })

      const response = await releasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.payment.status).toBe('released')
    })

    it('should validate engagement is completed before release', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: 'payment-123',
          engagementId: 'engagement-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock active engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active'
      })

      const response = await releasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Payment can only be released for completed engagements')
    })

    it('should require both parties to confirm completion', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: 'payment-123',
          engagementId: 'engagement-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock engagement with only seeker confirmation
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'completed',
        seekerConfirmed: true,
        providerConfirmed: false
      })

      const response = await releasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Both parties must confirm completion before payment release')
    })
  })

  describe('GET /api/payments/[id]', () => {
    it('should get payment details', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/payment-123')

      // Mock payment data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'payment-123',
        amount: 12000,
        status: 'held_in_escrow',
        platformFeeAmount: 1800,
        providerAmount: 10200
      })

      const response = await getPayment(request, { params: { id: 'payment-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.payment.amount).toBe(12000)
      expect(data.payment.status).toBe('held_in_escrow')
    })

    it('should return 404 for non-existent payment', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/non-existent')

      // Mock non-existent payment
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockRejectedValue(new Error('Not found'))

      const response = await getPayment(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Payment not found')
    })
  })

  describe('POST /api/payments/stripe', () => {
    it('should create Stripe payment intent', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe', {
        method: 'POST',
        body: JSON.stringify({
          amount: 12000,
          currency: 'USD',
          description: 'Payment for offer offer-123'
        })
      })

      // Mock Stripe payment intent
      jest.mocked(require('@/lib/stripe').createPaymentIntent).mockResolvedValue({
        id: 'pi_1234567890',
        client_secret: 'pi_1234567890_secret_abc123',
        amount: 12000,
        currency: 'USD'
      })

      const response = await createPaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.paymentIntent).toBeDefined()
      expect(data.paymentIntent.client_secret).toBe('pi_1234567890_secret_abc123')
    })

    it('should validate amount is positive', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe', {
        method: 'POST',
        body: JSON.stringify({
          amount: 0,
          currency: 'USD'
        })
      })

      const response = await createPaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Amount must be greater than 0')
    })

    it('should validate supported currency', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe', {
        method: 'POST',
        body: JSON.stringify({
          amount: 12000,
          currency: 'INVALID'
        })
      })

      const response = await createPaymentIntent(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unsupported currency')
    })
  })

  describe('Payment Fee Calculations', () => {
    it('should calculate 15% platform fee correctly', async () => {
      const totalAmount = 10000
      const platformFee = totalAmount * 0.15 // 15%
      const providerAmount = totalAmount * 0.85 // 85%

      expect(platformFee).toBe(1500)
      expect(providerAmount).toBe(8500)
      expect(platformFee + providerAmount).toBe(totalAmount)
    })

    it('should handle different amounts correctly', async () => {
      const testCases = [
        { amount: 5000, expectedFee: 750, expectedProvider: 4250 },
        { amount: 15000, expectedFee: 2250, expectedProvider: 12750 },
        { amount: 25000, expectedFee: 3750, expectedProvider: 21250 }
      ]

      testCases.forEach(({ amount, expectedFee, expectedProvider }) => {
        const platformFee = amount * 0.15
        const providerAmount = amount * 0.85

        expect(platformFee).toBe(expectedFee)
        expect(providerAmount).toBe(expectedProvider)
        expect(platformFee + providerAmount).toBe(amount)
      })
    })
  })
})
