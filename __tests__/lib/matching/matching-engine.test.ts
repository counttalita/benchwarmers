import { MatchingEngine } from '@/lib/matching/matching-engine'
import { prisma } from '@/lib/prisma'

// Mock the prisma module
jest.mock('@/lib/prisma')

describe('MatchingEngine', () => {
  let matchingEngine: MatchingEngine
  const mockPrisma = prisma as jest.Mocked<typeof prisma>

  beforeEach(() => {
    matchingEngine = new MatchingEngine()
    jest.clearAllMocks()
  })

  describe('findMatches', () => {
    const mockTalentRequest = {
      id: 'req-123',
      companyId: 'company-123',
      title: 'Senior React Developer',
      description: 'Looking for experienced React developer',
      budget: 5000,
      duration: 30,
      skillsRequired: ['React', 'TypeScript', 'Node.js'],
      experienceLevel: 'senior' as const,
      location: 'Remote',
      urgency: 'medium' as const,
      projectType: 'contract' as const,
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const mockTalentProfiles = [
      {
        id: 'profile-1',
        userId: 'user-1',
        title: 'Senior Full Stack Developer',
        bio: 'Experienced React and Node.js developer',
        skills: ['React', 'TypeScript', 'Node.js', 'Python'],
        experienceLevel: 'senior' as const,
        hourlyRate: 80,
        availability: 'available' as const,
        location: 'Remote',
        portfolioUrl: 'https://portfolio.com',
        linkedinUrl: 'https://linkedin.com/in/dev',
        githubUrl: 'https://github.com/dev',
        yearsOfExperience: 8,
        languages: ['English'],
        timezone: 'UTC',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          email: 'dev@example.com',
          name: 'John Developer'
        }
      },
      {
        id: 'profile-2',
        userId: 'user-2',
        title: 'Junior React Developer',
        bio: 'Learning React and TypeScript',
        skills: ['React', 'JavaScript'],
        experienceLevel: 'junior' as const,
        hourlyRate: 35,
        availability: 'available' as const,
        location: 'New York',
        portfolioUrl: null,
        linkedinUrl: null,
        githubUrl: null,
        yearsOfExperience: 2,
        languages: ['English'],
        timezone: 'EST',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-2',
          email: 'junior@example.com',
          name: 'Jane Junior'
        }
      }
    ]

    beforeEach(() => {
      mockPrisma.talentProfile.findMany.mockResolvedValue(mockTalentProfiles as any)
    })

    it('should find matches for a talent request', async () => {
      const matches = await matchingEngine.findMatches(mockTalentRequest)

      expect(matches).toHaveLength(2)
      expect(matches[0].profile.id).toBe('profile-1')
      expect(matches[0].score).toBeGreaterThan(matches[1].score)
    })

    it('should calculate higher scores for better skill matches', async () => {
      const matches = await matchingEngine.findMatches(mockTalentRequest)
      
      const seniorMatch = matches.find(m => m.profile.id === 'profile-1')
      const juniorMatch = matches.find(m => m.profile.id === 'profile-2')

      expect(seniorMatch?.score).toBeGreaterThan(juniorMatch?.score || 0)
    })

    it('should consider experience level in scoring', async () => {
      const matches = await matchingEngine.findMatches(mockTalentRequest)
      
      const seniorMatch = matches.find(m => m.profile.experienceLevel === 'senior')
      const juniorMatch = matches.find(m => m.profile.experienceLevel === 'junior')

      expect(seniorMatch?.score).toBeGreaterThan(juniorMatch?.score || 0)
    })

    it('should filter by availability', async () => {
      const unavailableProfile = {
        ...mockTalentProfiles[0],
        availability: 'busy' as const
      }
      
      mockPrisma.talentProfile.findMany.mockResolvedValue([unavailableProfile] as any)

      const matches = await matchingEngine.findMatches(mockTalentRequest)
      expect(matches).toHaveLength(0)
    })

    it('should handle empty results', async () => {
      mockPrisma.talentProfile.findMany.mockResolvedValue([])

      const matches = await matchingEngine.findMatches(mockTalentRequest)
      expect(matches).toHaveLength(0)
    })

    it('should include match reasons in results', async () => {
      const matches = await matchingEngine.findMatches(mockTalentRequest)
      
      expect(matches[0].reasons).toContain('Strong skill match')
      expect(matches[0].reasons).toContain('Experience level match')
    })
  })

  describe('calculateMatchScore', () => {
    const mockRequest = {
      skillsRequired: ['React', 'TypeScript'],
      experienceLevel: 'senior' as const,
      budget: 5000,
      location: 'Remote'
    }

    const mockProfile = {
      skills: ['React', 'TypeScript', 'Node.js'],
      experienceLevel: 'senior' as const,
      hourlyRate: 80,
      location: 'Remote',
      yearsOfExperience: 8
    }

    it('should calculate skill match score correctly', () => {
      const score = matchingEngine.calculateSkillMatch(
        mockRequest.skillsRequired,
        mockProfile.skills
      )

      expect(score).toBe(1.0) // Perfect match for required skills
    })

    it('should calculate experience match score', () => {
      const score = matchingEngine.calculateExperienceMatch(
        mockRequest.experienceLevel,
        mockProfile.experienceLevel,
        mockProfile.yearsOfExperience
      )

      expect(score).toBeGreaterThan(0.8) // High score for matching experience
    })

    it('should calculate budget compatibility', () => {
      const estimatedHours = 60 // Assume 60 hours for the project
      const score = matchingEngine.calculateBudgetMatch(
        mockRequest.budget,
        mockProfile.hourlyRate,
        estimatedHours
      )

      expect(score).toBeGreaterThan(0.5) // Should be compatible
    })

    it('should handle location matching', () => {
      const score = matchingEngine.calculateLocationMatch(
        mockRequest.location,
        mockProfile.location
      )

      expect(score).toBe(1.0) // Perfect match for remote
    })
  })

  describe('getMatchReasons', () => {
    it('should generate appropriate match reasons', () => {
      const mockMatch = {
        skillScore: 0.9,
        experienceScore: 0.8,
        budgetScore: 0.7,
        locationScore: 1.0,
        overallScore: 0.85
      }

      const reasons = matchingEngine.getMatchReasons(mockMatch)

      expect(reasons).toContain('Strong skill match')
      expect(reasons).toContain('Good experience fit')
      expect(reasons).toContain('Perfect location match')
    })

    it('should handle low scores appropriately', () => {
      const mockMatch = {
        skillScore: 0.3,
        experienceScore: 0.4,
        budgetScore: 0.2,
        locationScore: 0.5,
        overallScore: 0.35
      }

      const reasons = matchingEngine.getMatchReasons(mockMatch)

      expect(reasons).toContain('Limited skill overlap')
      expect(reasons).toContain('Budget constraints')
    })
  })

  describe('filterByAvailability', () => {
    it('should filter profiles by availability status', async () => {
      const profiles = [
        { id: '1', availability: 'available' },
        { id: '2', availability: 'busy' },
        { id: '3', availability: 'available' }
      ]

      const available = await matchingEngine.filterByAvailability(profiles as any)
      
      expect(available).toHaveLength(2)
      expect(available.every(p => p.availability === 'available')).toBe(true)
    })
  })

  describe('sortByScore', () => {
    it('should sort matches by score in descending order', () => {
      const matches = [
        { score: 0.6, profile: { id: '1' } },
        { score: 0.9, profile: { id: '2' } },
        { score: 0.3, profile: { id: '3' } }
      ]

      const sorted = matchingEngine.sortByScore(matches as any)

      expect(sorted[0].score).toBe(0.9)
      expect(sorted[1].score).toBe(0.6)
      expect(sorted[2].score).toBe(0.3)
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.talentProfile.findMany.mockRejectedValue(new Error('Database error'))

      await expect(matchingEngine.findMatches({} as any))
        .rejects.toThrow('Database error')
    })

    it('should handle invalid input data', async () => {
      const invalidRequest = {
        skillsRequired: null,
        experienceLevel: 'invalid'
      }

      await expect(matchingEngine.findMatches(invalidRequest as any))
        .rejects.toThrow()
    })
  })
})
