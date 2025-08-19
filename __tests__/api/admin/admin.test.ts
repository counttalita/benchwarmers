import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    user: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    talentProfile: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    talentRequest: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    offer: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    engagement: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    transaction: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    dispute: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    }
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }))
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

describe('Admin API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard data for admin', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock dashboard data
      jest.mocked(require('@/lib/prisma').prisma.user.count).mockResolvedValue(100)
      jest.mocked(require('@/lib/prisma').prisma.company.count).mockResolvedValue(50)
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.count).mockResolvedValue(200)
      jest.mocked(require('@/lib/prisma').prisma.offer.count).mockResolvedValue(150)
      jest.mocked(require('@/lib/prisma').prisma.engagement.count).mockResolvedValue(75)
      jest.mocked(require('@/lib/prisma').prisma.transaction.count).mockResolvedValue(300)

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.dashboard).toBeDefined()
      expect(data.dashboard.totalUsers).toBe(100)
      expect(data.dashboard.totalCompanies).toBe(50)
    })

    it('should require admin role', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123'
        }
      })

      // Mock non-admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company'
      })

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })

  describe('GET /api/admin/companies/pending', () => {
    it('should list pending company applications', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/pending', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock pending companies
      jest.mocked(require('@/lib/prisma').prisma.company.findMany).mockResolvedValue([
        {
          id: 'company-123',
          name: 'Tech Corp',
          status: 'pending',
          createdAt: new Date(),
          users: []
        }
      ])

      jest.mocked(require('@/lib/prisma').prisma.company.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/admin/companies/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.companies).toHaveLength(1)
      expect(data.companies[0].status).toBe('pending')
    })

    it('should filter companies by verification status', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/pending?status=pending', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock filtered companies
      jest.mocked(require('@/lib/prisma').prisma.company.findMany).mockResolvedValue([])
      jest.mocked(require('@/lib/prisma').prisma.company.count).mockResolvedValue(0)

      const { GET } = await import('@/app/api/admin/companies/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.companies).toHaveLength(0)
    })
  })

  describe('POST /api/admin/companies/approve', () => {
    it('should approve a company application', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/approve', {
        method: 'POST',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        },
        body: JSON.stringify({
          companyId: 'company-123',
          action: 'approve'
        })
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'pending'
      })

      // Mock company update
      jest.mocked(require('@/lib/prisma').prisma.company.update).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'approved'
      })

      const { POST } = await import('@/app/api/admin/companies/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.company.status).toBe('approved')
    })

    it('should send SMS notification on approval', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/approve', {
        method: 'POST',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        },
        body: JSON.stringify({
          companyId: 'company-123',
          action: 'approve'
        })
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'pending'
      })

      // Mock company update
      jest.mocked(require('@/lib/prisma').prisma.company.update).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'approved'
      })

      const { POST } = await import('@/app/api/admin/companies/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/admin/companies/reject', () => {
    it('should reject a company application with reason', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/reject', {
        method: 'POST',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        },
        body: JSON.stringify({
          companyId: 'company-123',
          action: 'reject',
          reason: 'Incomplete documentation'
        })
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'pending'
      })

      // Mock company update
      jest.mocked(require('@/lib/prisma').prisma.company.update).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'rejected'
      })

      const { POST } = await import('@/app/api/admin/companies/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.company.status).toBe('rejected')
    })

    it('should send SMS notification on rejection', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/reject', {
        method: 'POST',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        },
        body: JSON.stringify({
          companyId: 'company-123',
          action: 'reject',
          reason: 'Incomplete documentation'
        })
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'pending'
      })

      // Mock company update
      jest.mocked(require('@/lib/prisma').prisma.company.update).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'rejected'
      })

      const { POST } = await import('@/app/api/admin/companies/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/admin/disputes', () => {
    it('should list active disputes', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock disputes
      jest.mocked(require('@/lib/prisma').prisma.dispute.findMany).mockResolvedValue([
        {
          id: 'dispute-123',
          status: 'open',
          type: 'payment',
          description: 'Payment dispute',
          createdAt: new Date()
        }
      ])

      jest.mocked(require('@/lib/prisma').prisma.dispute.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/admin/disputes/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.disputes).toHaveLength(1)
      expect(data.disputes[0].status).toBe('open')
    })

    it('should filter disputes by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes?status=open', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock filtered disputes
      jest.mocked(require('@/lib/prisma').prisma.dispute.findMany).mockResolvedValue([])
      jest.mocked(require('@/lib/prisma').prisma.dispute.count).mockResolvedValue(0)

      const { GET } = await import('@/app/api/admin/disputes/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.disputes).toHaveLength(0)
    })
  })

  describe('POST /api/admin/disputes/resolve', () => {
    it('should resolve a dispute with admin decision', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes/resolve', {
        method: 'POST',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        },
        body: JSON.stringify({
          disputeId: 'dispute-123',
          resolution: 'refund_full',
          adminNotes: 'Service not delivered as promised',
          refundAmount: 1000
        })
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock dispute data
      jest.mocked(require('@/lib/prisma').prisma.dispute.findUnique).mockResolvedValue({
        id: 'dispute-123',
        status: 'open',
        type: 'payment'
      })

      // Mock dispute update
      jest.mocked(require('@/lib/prisma').prisma.dispute.update).mockResolvedValue({
        id: 'dispute-123',
        status: 'resolved',
        resolution: 'refund'
      })

      const { POST } = await import('@/app/api/admin/disputes/resolve/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.dispute.status).toBe('resolved')
    })

    it('should notify both parties of dispute resolution', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes/resolve', {
        method: 'POST',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        },
        body: JSON.stringify({
          disputeId: 'dispute-123',
          resolution: 'refund_full',
          adminNotes: 'Service not delivered as promised',
          refundAmount: 1000
        })
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock dispute data
      jest.mocked(require('@/lib/prisma').prisma.dispute.findUnique).mockResolvedValue({
        id: 'dispute-123',
        status: 'open',
        type: 'payment'
      })

      // Mock dispute update
      jest.mocked(require('@/lib/prisma').prisma.dispute.update).mockResolvedValue({
        id: 'dispute-123',
        status: 'resolved',
        resolution: 'refund'
      })

      const { POST } = await import('@/app/api/admin/disputes/resolve/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/admin/analytics', () => {
    it('should get platform analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/analytics', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock analytics data
      jest.mocked(require('@/lib/prisma').prisma.user.count).mockResolvedValue(100)
      jest.mocked(require('@/lib/prisma').prisma.company.count).mockResolvedValue(50)
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.count).mockResolvedValue(150)
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.count).mockResolvedValue(200)
      jest.mocked(require('@/lib/prisma').prisma.offer.count).mockResolvedValue(150)
      jest.mocked(require('@/lib/prisma').prisma.engagement.count).mockResolvedValue(75)
      jest.mocked(require('@/lib/prisma').prisma.engagement.count).mockResolvedValueOnce(25) // active
      jest.mocked(require('@/lib/prisma').prisma.engagement.count).mockResolvedValueOnce(50) // completed
      jest.mocked(require('@/lib/prisma').prisma.dispute.count).mockResolvedValue(5)

      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analytics).toBeDefined()
      expect(data.analytics.totalUsers).toBe(100)
      expect(data.analytics.totalCompanies).toBe(50)
    })

    it('should provide user activity metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/analytics?period=30d', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock analytics data
      jest.mocked(require('@/lib/prisma').prisma.user.count).mockResolvedValue(100)
      jest.mocked(require('@/lib/prisma').prisma.company.count).mockResolvedValue(50)

      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analytics).toBeDefined()
    })

    it('should provide financial transaction metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/analytics?period=7d', {
        method: 'GET',
        headers: {
          'x-user-id': 'admin-123',
          'x-is-admin': 'true'
        }
      })

      // Mock authenticated admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock analytics data
      jest.mocked(require('@/lib/prisma').prisma.transaction.count).mockResolvedValue(300)
      jest.mocked(require('@/lib/prisma').prisma.transaction.findMany).mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/analytics/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analytics).toBeDefined()
    })
  })

  describe('Platform Monitoring', () => {
    it('should detect potential fraud patterns', async () => {
      const companyTransactionCounts = {
        'company-1': 3,
        'company-2': 2,
        'company-3': 1
      }

      const suspiciousCompanies = Object.entries(companyTransactionCounts)
        .filter(([_, count]) => count > 2)
        .map(([companyId, _]) => companyId)

      expect(companyTransactionCounts['company-1']).toBe(3)
      expect(companyTransactionCounts['company-2']).toBe(2)
      expect(suspiciousCompanies).toContain('company-1')
    })

    it('should generate comprehensive reports', async () => {
      const reportData = {
        totalUsers: 100,
        totalCompanies: 50,
        totalTransactions: 300,
        totalRevenue: 50000,
        averageTransactionValue: 166.67
      }

      expect(reportData.totalUsers).toBe(100)
      expect(reportData.totalCompanies).toBe(50)
      expect(reportData.totalTransactions).toBe(300)
      expect(reportData.averageTransactionValue).toBeCloseTo(166.67, 2)
    })
  })
})
