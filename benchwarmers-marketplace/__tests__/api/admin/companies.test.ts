import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getCompanies, POST as companyAction } from '@/app/api/admin/companies/route'
import { prisma } from '@/lib/prisma'
import { createTestCompany, createTestUser, cleanupTestData } from '@/test/helpers/test-helpers'

describe('Admin Companies API', () => {
  let pendingCompany: any
  let activeCompany: any
  let suspendedCompany: any

  beforeEach(async () => {
    // Create test companies in different states
    pendingCompany = await createTestCompany({
      name: 'Pending Company',
      domain: 'pending.com',
      type: 'provider',
      status: 'pending',
      domainVerified: true,
    })

    activeCompany = await createTestCompany({
      name: 'Active Company',
      domain: 'active.com',
      type: 'seeker',
      status: 'active',
      domainVerified: true,
    })

    suspendedCompany = await createTestCompany({
      name: 'Suspended Company',
      domain: 'suspended.com',
      type: 'both',
      status: 'suspended',
      domainVerified: true,
    })

    // Create admin users for each company
    await createTestUser({
      companyId: pendingCompany.id,
      name: 'Pending Admin',
      email: 'admin@pending.com',
      phoneNumber: '+1234567890',
      role: 'admin',
    })

    await createTestUser({
      companyId: activeCompany.id,
      name: 'Active Admin',
      email: 'admin@active.com',
      phoneNumber: '+1234567891',
      role: 'admin',
    })

    await createTestUser({
      companyId: suspendedCompany.id,
      name: 'Suspended Admin',
      email: 'admin@suspended.com',
      phoneNumber: '+1234567892',
      role: 'admin',
    })
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('GET /api/admin/companies', () => {
    it('should return pending companies by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies')

      const response = await getCompanies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.companies).toHaveLength(1)
      expect(data.companies[0].name).toBe('Pending Company')
      expect(data.companies[0].status).toBe('pending')
      expect(data.companies[0].users).toHaveLength(1)
      expect(data.pagination.totalCount).toBe(1)
    })

    it('should filter companies by status', async () => {
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
      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: pendingCompany.id,
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

      // Verify database was updated
      const updatedCompany = await prisma.company.findUnique({
        where: { id: pendingCompany.id }
      })
      expect(updatedCompany?.status).toBe('active')
      expect(updatedCompany?.verifiedAt).toBeTruthy()
      expect(updatedCompany?.adminNotes).toBe('Company approved by admin')
    })

    it('should reject a pending company', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: pendingCompany.id,
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

      // Verify database was updated
      const updatedCompany = await prisma.company.findUnique({
        where: { id: pendingCompany.id }
      })
      expect(updatedCompany?.status).toBe('suspended')
      expect(updatedCompany?.rejectionReason).toBe('Invalid business documentation')
      expect(updatedCompany?.adminNotes).toBe('Company rejected by admin')
    })

    it('should reject action on non-pending company', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          companyId: activeCompany.id,
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
      expect(data.error).toBe('Invalid input data')
      expect(data.details).toBeTruthy()
    })
  })
})