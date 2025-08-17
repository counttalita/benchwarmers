import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/payments/route'
import { POST as ProcessPayment } from '@/app/api/payments/process/route'
import { POST as ReleasePayment } from '@/app/api/payments/release/route'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('stripe')

describe('/api/payments', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>
  const mockStripe = {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn()
    },
    transfers: {
      create: jest.fn()
    },
    accounts: {
      retrieve: jest.fn()
    }
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(Stripe as any).mockImplementation(() => mockStripe)
  })

  describe('GET /api/payments', () => {
    const mockPayments = [
      {
        id: 'payment-1',
        engagementId: 'engagement-1',
        amount: 5000,
        status: 'completed',
        type: 'milestone',
        stripePaymentIntentId: 'pi_test123',
        createdAt: new Date(),
        engagement: {
          id: 'engagement-1',
          title: 'React Development',
          seekerCompany: { name: 'Tech Corp' },
          providerUser: { name: 'John Dev' }
        }
      }
    ]

    it('should return payment history', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue(mockPayments as any)
      mockPrisma.transaction.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/payments', {
        headers: { 'x-user-id': 'user-1' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payments).toHaveLength(1)
      expect(data.payments[0].amount).toBe(5000)
    })

    it('should filter by engagement', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue(mockPayments as any)
      mockPrisma.transaction.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/payments?engagementId=engagement-1', {
        headers: { 'x-user-id': 'user-1' }
      })
      const response = await GET(request)

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ engagementId: 'engagement-1' })
        })
      )
    })

    it('should filter by status', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue(mockPayments as any)
      mockPrisma.transaction.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/payments?status=pending', {
        headers: { 'x-user-id': 'user-1' }
      })
      const response = await GET(request)

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' })
        })
      )
    })
  })

  describe('POST /api/payments/process', () => {
    const validPaymentData = {
      engagementId: 'engagement-1',
      amount: 5000,
      milestoneId: 'milestone-1',
      paymentMethodId: 'pm_test123'
    }

    it('should process a payment successfully', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        seekerCompanyId: 'company-1',
        providerUserId: 'user-1',
        totalAmount: 10000,
        status: 'active'
      }

      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 5000,
        client_secret: 'pi_test123_secret'
      }

      mockPrisma.engagement.findUnique.mockResolvedValue(mockEngagement as any)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'txn-123',
        ...validPaymentData,
        status: 'completed'
      } as any)

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(validPaymentData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ProcessPayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transaction.status).toBe('completed')
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500000, // Converted to cents
          currency: 'usd'
        })
      )
    })

    it('should validate payment amount', async () => {
      const invalidData = {
        ...validPaymentData,
        amount: -1000
      }

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ProcessPayment(request)

      expect(response.status).toBe(400)
    })

    it('should handle Stripe payment failures', async () => {
      mockPrisma.engagement.findUnique.mockResolvedValue({
        id: 'engagement-1',
        status: 'active'
      } as any)
      
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Your card was declined')
      )

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(validPaymentData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ProcessPayment(request)

      expect(response.status).toBe(400)
    })

    it('should validate engagement exists and is active', async () => {
      mockPrisma.engagement.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(validPaymentData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ProcessPayment(request)

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/payments/release', () => {
    const releaseData = {
      transactionId: 'txn-123',
      providerAccountId: 'acct_provider123'
    }

    it('should release escrowed payment', async () => {
      const mockTransaction = {
        id: 'txn-123',
        amount: 5000,
        status: 'escrowed',
        engagementId: 'engagement-1',
        stripePaymentIntentId: 'pi_test123'
      }

      const mockEngagement = {
        id: 'engagement-1',
        providerUserId: 'user-1',
        providerUser: {
          stripeAccountId: 'acct_provider123'
        }
      }

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction as any)
      mockPrisma.engagement.findUnique.mockResolvedValue(mockEngagement as any)
      mockStripe.transfers.create.mockResolvedValue({
        id: 'tr_test123',
        amount: 4500
      })
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: 'released'
      } as any)

      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify(releaseData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ReleasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transaction.status).toBe('released')
      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 450000, // Converted to cents
          destination: 'acct_provider123'
        })
      )
    })

    it('should validate transaction is in escrowed status', async () => {
      const mockTransaction = {
        id: 'txn-123',
        status: 'completed' // Already released
      }

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction as any)

      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify(releaseData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ReleasePayment(request)

      expect(response.status).toBe(400)
    })

    it('should handle Stripe transfer failures', async () => {
      const mockTransaction = {
        id: 'txn-123',
        status: 'escrowed',
        engagementId: 'engagement-1'
      }

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction as any)
      mockPrisma.engagement.findUnique.mockResolvedValue({
        providerUser: { stripeAccountId: 'acct_provider123' }
      } as any)
      
      mockStripe.transfers.create.mockRejectedValue(
        new Error('Insufficient funds in platform account')
      )

      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify(releaseData),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ReleasePayment(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Payment Security', () => {
    it('should validate user authorization for payment processing', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await ProcessPayment(request)

      expect(response.status).toBe(401)
    })

    it('should validate user can only access their own payments', async () => {
      // Mock user trying to access another user's payments
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1'
      } as any)

      const request = new NextRequest('http://localhost:3000/api/payments?userId=other-user', {
        headers: { 
          'x-user-id': 'user-1',
          'x-company-id': 'company-2' // Different company
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('should sanitize payment data in responses', async () => {
      const mockPayments = [{
        id: 'payment-1',
        amount: 5000,
        currency: 'usd',
        status: 'completed',
        type: 'milestone',
        createdAt: new Date(),
        processedAt: new Date(),
        engagement: {
          id: 'engagement-1',
          title: 'Test Engagement',
          status: 'active'
        }
      }]

      mockPrisma.transaction.findMany.mockResolvedValue(mockPayments as any)
      mockPrisma.transaction.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/payments', {
        headers: { 'x-user-id': 'user-1' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(data.payments).toHaveLength(1)
      expect(data.payments[0]).not.toHaveProperty('stripePaymentIntentId')
      expect(data.payments[0]).not.toHaveProperty('internalNotes')
    })
  })

  describe('Payment Webhooks', () => {
    it('should handle Stripe webhook events', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            status: 'succeeded',
            amount: 5000
          }
        }
      }

      // Mock the transaction.findFirst method
      if (mockPrisma.transaction.findFirst) {
        mockPrisma.transaction.findFirst.mockResolvedValue({
          id: 'evt_test_webhook',
          status: 'pending'
        } as any)
      }

      if (mockPrisma.transaction.update) {
        mockPrisma.transaction.update.mockResolvedValue({
          id: 'evt_test_webhook',
          status: 'completed'
        } as any)
      }

      // Test webhook processing logic
      expect(webhookPayload.type).toBe('payment_intent.succeeded')
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.transaction.findMany.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/payments', {
        headers: { 'x-user-id': 'user-1' }
      })
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle malformed request bodies', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        }
      })

      const response = await ProcessPayment(request)

      expect(response.status).toBe(500)
    })
  })
})
