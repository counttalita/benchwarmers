import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/requests/talent-requests/route'
import { PUT, DELETE } from '@/app/api/requests/talent-requests/[id]/route'
import { prisma } from '@/lib/prisma'

// Mock the prisma module
jest.mock('@/lib/prisma')

describe('/api/requests/talent-requests', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/requests/talent-requests', () => {
    const mockTalentRequests = [
      {
        id: 'req-1',
        companyId: 'company-1',
        title: 'Senior React Developer',
        description: 'Looking for experienced React developer',
        budget: 5000,
        duration: 30,
        skillsRequired: ['React', 'TypeScript'],
        experienceLevel: 'senior',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'company-1',
          name: 'Tech Corp',
          email: 'contact@techcorp.com'
        }
      }
    ]

    it('should return all talent requests', async () => {
      mockPrisma.talentRequest.findMany.mockResolvedValue(mockTalentRequests as any)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(1)
      expect(data.requests[0].title).toBe('Senior React Developer')
    })

    it('should filter by status', async () => {
      mockPrisma.talentRequest.findMany.mockResolvedValue(mockTalentRequests as any)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?status=active')
      const response = await GET(request)

      expect(mockPrisma.talentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' })
        })
      )
    })

    it('should filter by experience level', async () => {
      mockPrisma.talentRequest.findMany.mockResolvedValue(mockTalentRequests as any)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?experienceLevel=senior')
      const response = await GET(request)

      expect(mockPrisma.talentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ experienceLevel: 'senior' })
        })
      )
    })

    it('should handle pagination', async () => {
      mockPrisma.talentRequest.findMany.mockResolvedValue(mockTalentRequests as any)
      mockPrisma.talentRequest.count.mockResolvedValue(25)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?page=2&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(mockPrisma.talentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      )
      expect(data.pagination.totalPages).toBe(3)
    })

    it('should handle database errors', async () => {
      mockPrisma.talentRequest.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/requests/talent-requests', () => {
    const validRequestData = {
      title: 'Senior React Developer',
      description: 'Looking for experienced React developer',
      budget: 5000,
      duration: 30,
      skillsRequired: ['React', 'TypeScript'],
      experienceLevel: 'senior',
      projectType: 'contract',
      urgency: 'medium',
      location: 'Remote'
    }

    it('should create a new talent request', async () => {
      const mockCreatedRequest = {
        id: 'req-123',
        companyId: 'company-1',
        ...validRequestData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.talentRequest.create.mockResolvedValue(mockCreatedRequest as any)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify(validRequestData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.request.title).toBe(validRequestData.title)
      expect(mockPrisma.talentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: validRequestData.title,
            description: validRequestData.description
          })
        })
      )
    })

    it('should validate required fields', async () => {
      const invalidData = {
        title: '',
        description: 'Missing title'
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })

    it('should validate skill requirements', async () => {
      const invalidData = {
        ...validRequestData,
        skillsRequired: []
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should validate budget range', async () => {
      const invalidData = {
        ...validRequestData,
        budget: -1000
      }

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/requests/talent-requests/[id]', () => {
    const updateData = {
      title: 'Updated React Developer Position',
      budget: 6000,
      status: 'paused'
    }

    it('should update an existing talent request', async () => {
      const mockUpdatedRequest = {
        id: 'req-123',
        ...updateData,
        updatedAt: new Date()
      }

      mockPrisma.talentRequest.update.mockResolvedValue(mockUpdatedRequest as any)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/req-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, { params: { id: 'req-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.request.title).toBe(updateData.title)
      expect(mockPrisma.talentRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: expect.objectContaining(updateData)
      })
    })

    it('should handle non-existent request', async () => {
      mockPrisma.talentRequest.update.mockRejectedValue(new Error('Record not found'))

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/nonexistent', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/requests/talent-requests/[id]', () => {
    it('should delete a talent request', async () => {
      mockPrisma.talentRequest.delete.mockResolvedValue({ id: 'req-123' } as any)

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/req-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'req-123' } })

      expect(response.status).toBe(204)
      expect(mockPrisma.talentRequest.delete).toHaveBeenCalledWith({
        where: { id: 'req-123' }
      })
    })

    it('should handle deletion of non-existent request', async () => {
      mockPrisma.talentRequest.delete.mockRejectedValue(new Error('Record not found'))

      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/nonexistent', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for POST requests', async () => {
      // Mock unauthenticated request
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should only allow company users to create requests', async () => {
      // Mock authenticated but non-company user
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer talent-user-token'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })
  })
})
