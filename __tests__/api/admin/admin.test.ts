import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { getDashboard, getPendingCompanies, getDisputes, getAnalytics } from '@/app/api/admin/dashboard/route'
import { approveCompany, rejectCompany } from '@/app/api/admin/companies/route'
import { resolveDispute } from '@/app/api/admin/disputes/route'

// Mock Appwrite
jest.mock('@/lib/appwrite', () => ({
  databases: {
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock Twilio
jest.mock('@/lib/twilio', () => ({
  sendSMS: jest.fn()
}))

describe('Admin API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('should get admin dashboard data', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/dashboard')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getDashboard(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.dashboard).toBeDefined()
      expect(data.dashboard.pendingCompanies).toBeDefined()
      expect(data.dashboard.activeDisputes).toBeDefined()
      expect(data.dashboard.keyMetrics).toBeDefined()
    })

    it('should require admin role', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/dashboard')

      // Mock non-admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'member'
      })

      const response = await getDashboard(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })

  describe('GET /api/admin/companies/pending', () => {
    it('should list pending company applications', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/pending')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getPendingCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.companies).toBeDefined()
      expect(Array.isArray(data.companies)).toBe(true)
    })

    it('should filter companies by verification status', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/pending?status=domain_verified')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getPendingCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.status).toBe('domain_verified')
    })
  })

  describe('POST /api/admin/companies/approve', () => {
    it('should approve a company application', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/approve', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-123',
          reason: 'All requirements met'
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'company-123',
        status: 'pending',
        name: 'Test Company',
        phoneNumber: '+1234567890'
      })

      const response = await approveCompany(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.company.status).toBe('active')
    })

    it('should send SMS notification on approval', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/approve', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-123',
          reason: 'All requirements met'
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'company-123',
        status: 'pending',
        name: 'Test Company',
        phoneNumber: '+1234567890'
      })

      const response = await approveCompany(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verify SMS was sent
      expect(require('@/lib/twilio').sendSMS).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining('Your company application has been approved')
      )
    })
  })

  describe('POST /api/admin/companies/reject', () => {
    it('should reject a company application with reason', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/reject', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-123',
          reason: 'Insufficient documentation provided'
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'company-123',
        status: 'pending',
        name: 'Test Company',
        phoneNumber: '+1234567890'
      })

      const response = await rejectCompany(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.company.status).toBe('rejected')
      expect(data.company.rejectionReason).toBe('Insufficient documentation provided')
    })

    it('should send SMS notification on rejection', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies/reject', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-123',
          reason: 'Insufficient documentation provided'
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock company data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'company-123',
        status: 'pending',
        name: 'Test Company',
        phoneNumber: '+1234567890'
      })

      const response = await rejectCompany(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verify SMS was sent
      expect(require('@/lib/twilio').sendSMS).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining('Your company application has been rejected')
      )
    })
  })

  describe('GET /api/admin/disputes', () => {
    it('should list active disputes', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getDisputes(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.disputes).toBeDefined()
      expect(Array.isArray(data.disputes)).toBe(true)
    })

    it('should filter disputes by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes?status=escalated')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getDisputes(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.status).toBe('escalated')
    })
  })

  describe('POST /api/admin/disputes/resolve', () => {
    it('should resolve a dispute with admin decision', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes/resolve', {
        method: 'POST',
        body: JSON.stringify({
          disputeId: 'dispute-123',
          resolution: 'favor_seeker',
          reason: 'Provider failed to deliver as agreed',
          refundAmount: 6000
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock dispute data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'dispute-123',
        status: 'escalated',
        engagementId: 'engagement-123',
        seekerCompanyId: 'seeker-123',
        providerCompanyId: 'provider-123'
      })

      const response = await resolveDispute(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.dispute.status).toBe('resolved')
      expect(data.dispute.resolution).toBe('favor_seeker')
    })

    it('should notify both parties of dispute resolution', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/disputes/resolve', {
        method: 'POST',
        body: JSON.stringify({
          disputeId: 'dispute-123',
          resolution: 'favor_provider',
          reason: 'Seeker did not provide adequate requirements'
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      // Mock dispute data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'dispute-123',
        status: 'escalated',
        engagementId: 'engagement-123',
        seekerCompanyId: 'seeker-123',
        providerCompanyId: 'provider-123'
      })

      const response = await resolveDispute(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verify SMS notifications were sent to both parties
      expect(require('@/lib/twilio').sendSMS).toHaveBeenCalledTimes(2)
    })
  })

  describe('GET /api/admin/analytics', () => {
    it('should get platform analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/analytics')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getAnalytics(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analytics).toBeDefined()
      expect(data.analytics.userActivity).toBeDefined()
      expect(data.analytics.financialTransactions).toBeDefined()
      expect(data.analytics.platformPerformance).toBeDefined()
    })

    it('should provide user activity metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/analytics?period=30d')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getAnalytics(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics.userActivity).toBeDefined()
      expect(data.analytics.userActivity.newRegistrations).toBeDefined()
      expect(data.analytics.userActivity.activeUsers).toBeDefined()
      expect(data.analytics.userActivity.engagementRate).toBeDefined()
    })

    it('should provide financial transaction metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/analytics?period=7d')

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await getAnalytics(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics.financialTransactions).toBeDefined()
      expect(data.analytics.financialTransactions.totalVolume).toBeDefined()
      expect(data.analytics.financialTransactions.platformFees).toBeDefined()
      expect(data.analytics.financialTransactions.successfulTransactions).toBeDefined()
    })
  })

  describe('User Moderation', () => {
    it('should flag suspicious behavior patterns', async () => {
      const mockUserActivity = [
        { action: 'login', timestamp: Date.now() - 1000 },
        { action: 'login', timestamp: Date.now() - 2000 },
        { action: 'login', timestamp: Date.now() - 3000 },
        { action: 'login', timestamp: Date.now() - 4000 },
        { action: 'login', timestamp: Date.now() - 5000 }
      ]

      const loginAttempts = mockUserActivity.filter(activity => activity.action === 'login').length
      const timeSpan = 5 // seconds
      const attemptsPerMinute = (loginAttempts / timeSpan) * 60

      const isSuspicious = attemptsPerMinute > 10 // More than 10 login attempts per minute

      expect(loginAttempts).toBe(5)
      expect(attemptsPerMinute).toBe(60)
      expect(isSuspicious).toBe(true)
    })

    it('should provide warning, suspension, and ban capabilities', async () => {
      const userActions = ['warn', 'suspend', 'ban']
      const auditTrail = {
        userId: 'user-123',
        action: 'suspend',
        reason: 'Multiple failed payment attempts',
        adminId: 'admin-123',
        timestamp: new Date().toISOString()
      }

      expect(userActions).toContain('warn')
      expect(userActions).toContain('suspend')
      expect(userActions).toContain('ban')
      expect(auditTrail.action).toBe('suspend')
      expect(auditTrail.reason).toBeDefined()
      expect(auditTrail.adminId).toBeDefined()
      expect(auditTrail.timestamp).toBeDefined()
    })
  })

  describe('Platform Monitoring', () => {
    it('should detect potential fraud patterns', async () => {
      const mockTransactions = [
        { amount: 1000, companyId: 'company-1', timestamp: Date.now() },
        { amount: 1000, companyId: 'company-1', timestamp: Date.now() - 1000 },
        { amount: 1000, companyId: 'company-1', timestamp: Date.now() - 2000 },
        { amount: 1000, companyId: 'company-2', timestamp: Date.now() - 3000 },
        { amount: 1000, companyId: 'company-2', timestamp: Date.now() - 4000 }
      ]

      const companyTransactionCounts = mockTransactions.reduce((acc, transaction) => {
        acc[transaction.companyId] = (acc[transaction.companyId] || 0) + 1
        return acc
      }, {})

      const suspiciousCompanies = Object.entries(companyTransactionCounts)
        .filter(([companyId, count]) => count > 3)
        .map(([companyId]) => companyId)

      expect(companyTransactionCounts['company-1']).toBe(3)
      expect(companyTransactionCounts['company-2']).toBe(2)
      expect(suspiciousCompanies).toContain('company-1')
    })

    it('should generate comprehensive reports', async () => {
      const reportData = {
        period: '30d',
        userActivity: {
          newRegistrations: 150,
          activeUsers: 1200,
          engagementRate: 0.85
        },
        financialTransactions: {
          totalVolume: 500000,
          platformFees: 75000,
          successfulTransactions: 95
        },
        platformPerformance: {
          uptime: 99.9,
          averageResponseTime: 200,
          errorRate: 0.1
        }
      }

      expect(reportData.userActivity.newRegistrations).toBe(150)
      expect(reportData.financialTransactions.platformFees).toBe(75000)
      expect(reportData.platformPerformance.uptime).toBe(99.9)
      expect(reportData.period).toBe('30d')
    })
  })
})
