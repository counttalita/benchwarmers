import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { createRequest, getRequest, listRequests, updateRequest } from '@/app/api/requests/talent-requests/route'
import { runMatching } from '@/app/api/requests/matching/route'

// Mock Appwrite
jest.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock matching algorithm
jest.mock('@/lib/matching', () => ({
  findMatches: jest.fn()
}))

describe('Talent Requests API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/requests/talent-requests', () => {
    it('should create a talent request with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Senior React Developer Needed',
          description: 'Looking for experienced React developer for 3-month project',
          requiredSkills: ['React', 'TypeScript', 'Node.js'],
          preferredSkills: ['GraphQL', 'AWS'],
          budgetMin: 80,
          budgetMax: 120,
          currency: 'USD',
          startDate: '2024-02-01',
          durationWeeks: 12,
          locationPreference: 'Remote'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

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
        body: JSON.stringify({
          title: '',
          description: '',
          requiredSkills: []
        })
      })

      const response = await createRequest(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.title).toBe('Title is required')
      expect(data.errors.description).toBe('Description is required')
      expect(data.errors.requiredSkills).toBe('At least one required skill is needed')
    })

    it('should validate budget range', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Developer Needed',
          description: 'Test description',
          requiredSkills: ['JavaScript'],
          budgetMin: 120,
          budgetMax: 80, // Max less than min
          startDate: '2024-02-01',
          durationWeeks: 4,
          locationPreference: 'Remote'
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
        body: JSON.stringify({
          title: 'Developer Needed',
          description: 'Test description',
          requiredSkills: ['JavaScript'],
          startDate: '2024-02-01',
          durationWeeks: 4,
          locationPreference: 'Remote'
        })
      })

      // Mock provider company user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock company as provider only
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'company-123',
        type: 'provider'
      })

      const response = await createRequest(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only talent seekers can create requests')
    })
  })

  describe('GET /api/requests/talent-requests', () => {
    it('should list talent requests with filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?skills=React&location=Remote&status=open')

      const response = await listRequests(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requests).toBeDefined()
      expect(Array.isArray(data.requests)).toBe(true)
    })

    it('should paginate results', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests?page=2&limit=10')

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

      // Mock existing request
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'request-123',
        title: 'Senior React Developer Needed',
        status: 'open'
      })

      const response = await getRequest(request, { params: { id: 'request-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.request.title).toBe('Senior React Developer Needed')
    })

    it('should return 404 for non-existent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/non-existent')

      // Mock non-existent request
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockRejectedValue(new Error('Not found'))

      const response = await getRequest(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Request not found')
    })
  })

  describe('PUT /api/requests/talent-requests/[id]', () => {
    it('should update a talent request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/request-123', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Title',
          budgetMax: 150
        })
      })

      // Mock authenticated user and existing request
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'request-123',
        companyId: 'company-123',
        status: 'open'
      })

      const response = await updateRequest(request, { params: { id: 'request-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.request.title).toBe('Updated Title')
    })

    it('should prevent updating closed requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests/request-123', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Title'
        })
      })

      // Mock authenticated user and closed request
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'request-123',
        companyId: 'company-123',
        status: 'closed'
      })

      const response = await updateRequest(request, { params: { id: 'request-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot update closed request')
    })
  })

  describe('POST /api/requests/matching', () => {
    it('should run matching algorithm for a request', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/matching', {
        method: 'POST',
        body: JSON.stringify({
          requestId: 'request-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock matching results
      jest.mocked(require('@/lib/matching').findMatches).mockResolvedValue([
        { profileId: 'profile-1', score: 0.95 },
        { profileId: 'profile-2', score: 0.87 }
      ])

      const response = await runMatching(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.matches).toBeDefined()
      expect(data.matches).toHaveLength(2)
      expect(data.matches[0].score).toBe(0.95)
    })

    it('should handle no matches found', async () => {
      const request = new NextRequest('http://localhost:3000/api/requests/matching', {
        method: 'POST',
        body: JSON.stringify({
          requestId: 'request-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock no matches
      jest.mocked(require('@/lib/matching').findMatches).mockResolvedValue([])

      const response = await runMatching(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.matches).toHaveLength(0)
      expect(data.message).toBe('No suitable matches found')
    })
  })
})
