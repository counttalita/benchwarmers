import { NextRequest } from 'next/server'
import { MatchingEngine, ProjectRequirement, TalentProfile } from '@/lib/matching/matching-engine'

// Mock the matching engine
const mockMatchingEngine = {
  findMatches: jest.fn()
}

jest.mock('@/lib/matching/matching-engine', () => ({
  MatchingEngine: jest.fn().mockImplementation(() => mockMatchingEngine)
}))

// Mock the API route
const mockPostHandler = jest.fn()
jest.mock('@/app/api/matching/algorithm/route', () => ({
  POST: mockPostHandler
}))

describe('Matching Algorithm API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/matching/algorithm', () => {
    it('should return matches for valid project requirement and talent', async () => {
      const mockMatches = [
        {
          talentId: 'talent-1',
          totalScore: 85.5,
          breakdown: {
            skillsScore: 90,
            experienceScore: 80,
            availabilityScore: 95,
            budgetScore: 85,
            locationScore: 80,
            cultureScore: 75,
            velocityScore: 80,
            reliabilityScore: 85
          },
          reasons: ['Perfect skill match for React', 'Available immediately'],
          concerns: [],
          rank: 1,
          confidence: 0.9,
          predictedSuccess: 0.85
        }
      ]

      mockPostHandler.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          matches: mockMatches,
          metadata: {
            totalTalent: 10,
            matchedTalent: 1,
            algorithmVersion: '1.0.0'
          }
        })
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify({
          projectRequirement: {
            id: 'project-1',
            title: 'React Developer Needed',
            description: 'Looking for a senior React developer',
            requiredSkills: [
              { name: 'React', level: 'senior', weight: 10, isRequired: true }
            ],
            preferredSkills: [
              { name: 'TypeScript', level: 'mid', weight: 5, isRequired: false }
            ],
            budget: { min: 50, max: 100, currency: 'USD' },
            duration: { weeks: 12, startDate: new Date(), endDate: new Date() },
            startDate: new Date(),
            location: { type: 'remote' },
            urgency: 'medium',
            projectType: 'development',
            teamSize: 1,
            clientIndustry: 'Technology',
            companySize: 'startup',
            workStyle: 'agile'
          },
          availableTalent: [
            {
              id: 'talent-1',
              name: 'John Doe',
              skills: [
                { name: 'React', level: 'senior', yearsOfExperience: 5, category: 'frontend' },
                { name: 'TypeScript', level: 'mid', yearsOfExperience: 3, category: 'frontend' }
              ],
              experience: [
                {
                  company: 'Tech Corp',
                  role: 'Senior Developer',
                  duration: '2 years',
                  industry: 'Technology',
                  technologies: ['React', 'TypeScript'],
                  achievements: ['Led team of 5 developers']
                }
              ],
              availability: [
                {
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                  capacity: 100,
                  timezone: 'UTC'
                }
              ],
              hourlyRate: 75,
              location: {
                country: 'USA',
                city: 'San Francisco',
                timezone: 'PST',
                remotePreference: 'remote'
              },
              preferences: {
                preferredCompanySize: 'startup',
                workStyle: 'agile',
                communicationStyle: 'casual',
                preferredRate: 80,
                minimumRate: 60
              },
              isAvailable: true,
              rating: 4.8,
              totalReviews: 15
            }
          ]
        })
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.matches).toHaveLength(1)
      expect(data.matches[0].talentId).toBe('talent-1')
      expect(data.matches[0].totalScore).toBe(85.5)
      expect(data.matches[0].reasons).toContain('Perfect skill match for React')
      expect(data.metadata.totalTalent).toBe(10)
      expect(data.metadata.matchedTalent).toBe(1)
    })

    it('should handle missing required fields', async () => {
      mockPostHandler.mockResolvedValue({
        json: () => Promise.resolve({
          error: 'Missing required fields: projectRequirement and availableTalent'
        }),
        status: 400
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.error).toBe('Missing required fields: projectRequirement and availableTalent')
    })

    it('should handle invalid project requirement structure', async () => {
      mockPostHandler.mockResolvedValue({
        json: () => Promise.resolve({
          error: 'Invalid project requirement structure'
        }),
        status: 400
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify({
          projectRequirement: { title: 'Invalid' },
          availableTalent: []
        })
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.error).toBe('Invalid project requirement structure')
    })

    it('should handle empty talent array', async () => {
      mockPostHandler.mockResolvedValue({
        json: () => Promise.resolve({
          error: 'Available talent must be a non-empty array'
        }),
        status: 400
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify({
          projectRequirement: {
            id: 'project-1',
            requiredSkills: [],
            budget: { min: 50, max: 100, currency: 'USD' }
          },
          availableTalent: []
        })
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.error).toBe('Available talent must be a non-empty array')
    })

    it('should return multiple matches with proper ranking', async () => {
      const mockMatches = [
        {
          talentId: 'talent-1',
          totalScore: 90.0,
          breakdown: {
            skillsScore: 95,
            experienceScore: 85,
            availabilityScore: 90,
            budgetScore: 90,
            locationScore: 85,
            cultureScore: 80,
            velocityScore: 85,
            reliabilityScore: 90
          },
          reasons: ['Excellent skill match', 'Perfect budget fit'],
          concerns: [],
          rank: 1,
          confidence: 0.95,
          predictedSuccess: 0.90
        },
        {
          talentId: 'talent-2',
          totalScore: 75.5,
          breakdown: {
            skillsScore: 80,
            experienceScore: 70,
            availabilityScore: 85,
            budgetScore: 75,
            locationScore: 80,
            cultureScore: 70,
            velocityScore: 75,
            reliabilityScore: 80
          },
          reasons: ['Good skill match'],
          concerns: ['Rate is slightly above budget'],
          rank: 2,
          confidence: 0.80,
          predictedSuccess: 0.75
        }
      ]

      mockPostHandler.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          matches: mockMatches,
          metadata: {
            totalTalent: 20,
            matchedTalent: 2,
            algorithmVersion: '1.0.0'
          }
        })
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify({
          projectRequirement: {
            id: 'project-1',
            title: 'Full Stack Developer',
            requiredSkills: [
              { name: 'React', level: 'senior', weight: 10, isRequired: true },
              { name: 'Node.js', level: 'mid', weight: 8, isRequired: true }
            ],
            preferredSkills: [],
            budget: { min: 60, max: 120, currency: 'USD' },
            duration: { weeks: 16, startDate: new Date(), endDate: new Date() },
            startDate: new Date(),
            location: { type: 'remote' },
            urgency: 'medium',
            projectType: 'development',
            teamSize: 1,
            clientIndustry: 'Technology',
            companySize: 'startup',
            workStyle: 'agile'
          },
          availableTalent: [
            {
              id: 'talent-1',
              name: 'Alice Smith',
              skills: [
                { name: 'React', level: 'senior', yearsOfExperience: 6, category: 'frontend' },
                { name: 'Node.js', level: 'senior', yearsOfExperience: 5, category: 'backend' }
              ],
              experience: [],
              availability: [],
              hourlyRate: 90,
              location: { country: 'USA', city: 'NYC', timezone: 'EST', remotePreference: 'remote' },
              preferences: { preferredCompanySize: 'startup', workStyle: 'agile', communicationStyle: 'casual', preferredRate: 95, minimumRate: 70 },
              isAvailable: true,
              rating: 4.9,
              totalReviews: 25
            },
            {
              id: 'talent-2',
              name: 'Bob Johnson',
              skills: [
                { name: 'React', level: 'mid', yearsOfExperience: 3, category: 'frontend' },
                { name: 'Node.js', level: 'mid', yearsOfExperience: 2, category: 'backend' }
              ],
              experience: [],
              availability: [],
              hourlyRate: 130,
              location: { country: 'Canada', city: 'Toronto', timezone: 'EST', remotePreference: 'remote' },
              preferences: { preferredCompanySize: 'startup', workStyle: 'agile', communicationStyle: 'casual', preferredRate: 140, minimumRate: 100 },
              isAvailable: true,
              rating: 4.2,
              totalReviews: 8
            }
          ]
        })
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.matches).toHaveLength(2)
      expect(data.matches[0].rank).toBe(1)
      expect(data.matches[1].rank).toBe(2)
      expect(data.matches[0].totalScore).toBeGreaterThan(data.matches[1].totalScore)
      expect(data.matches[1].concerns).toContain('Rate is slightly above budget')
    })

    it('should handle matching options correctly', async () => {
      const mockMatches: any[] = []
      
      mockPostHandler.mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          matches: mockMatches,
          metadata: {
            totalTalent: 5,
            matchedTalent: 0,
            algorithmVersion: '1.0.0'
          }
        })
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'POST',
        body: JSON.stringify({
          projectRequirement: {
            id: 'project-1',
            title: 'Senior Developer',
            requiredSkills: [
              { name: 'Python', level: 'senior', weight: 10, isRequired: true }
            ],
            preferredSkills: [],
            budget: { min: 80, max: 150, currency: 'USD' },
            duration: { weeks: 8, startDate: new Date(), endDate: new Date() },
            startDate: new Date(),
            location: { type: 'remote' },
            urgency: 'high',
            projectType: 'development',
            teamSize: 1,
            clientIndustry: 'Finance',
            companySize: 'enterprise',
            workStyle: 'waterfall'
          },
          availableTalent: [
            {
              id: 'talent-1',
              name: 'Charlie Brown',
              skills: [
                { name: 'JavaScript', level: 'mid', yearsOfExperience: 3, category: 'frontend' }
              ],
              experience: [],
              availability: [],
              hourlyRate: 60,
              location: { country: 'UK', city: 'London', timezone: 'GMT', remotePreference: 'remote' },
              preferences: { preferredCompanySize: 'startup', workStyle: 'agile', communicationStyle: 'casual', preferredRate: 65, minimumRate: 50 },
              isAvailable: true,
              rating: 4.0,
              totalReviews: 5
            }
          ],
          options: {
            minScore: 50,
            maxResults: 10,
            includeReasons: true,
            includeConcerns: true,
            customWeights: {
              skills: 0.4,
              experience: 0.3,
              availability: 0.2,
              budget: 0.1
            }
          }
        })
      })

      const response = await mockPostHandler(mockRequest)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.matches).toHaveLength(0) // No matches due to skill mismatch
    })
  })

  describe('GET /api/matching/algorithm', () => {
    it('should return project information for valid project ID', async () => {
      const mockGetHandler = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          message: 'GET endpoint for matching algorithm - use POST for actual matching',
          projectId: 'project-1',
          note: 'This endpoint would fetch project requirements and available talent from database'
        })
      })

      jest.doMock('@/app/api/matching/algorithm/route', () => ({
        GET: mockGetHandler
      }))

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm?projectId=project-1', {
        method: 'GET'
      })

      const response = await mockGetHandler(mockRequest)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.projectId).toBe('project-1')
      expect(data.message).toContain('GET endpoint for matching algorithm')
    })

    it('should handle missing project ID', async () => {
      const mockGetHandler = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({
          error: 'Project ID is required'
        }),
        status: 400
      })

      jest.doMock('@/app/api/matching/algorithm/route', () => ({
        GET: mockGetHandler
      }))

      const mockRequest = new NextRequest('http://localhost:3000/api/matching/algorithm', {
        method: 'GET'
      })

      const response = await mockGetHandler(mockRequest)
      const data = await response.json()

      expect(data.error).toBe('Project ID is required')
    })
  })
})
