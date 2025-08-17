import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createConnectAccount, GET as getConnectStatus } from '@/app/api/payments/connect/route'

// Mock Stripe Connect service
jest.mock('@/lib/stripe/connect', () => ({
  stripeConnectService: {
    createConnectAccount: jest.fn(),
    createOnboardingLink: jest.fn(),
    getAccountStatus: jest.fn(),
  },
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('Stripe Connect API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/payments/connect', () => {
    it('should create Stripe Connect account for company', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        email: 'test@company.com',
        country: 'US',
        users: [{ email: 'admin@company.com' }],
        stripeConnectAccountId: null,
      }

      const mockConnectAccount = {
        id: 'acct_test123',
        business_type: 'company',
        charges_enabled: false,
        payouts_enabled: false,
        requirements: {
          currently_due: ['business_profile.url'],
          eventually_due: ['business_profile.url'],
          past_due: [],
        },
        capabilities: {
          card_payments: 'inactive',
          transfers: 'inactive',
        },
      }

      const mockOnboarding = {
        accountId: 'acct_test123',
        onboardingUrl: 'https://connect.stripe.com/setup/s/test',
        requirements: ['business_profile.url'],
      }

      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue(mockCompany as any)
      jest.mocked(require('@/lib/stripe/connect').stripeConnectService.createConnectAccount).mockResolvedValue(mockConnectAccount)
      jest.mocked(require('@/lib/stripe/connect').stripeConnectService.createOnboardingLink).mockResolvedValue(mockOnboarding)
      jest.mocked(require('@/lib/prisma').prisma.company.update).mockResolvedValue(mockCompany as any)

      const request = new NextRequest('http://localhost:3000/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-123',
          businessType: 'company',
        }),
      })

      const response = await createConnectAccount(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.account.id).toBe('acct_test123')
      expect(data.onboarding.onboardingUrl).toContain('connect.stripe.com')
      expect(data.message).toBe('Payment account created successfully')
    })

    it('should reject request without company ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          businessType: 'company',
        }),
      })

      const response = await createConnectAccount(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Company ID is required')
    })

    it('should reject if company not found', async () => {
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'nonexistent-company',
          businessType: 'company',
        }),
      })

      const response = await createConnectAccount(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Company not found')
    })

    it('should reject if company already has Connect account', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        stripeConnectAccountId: 'acct_existing123',
      }

      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue(mockCompany as any)

      const request = new NextRequest('http://localhost:3000/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-123',
          businessType: 'company',
        }),
      })

      const response = await createConnectAccount(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Company already has a payment account')
    })
  })

  describe('GET /api/payments/connect', () => {
    it('should return Connect account status', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        stripeConnectAccountId: 'acct_test123',
        stripeConnectStatus: 'active',
      }

      const mockAccountStatus = {
        id: 'acct_test123',
        business_type: 'company',
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
        },
        capabilities: {
          card_payments: 'active',
          transfers: 'active',
        },
      }

      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue(mockCompany as any)
      jest.mocked(require('@/lib/stripe/connect').stripeConnectService.getAccountStatus).mockResolvedValue(mockAccountStatus)

      const request = new NextRequest('http://localhost:3000/api/payments/connect?companyId=company-123')

      const response = await getConnectStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hasAccount).toBe(true)
      expect(data.account.id).toBe('acct_test123')
      expect(data.account.charges_enabled).toBe(true)
      expect(data.status).toBe('active')
    })

    it('should return not_setup status when no Connect account', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        stripeConnectAccountId: null,
        stripeConnectStatus: null,
      }

      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue(mockCompany as any)

      const request = new NextRequest('http://localhost:3000/api/payments/connect?companyId=company-123')

      const response = await getConnectStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hasAccount).toBe(false)
      expect(data.status).toBe('not_setup')
    })

    it('should reject request without company ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/connect')

      const response = await getConnectStatus(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Company ID is required')
    })

    it('should reject if company not found', async () => {
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments/connect?companyId=nonexistent-company')

      const response = await getConnectStatus(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Company not found')
    })
  })
})
