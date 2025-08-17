import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createRequest, GET as listRequests } from '@/app/api/requests/talent-requests/route'
import { GET as getRequest, PUT as updateRequest } from '@/app/api/requests/talent-requests/[id]/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    talentRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    company: {
      findUnique: jest.fn()
    },
    talentProfile: {
      findMany: jest.fn()
    }
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock matching algorithm
jest.mock('@/lib/matching/matching-engine', () => ({
  MatchingEngine: jest.fn().mockImplementation(() => ({
    findMatches: jest.fn()
  }))
}))

describe('Talent Requests API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/requests/talent-requests', () => {
    it('should create a talent request with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Senior React Developer Needed',
          description: 'Looking for experienced React developer for 3-month project',
          requiredSkills: [
            { name: 'React', level: 'senior', priority: 'required' },
            { name: 'TypeScript', level: 'senior', priority: 'required' },
            { name: 'Node.js', level: 'senior', priority: 'required' }
          ],
          budget: { min: 80, max: 120, currency: 'USD' },
          duration: { value: 12, unit: 'weeks' },
          startDate: '2024-02-01T00:00:00Z',
          location: 'Remote',
          remotePreference: 'remote'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        type: 'seeker'
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.talentRequest.create).mockResolvedValue({
        id: 'request-123',
        title: 'Senior React Developer Needed',
        status: 'open'
      } as any)

      const response = await createRequest(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.request).toBeDefined()
      expect(data.request.title).toBe('Senior React Developer Needed')
      expect(data.request.status).toBe('open')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: '',
          description: '',
          requiredSkills: []
        })
      })

      const response = await createRequest(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.details).toBeDefined()
    })

    it('should validate budget range', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Developer Needed',
          description: 'Test description',
          requiredSkills: [{ name: 'JavaScript', level: 'mid', priority: 'required' }],
          budget: { min: 120, max: 80, currency: 'USD' }, // Max less than min
          duration: { value: 4, unit: 'weeks' },
          startDate: '2024-02-01T00:00:00Z',
          location: 'Remote',
          remotePreference: 'remote'
        })
      })

      const response = await createRequest(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Maximum budget must be greater than minimum budget')
    })

    it('should require seeker company type', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Developer Needed',
          description: 'Test description',
          requiredSkills: [{ name: 'JavaScript', level: 'mid', priority: 'required' }],
          budget: { min: 80, max: 120, currency: 'USD' },
          duration: { value: 4, unit: 'weeks' },
          startDate: '2024-02-01T00:00:00Z',
          location: 'Remote',
          remotePreference: 'remote'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        type: 'provider'
      } as any)

      const response = await createRequest(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only seeker companies can create talent requests')
    })
  })

  describe('GET /api/requests/talent-requests', () => {
    it('should list talent requests with filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?skills=React&location=Remote&status=open')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findMany).mockResolvedValue([
        { id: 'request-1', title: 'React Developer', company: { id: 'company-1', name: 'Company 1' } }
      ] as any)
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.count).mockResolvedValue(1)

      const response = await listRequests(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requests).toBeDefined()
      expect(Array.isArray(data.requests)).toBe(true)
    })

    it('should paginate results', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?page=2&limit=10')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findMany).mockResolvedValue([
        { id: 'request-2', title: 'Developer 2', company: { id: 'company-2', name: 'Company 2' } }
      ] as any)
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.count).mockResolvedValue(15)

      const response = await listRequests(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
    })
  })

  describe('GET /api/requests/talent-requests/[id]', () => {
    it('should get a specific talent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/request-123')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        title: 'Senior React Developer Needed',
        status: 'open',
        company: { id: 'company-123', name: 'Test Company' },
        matches: []
      } as any)

      const response = await getRequest(request, { params: { id: 'request-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.request.title).toBe('Senior React Developer Needed')
    })

    it('should return 404 for non-existent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/non-existent')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue(null)

      const response = await getRequest(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Talent request not found')
    })
  })

  describe('PUT /api/requests/talent-requests/[id]', () => {
    it('should update a talent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/request-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Updated Title',
          budgetMax: 150
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        companyId: 'company-123',
        status: 'open',
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.talentRequest.update).mockResolvedValue({
        id: 'request-123',
        title: 'Updated Title',
        status: 'open'
      } as any)

      const response = await updateRequest(request, { params: { id: 'request-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.request.title).toBe('Updated Title')
    })

    it('should prevent updating closed requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/request-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Updated Title'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        companyId: 'company-123',
        status: 'closed',
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      const response = await updateRequest(request, { params: { id: 'request-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot update closed requests')
    })
  })

  describe('POST /api/requests/matching', () => {
    it('should run matching algorithm for a request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/matching', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          requestId: 'request-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        title: 'Test Request',
        requiredSkills: [{ name: 'React', level: 'senior', priority: 'required' }],
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findMany).mockResolvedValue([
        { id: 'profile-1', company: { id: 'company-1', name: 'Provider 1' } },
        { id: 'profile-2', company: { id: 'company-2', name: 'Provider 2' } }
      ] as any)

      const { POST: runMatching } = require('@/app/api/requests/matching/route')
      const response = await runMatching(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.matches).toHaveLength(2)
      expect(data.matches[0].profileId).toBe('profile-1')
      expect(data.matches[0].score).toBe(0.9)
    })

    it('should handle no matches found', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/matching', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          requestId: 'request-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        title: 'Test Request',
        requiredSkills: [{ name: 'React', level: 'senior', priority: 'required' }],
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findMany).mockResolvedValue([])

      const { POST: runMatching } = require('@/app/api/requests/matching/route')
      const response = await runMatching(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.matches).toHaveLength(0)
      expect(data.message).toBe('No matching profiles found')
    })
  })
})

