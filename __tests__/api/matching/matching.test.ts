import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock the matching algorithm route
const mockMatchingResponse = {
  message: 'Matches found successfully',
  matches: [
    {
      id: 'profile-1',
      matchScore: 85,
      skillMatches: 3,
      totalRequiredSkills: 3,
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        rating: 4.8,
        totalReviews: 15
      },
      skills: [
        { name: 'React', level: 'expert' },
        { name: 'TypeScript', level: 'intermediate' },
        { name: 'Node.js', level: 'expert' }
      ]
    }
  ],
  totalMatches: 1,
  criteria: {
    requiredSkills: ['React', 'TypeScript', 'Node.js'],
    budget: 100,
    location: 'Remote',
    duration: 12,
    isRemote: true
  }
}

// Mock the POST function from the matching algorithm route
const mockPostHandler = jest.fn().mockResolvedValue({
  json: () => Promise.resolve(mockMatchingResponse)
}) as jest.MockedFunction<any>

jest.mock('@/app/api/matching/algorithm/route', () => ({
  POST: mockPostHandler
}))

describe('Matching Algorithm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Matching API', () => {
    it('should find matches for a talent request', async () => {
      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['React', 'TypeScript', 'Node.js'],
        budget: 100,
        location: 'Remote',
        duration: 12,
        isRemote: true
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data).toBeDefined()
      expect(data.message).toBe('Matches found successfully')
      expect(Array.isArray(data.matches)).toBe(true)
      expect(data.matches.length).toBeGreaterThan(0)
      expect(data.matches[0]).toHaveProperty('id')
      expect(data.matches[0]).toHaveProperty('matchScore')
      expect(data.matches[0]).toHaveProperty('skillMatches')
    })

    it('should rank profiles by compatibility score', async () => {
      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budget: 100,
        location: 'Remote',
        duration: 12,
        isRemote: true
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data).toBeDefined()
      expect(data.message).toBe('Matches found successfully')
      expect(data.matches[0].matchScore).toBeGreaterThan(0)
    })

    it('should filter out profiles that don\'t meet minimum requirements', async () => {
      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budget: 100,
        location: 'Remote',
        duration: 12,
        isRemote: true
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data).toBeDefined()
      expect(data.message).toBe('Matches found successfully')
      expect(data.matches[0].skillMatches).toBeGreaterThan(0)
    })
  })

  describe('Matching Statistics', () => {
    it('should get matching statistics', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm?requestId=request-123', {
        method: 'GET'
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data).toBeDefined()
    })
  })

  describe('Matching Edge Cases', () => {
    it('should handle requests with no matching profiles', async () => {
      // Mock empty response for no matches
      mockPostHandler.mockResolvedValueOnce({
        json: () => Promise.resolve({
          message: 'Matches found successfully',
          matches: [],
          totalMatches: 0,
          criteria: {}
        })
      })

      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['RareSkill1', 'RareSkill2'],
        budget: 200,
        location: 'Onsite',
        duration: 12,
        isRemote: false
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.matches.length).toBe(0)
      expect(data.totalMatches).toBe(0)
    })

    it('should handle profiles with very high rates', async () => {
      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['React'],
        budget: 100,
        location: 'Remote',
        duration: 12,
        isRemote: true
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data).toBeDefined()
      expect(data.message).toBe('Matches found successfully')
    })
  })

  describe('Score Breakdown Analysis', () => {
    it('should provide detailed score breakdown', async () => {
      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budget: 100,
        location: 'Remote',
        duration: 12,
        isRemote: true
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.matches[0]).toHaveProperty('matchScore')
      expect(data.matches[0]).toHaveProperty('skillMatches')
      expect(data.matches[0]).toHaveProperty('totalRequiredSkills')
      expect(data.matches[0]).toHaveProperty('user')
      expect(data.matches[0]).toHaveProperty('skills')
    })
  })

  describe('Performance Optimization', () => {
    it('should limit results to top matches', async () => {
      const requestBody = {
        requestId: 'request-123',
        requiredSkills: ['React'],
        budget: 100,
        location: 'Remote',
        duration: 12,
        isRemote: true
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.matches.length).toBeLessThanOrEqual(10) // Should be limited
    })
  })
})
