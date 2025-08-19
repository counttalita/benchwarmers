import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createEscrowPayment, GET as getEscrowPayments } from '@/app/api/payments/escrow/route'
import { POST as processPayment } from '@/app/api/payments/process/route'
import { POST as releasePayment } from '@/app/api/payments/release/route'

// Mock authentication
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock escrow payment service
jest.mock('@/lib/payments/escrow', () => ({
  escrowPaymentService: {
    createEscrowPayment: jest.fn(),
    processPayment: jest.fn(),
    releasePayment: jest.fn(),
    getEscrowPaymentsByEngagement: jest.fn(),
    calculatePaymentBreakdown: jest.fn(),
  },
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    escrowPayment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    engagement: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Escrow Payment API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/payments/escrow', () => {
    it('should create escrow payment with correct breakdown', async () => {
      const mockEngagement = {
        id: 'engagement-123',
        title: 'Test Project',
        status: 'pending',
        seekerCompany: {
          id: 'seeker-company-123',
          name: 'Seeker Company',
        },
        providerCompany: {
          id: 'provider-company-123',
          name: 'Provider Company',
          stripeConnectAccountId: 'acct_provider123',
        },
      }

      const mockEscrowPayment = {
        id: 'escrow-123',
        engagementId: 'engagement-123',
        amount: 1000,
        platformFee: 150,
        providerAmount: 850,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockBreakdown = {
        totalAmount: 1000,
        platformFee: 150,
        providerAmount: 850,
        platformFeePercentage: 15,
        currency: 'USD',
      }

      // Mock authentication
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'seeker-company-123',
      })

      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue(mockEngagement as any)
      jest.mocked(require('@/lib/payments/escrow').escrowPaymentService.createEscrowPayment).mockResolvedValue(mockEscrowPayment)
      jest.mocked(require('@/lib/payments/escrow').escrowPaymentService.calculatePaymentBreakdown).mockReturnValue(mockBreakdown)

      const request = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'seeker-company-123',
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          amount: 1000,
          currency: 'USD',
        }),
      })

      const response = await createEscrowPayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.escrowPayment.id).toBe('escrow-123')
      expect(data.breakdown.platformFee).toBe(150)
      expect(data.breakdown.providerAmount).toBe(850)
      expect(data.breakdown.platformFeePercentage).toBe(15)
      expect(data.message).toBe('Escrow payment created successfully')
    })

    it('should reject request without required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1000,
          currency: 'USD',
        }),
      })

      const response = await createEscrowPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Engagement ID and amount are required')
    })

    it('should reject invalid amount', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          amount: 0,
          currency: 'USD',
        }),
      })

      const response = await createEscrowPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Amount must be greater than 0')
    })

    it('should reject if engagement not found', async () => {
      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'nonexistent-engagement',
          amount: 1000,
          currency: 'USD',
        }),
      })

      const response = await createEscrowPayment(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Engagement not found')
    })

    it('should reject if engagement not in pending status', async () => {
      const mockEngagement = {
        id: 'engagement-123',
        status: 'active',
        seekerCompany: { id: 'seeker-123' },
        providerCompany: { id: 'provider-123' },
      }

      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue(mockEngagement as any)

      const request = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          amount: 1000,
          currency: 'USD',
        }),
      })

      const response = await createEscrowPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Engagement is not in pending status')
    })

    it('should reject if provider not set up for payments', async () => {
      const mockEngagement = {
        id: 'engagement-123',
        status: 'active',
        seekerCompany: { id: 'seeker-123' },
        providerCompany: { 
          id: 'provider-123',
          stripeConnectAccountId: null,
        },
      }

      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue(mockEngagement as any)

      const request = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          amount: 1000,
          currency: 'USD',
        }),
      })

      const response = await createEscrowPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Provider not set up for payments')
    })
  })

  describe('GET /api/payments/escrow', () => {
    it('should return escrow payments for engagement', async () => {
      const mockEscrowPayments = [
        {
          id: 'escrow-123',
          engagementId: 'engagement-123',
          amount: 1000,
          platformFee: 150,
          providerAmount: 850,
          currency: 'USD',
          status: 'held',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      jest.mocked(require('@/lib/payments/escrow').escrowPaymentService.getEscrowPaymentsByEngagement).mockResolvedValue(mockEscrowPayments)

      const request = new NextRequest('http://localhost:3000/api/payments/escrow?engagementId=engagement-123')

      const response = await getEscrowPayments(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.escrowPayments).toHaveLength(1)
      expect(data.escrowPayments[0].id).toBe('escrow-123')
    })

    it('should reject request without engagement ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/escrow')

      const response = await getEscrowPayments(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Engagement ID is required')
    })
  })

  describe('POST /api/payments/process', () => {
    it('should process payment and hold in escrow', async () => {
      const mockEscrowPayment = {
        id: 'escrow-123',
        engagementId: 'engagement-123',
        amount: 1000,
        status: 'pending',
        engagement: {
          seekerCompanyId: 'seeker-123',
          providerCompanyId: 'provider-123',
        },
      }

      const mockProcessedPayment = {
        ...mockEscrowPayment,
        status: 'held',
        paymentIntentId: 'pi_test123',
      }

      // Mock authentication
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'seeker-123',
      })

      jest.mocked(require('@/lib/prisma').prisma.escrowPayment.findUnique).mockResolvedValue(mockEscrowPayment as any)
      jest.mocked(require('@/lib/payments/escrow').escrowPaymentService.processPayment).mockResolvedValue(mockProcessedPayment)

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'seeker-123',
        },
        body: JSON.stringify({
          escrowPaymentId: 'escrow-123',
          paymentMethodId: 'pm_test123',
        }),
      })

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.escrowPayment.status).toBe('held')
      expect(data.escrowPayment.paymentIntentId).toBe('pi_test123')
      expect(data.message).toBe('Payment processed successfully')
    })

    it('should reject if escrow payment not found', async () => {
      jest.mocked(require('@/lib/prisma').prisma.escrowPayment.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          escrowPaymentId: 'nonexistent-escrow',
          paymentMethodId: 'pm_test123',
        }),
      })

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Escrow payment not found')
    })

    it('should reject if payment already processed', async () => {
      const mockEscrowPayment = {
        id: 'escrow-123',
        status: 'held',
        engagement: {
          seekerCompanyId: 'seeker-123',
          providerCompanyId: 'provider-123',
        },
      }

      // Mock authentication
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'seeker-123',
      })

      jest.mocked(require('@/lib/prisma').prisma.escrowPayment.findUnique).mockResolvedValue(mockEscrowPayment as any)

      const request = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'seeker-123',
        },
        body: JSON.stringify({
          escrowPaymentId: 'escrow-123',
          paymentMethodId: 'pm_test123',
        }),
      })

      const response = await processPayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Payment already processed')
    })
  })

  describe('POST /api/payments/release', () => {
    it('should release payment to provider', async () => {
      const mockEscrowPayment = {
        id: 'escrow-123',
        engagementId: 'engagement-123',
        status: 'held',
        engagement: {
          status: 'completed',
          seekerCompanyId: 'seeker-123',
          providerCompanyId: 'provider-123',
          participants: [
            { userId: 'user-123', role: 'seeker' },
          ],
        },
      }

      const mockReleasedPayment = {
        ...mockEscrowPayment,
        status: 'released',
        transferId: 'tr_test123',
      }

      // Mock authentication
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'seeker-123',
      })

      jest.mocked(require('@/lib/prisma').prisma.transaction.findUnique).mockResolvedValue({
        id: 'escrow-123',
        status: 'escrowed',
        amount: 1000,
        ...mockEscrowPayment
      } as any)
      jest.mocked(require('@/lib/payments/escrow').escrowPaymentService.releasePayment).mockResolvedValue(mockReleasedPayment)
      jest.mocked(require('@/lib/prisma').prisma.engagement.update).mockResolvedValue(mockEscrowPayment.engagement as any)

      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'seeker-123',
        },
        body: JSON.stringify({
          transactionId: 'escrow-123',
          providerAccountId: 'acct_provider123',
        }),
      })

      const response = await releasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.escrowPayment.status).toBe('released')
      expect(data.escrowPayment.transferId).toBe('tr_test123')
      expect(data.message).toBe('Payment released successfully')
    })

    it('should reject if user not authorized to release payment', async () => {
      const mockEscrowPayment = {
        id: 'escrow-123',
        status: 'held',
        engagement: {
          status: 'completed',
          participants: [
            { userId: 'user-123', role: 'provider' },
          ],
        },
      }

      jest.mocked(require('@/lib/prisma').prisma.escrowPayment.findUnique).mockResolvedValue(mockEscrowPayment as any)

      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify({
          escrowPaymentId: 'escrow-123',
          userId: 'user-123',
        }),
      })

      const response = await releasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only the seeker can release payment')
    })

    it('should reject if engagement not completed', async () => {
      const mockEscrowPayment = {
        id: 'escrow-123',
        status: 'held',
        engagement: {
          status: 'active',
          participants: [
            { userId: 'user-123', role: 'seeker' },
          ],
        },
      }

      jest.mocked(require('@/lib/prisma').prisma.escrowPayment.findUnique).mockResolvedValue(mockEscrowPayment as any)

      const request = new NextRequest('http://localhost:3000/api/payments/release', {
        method: 'POST',
        body: JSON.stringify({
          escrowPaymentId: 'escrow-123',
          userId: 'user-123',
        }),
      })

      const response = await releasePayment(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Engagement must be completed to release payment')
    })
  })
})
