import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    talentRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    company: {
      findUnique: jest.fn()
    }
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

describe('/api/requests/talent-requests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/requests/talent-requests', () => {
    it('should return talent requests successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock talent requests
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findMany).mockResolvedValue([
        {
          id: 'req-123',
          title: 'React Developer Needed',
          description: 'We need a React developer',
          companyId: 'company-123',
          status: 'open',
          createdAt: new Date(),
          company: {
            id: 'company-123',
            name: 'Tech Corp'
          }
        }
      ])

      jest.mocked(require('@/lib/prisma').prisma.talentRequest.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/requests/talent-requests/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requests).toHaveLength(1)
      expect(data.requests[0].title).toBe('React Developer Needed')
    })

    it('should filter by experience level', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?experienceLevel=senior', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock talent requests
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findMany).mockResolvedValue([])
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.count).mockResolvedValue(0)

      const { GET } = await import('@/app/api/requests/talent-requests/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requests).toHaveLength(0)
    })
  })

  describe('POST /api/requests/talent-requests', () => {
    it('should create a new talent request', async () => {
      const validRequestData = {
        title: 'React Developer Needed',
        description: 'We need a React developer for our project',
        skills: ['React', 'TypeScript', 'Node.js'],
        experienceLevel: 'senior',
        budgetRange: {
          min: 5000,
          max: 10000
        },
        durationWeeks: 12,
        location: 'Remote'
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify(validRequestData)
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock company data
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        name: 'Tech Corp',
        status: 'approved'
      })

      // Mock talent request creation
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.create).mockResolvedValue({
        id: 'req-123',
        ...validRequestData,
        companyId: 'company-123',
        status: 'open',
        createdAt: new Date(),
        company: {
          id: 'company-123',
          name: 'Tech Corp'
        }
      })

      const { POST } = await import('@/app/api/requests/talent-requests/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.request.title).toBe(validRequestData.title)
      expect(require('@/lib/prisma').prisma.talentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: validRequestData.title,
            companyId: 'company-123'
          })
        })
      )
    })

    it('should validate required fields', async () => {
      const invalidRequestData = {
        title: '',
        description: ''
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify(invalidRequestData)
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      const { POST } = await import('@/app/api/requests/talent-requests/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })

    it('should validate skill requirements', async () => {
      const invalidRequestData = {
        title: 'React Developer',
        description: 'We need a React developer',
        skills: [] // Empty skills array
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify(invalidRequestData)
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      const { POST } = await import('@/app/api/requests/talent-requests/route')
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should validate budget range', async () => {
      const invalidRequestData = {
        title: 'React Developer',
        description: 'We need a React developer',
        skills: ['React'],
        budgetRange: {
          min: 10000,
          max: 5000 // Max less than min
        }
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify(invalidRequestData)
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      const { POST } = await import('@/app/api/requests/talent-requests/route')
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/requests/talent-requests/[id]', () => {
    it('should update an existing talent request', async () => {
      const updateData = {
        title: 'Updated React Developer Position',
        description: 'Updated description'
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/req-123', {
        method: 'PUT',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify(updateData)
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock existing talent request
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'req-123',
        companyId: 'company-123',
        status: 'open'
      })

      // Mock talent request update
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.update).mockResolvedValue({
        id: 'req-123',
        ...updateData,
        companyId: 'company-123',
        status: 'open',
        updatedAt: new Date()
      })

      const { PUT } = await import('@/app/api/requests/talent-requests/[id]/route')
      const response = await PUT(request, { params: { id: 'req-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.request.title).toBe(updateData.title)
      expect(require('@/lib/prisma').prisma.talentRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: expect.objectContaining(updateData)
      })
    })

    it('should handle non-existent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/nonexistent', {
        method: 'PUT',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({ title: 'Updated' })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock non-existent talent request
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/requests/talent-requests/[id]/route')
      const response = await PUT(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/requests/talent-requests/[id]', () => {
    it('should delete a talent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/req-123', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock existing talent request
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'req-123',
        companyId: 'company-123',
        status: 'open'
      })

      // Mock talent request deletion
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.delete).mockResolvedValue({
        id: 'req-123',
        companyId: 'company-123'
      })

      const { DELETE } = await import('@/app/api/requests/talent-requests/[id]/route')
      const response = await DELETE(request, { params: { id: 'req-123' } })

      expect(response.status).toBe(204)
      expect(require('@/lib/prisma').prisma.talentRequest.delete).toHaveBeenCalledWith({
        where: { id: 'req-123' }
      })
    })

    it('should handle deletion of non-existent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/nonexistent', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock non-existent talent request
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/requests/talent-requests/[id]/route')
      const response = await DELETE(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should only allow company users to create requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123'
        },
        body: JSON.stringify({
          title: 'React Developer',
          description: 'We need a React developer',
          skills: ['React']
        })
      })

      // Mock authenticated user (talent role)
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'talent'
      })

      const { POST } = await import('@/app/api/requests/talent-requests/route')
      const response = await POST(request)

      expect(response.status).toBe(403)
    })
  })
})
