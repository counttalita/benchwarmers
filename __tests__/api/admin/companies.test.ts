import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getCompanies, POST as companyAction } from '@/app/api/admin/companies/route'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma')
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Admin Companies API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/companies', () => {
    it('should return pending companies by default', async () => {
      const mockCompanies = [
        {
          id: 'company-1',
          name: 'Pending Company',
          status: 'pending',
          _count: {
            users: 1,
            talentRequests: 0
          }
        }
      ]

      mockPrisma.company.findMany.mockResolvedValue(mockCompanies as any)
      mockPrisma.company.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/admin/companies')

      const response = await getCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.companies).toHaveLength(1)
      expect(data.companies[0].name).toBe('Pending Company')
      expect(data.companies[0].status).toBe('pending')
      expect(data.pagination.totalCount).toBe(1)
    })

    it('should filter companies by status', async () => {
      const mockCompanies = [
        {
          id: 'company-2',
          name: 'Active Company',
          status: 'active',
          _count: {
            users: 1,
            talentRequests: 0
          }
        }
      ]

      mockPrisma.company.findMany.mockResolvedValue(mockCompanies as any)
      mockPrisma.company.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/admin/companies?status=active')

      const response = await getCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.companies).toHaveLength(1)
      expect(data.companies[0].name).toBe('Active Company')
      expect(data.companies[0].status).toBe('active')
    })

    it('should handle pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies?page=1&limit=1')

      const response = await getCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.companies).toHaveLength(1)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(1)
      expect(data.pagination.totalCount).toBe(1)
    })

    it('should return empty list for non-existent status', async () => {
      mockPrisma.company.findMany.mockResolvedValue([])
      mockPrisma.company.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/admin/companies?status=nonexistent')

      const response = await getCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.companies).toHaveLength(0)
      expect(data.pagination.totalCount).toBe(0)
    })
  })

  describe('POST /api/admin/companies', () => {
    it('should approve a pending company', async () => {
      const mockCompany = {
        id: 'company-1',
        name: 'Pending Company',
        status: 'pending'
      }

      const mockUpdatedCompany = {
        ...mockCompany,
        status: 'active',
        verifiedAt: new Date()
      }

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany as any)
      mockPrisma.company.update.mockResolvedValue(mockUpdatedCompany as any)

      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-1',
          action: 'approve',
          notes: 'Company approved by admin'
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await companyAction(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Company approved successfully')
      expect(data.company.status).toBe('active')
      expect(data.company.verifiedAt).toBeTruthy()
    })

    it('should reject a pending company', async () => {
      const mockCompany = {
        id: 'company-1',
        name: 'Pending Company',
        status: 'pending'
      }

      const mockUpdatedCompany = {
        ...mockCompany,
        status: 'suspended',
        rejectionReason: 'Invalid business documentation'
      }

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany as any)
      mockPrisma.company.update.mockResolvedValue(mockUpdatedCompany as any)

      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-1',
          action: 'reject',
          notes: 'Company rejected by admin',
          rejectionReason: 'Invalid business documentation'
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await companyAction(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Company rejected successfully')
      expect(data.company.status).toBe('suspended')
      expect(data.company.rejectionReason).toBe('Invalid business documentation')
    })

    it('should reject action on non-pending company', async () => {
      const mockCompany = {
        id: 'company-2',
        name: 'Active Company',
        status: 'active'
      }

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany as any)

      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'company-2',
          action: 'approve',
          notes: 'Trying to approve active company'
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await companyAction(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Company is not pending approval')
    })

    it('should reject action on non-existent company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'non-existent-id',
          action: 'approve',
          notes: 'Trying to approve non-existent company'
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await companyAction(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Company not found')
    })

    it('should validate input data', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: 'invalid-id',
          action: 'invalid-action'
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await companyAction(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Action must be either approve or reject')
    })
  })
})