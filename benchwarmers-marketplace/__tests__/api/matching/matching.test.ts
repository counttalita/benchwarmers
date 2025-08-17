import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { findMatches, calculateScore, rankProfiles } from '@/app/api/matching/algorithm/route'

describe('Matching Algorithm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('findMatches', () => {
    it('should find matches for a talent request', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React', 'TypeScript', 'Node.js'],
        preferredSkills: ['GraphQL', 'AWS'],
        budgetMin: 80,
        budgetMax: 120,
        locationPreference: 'Remote',
        startDate: '2024-02-01',
        durationWeeks: 12
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
          rateMin: 90,
          rateMax: 110,
          location: 'New York',
          remotePreference: 'hybrid',
          availability: ['2024-02-01', '2024-05-01'],
          rating: 4.8,
          reviewCount: 15
        },
        {
          id: 'profile-2',
          skills: ['React', 'JavaScript', 'Node.js'],
          rateMin: 70,
          rateMax: 90,
          location: 'Remote',
          remotePreference: 'remote',
          availability: ['2024-02-01', '2024-05-01'],
          rating: 4.5,
          reviewCount: 8
        },
        {
          id: 'profile-3',
          skills: ['Vue.js', 'JavaScript', 'Python'],
          rateMin: 100,
          rateMax: 130,
          location: 'San Francisco',
          remotePreference: 'onsite',
          availability: ['2024-02-01', '2024-05-01'],
          rating: 4.9,
          reviewCount: 25
        }
      ]

      const matches = await findMatches(request, profiles)

      expect(matches).toBeDefined()
      expect(Array.isArray(matches)).toBe(true)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0]).toHaveProperty('profileId')
      expect(matches[0]).toHaveProperty('score')
      expect(matches[0]).toHaveProperty('scoreBreakdown')
    })

    it('should rank profiles by compatibility score', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budgetMin: 80,
        budgetMax: 120,
        locationPreference: 'Remote'
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['React', 'TypeScript', 'Node.js'],
          rateMin: 90,
          rateMax: 110,
          location: 'Remote',
          rating: 4.8,
          reviewCount: 15
        },
        {
          id: 'profile-2',
          skills: ['React', 'JavaScript'],
          rateMin: 70,
          rateMax: 90,
          location: 'Remote',
          rating: 4.5,
          reviewCount: 8
        }
      ]

      const matches = await findMatches(request, profiles)

      expect(matches[0].score).toBeGreaterThan(matches[1].score)
      expect(matches[0].profileId).toBe('profile-1')
    })

    it('should filter out profiles that don\'t meet minimum requirements', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budgetMin: 80,
        budgetMax: 120
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['React', 'TypeScript'],
          rateMin: 90,
          rateMax: 110
        },
        {
          id: 'profile-2',
          skills: ['Vue.js', 'JavaScript'], // Missing required skills
          rateMin: 70,
          rateMax: 90
        },
        {
          id: 'profile-3',
          skills: ['React', 'TypeScript'],
          rateMin: 130, // Above budget
          rateMax: 150
        }
      ]

      const matches = await findMatches(request, profiles)

      expect(matches.length).toBe(1)
      expect(matches[0].profileId).toBe('profile-1')
    })
  })

  describe('calculateScore', () => {
    it('should calculate skill match score', async () => {
      const requestSkills = ['React', 'TypeScript', 'Node.js']
      const profileSkills = ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS']

      const score = await calculateScore({
        type: 'skills',
        requestSkills,
        profileSkills
      })

      expect(score).toBe(1.0) // Perfect match
    })

    it('should calculate partial skill match score', async () => {
      const requestSkills = ['React', 'TypeScript', 'Node.js']
      const profileSkills = ['React', 'JavaScript', 'Node.js']

      const score = await calculateScore({
        type: 'skills',
        requestSkills,
        profileSkills
      })

      expect(score).toBeGreaterThan(0.6) // Partial match
      expect(score).toBeLessThan(1.0)
    })

    it('should calculate budget fit score', async () => {
      const requestBudget = { min: 80, max: 120 }
      const profileRate = { min: 90, max: 110 }

      const score = await calculateScore({
        type: 'budget',
        requestBudget,
        profileRate
      })

      expect(score).toBeGreaterThan(0.8) // Good budget fit
      expect(score).toBeLessThanOrEqual(1.0)
    })

    it('should calculate location match score', async () => {
      const requestLocation = 'Remote'
      const profileLocation = 'Remote'
      const profileRemotePreference = 'remote'

      const score = await calculateScore({
        type: 'location',
        requestLocation,
        profileLocation,
        profileRemotePreference
      })

      expect(score).toBe(1.0) // Perfect location match
    })

    it('should calculate availability match score', async () => {
      const requestStartDate = '2024-02-01'
      const requestDuration = 12 // weeks
      const profileAvailability = ['2024-02-01', '2024-05-01']

      const score = await calculateScore({
        type: 'availability',
        requestStartDate,
        requestDuration,
        profileAvailability
      })

      expect(score).toBe(1.0) // Perfect availability match
    })

    it('should calculate rating score', async () => {
      const profileRating = 4.8
      const profileReviewCount = 15

      const score = await calculateScore({
        type: 'rating',
        profileRating,
        profileReviewCount
      })

      expect(score).toBeGreaterThan(0.8) // High rating
      expect(score).toBeLessThanOrEqual(1.0)
    })
  })

  describe('rankProfiles', () => {
    it('should rank profiles by weighted score', async () => {
      const scoredProfiles = [
        {
          profileId: 'profile-1',
          scoreBreakdown: {
            skills: 0.9,
            budget: 0.8,
            location: 1.0,
            availability: 1.0,
            rating: 0.9
          }
        },
        {
          profileId: 'profile-2',
          scoreBreakdown: {
            skills: 0.7,
            budget: 0.9,
            location: 0.8,
            availability: 1.0,
            rating: 0.8
          }
        },
        {
          profileId: 'profile-3',
          scoreBreakdown: {
            skills: 1.0,
            budget: 0.6,
            location: 1.0,
            availability: 0.9,
            rating: 0.9
          }
        }
      ]

      const weights = {
        skills: 0.3,
        budget: 0.2,
        location: 0.15,
        availability: 0.15,
        rating: 0.2
      }

      const rankedProfiles = await rankProfiles(scoredProfiles, weights)

      expect(rankedProfiles).toBeDefined()
      expect(Array.isArray(rankedProfiles)).toBe(true)
      expect(rankedProfiles.length).toBe(3)
      expect(rankedProfiles[0].score).toBeGreaterThan(rankedProfiles[1].score)
      expect(rankedProfiles[1].score).toBeGreaterThan(rankedProfiles[2].score)
    })

    it('should handle profiles with missing data', async () => {
      const scoredProfiles = [
        {
          profileId: 'profile-1',
          scoreBreakdown: {
            skills: 0.9,
            budget: 0.8,
            location: 1.0,
            availability: 1.0,
            rating: 0.9
          }
        },
        {
          profileId: 'profile-2',
          scoreBreakdown: {
            skills: 0.7,
            budget: 0.9,
            location: 0.8,
            availability: 1.0
            // Missing rating
          }
        }
      ]

      const weights = {
        skills: 0.3,
        budget: 0.2,
        location: 0.15,
        availability: 0.15,
        rating: 0.2
      }

      const rankedProfiles = await rankProfiles(scoredProfiles, weights)

      expect(rankedProfiles).toBeDefined()
      expect(rankedProfiles.length).toBe(2)
      // Profile with complete data should rank higher
      expect(rankedProfiles[0].profileId).toBe('profile-1')
    })
  })

  describe('Matching Edge Cases', () => {
    it('should handle requests with no matching profiles', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['RareSkill'],
        budgetMin: 200,
        budgetMax: 300
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['CommonSkill'],
          rateMin: 50,
          rateMax: 100
        }
      ]

      const matches = await findMatches(request, profiles)

      expect(matches.length).toBe(0)
    })

    it('should handle profiles with very high rates', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React'],
        budgetMin: 80,
        budgetMax: 120
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['React'],
          rateMin: 200,
          rateMax: 300
        }
      ]

      const matches = await findMatches(request, profiles)

      expect(matches.length).toBe(0) // Should be filtered out
    })

    it('should handle profiles with no reviews', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React']
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['React'],
          rating: 0,
          reviewCount: 0
        }
      ]

      const matches = await findMatches(request, profiles)

      expect(matches.length).toBe(1)
      expect(matches[0].scoreBreakdown.rating).toBe(0.5) // Default score for no reviews
    })
  })

  describe('Score Breakdown Analysis', () => {
    it('should provide detailed score breakdown', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budgetMin: 80,
        budgetMax: 120,
        locationPreference: 'Remote'
      }

      const profile = {
        id: 'profile-1',
        skills: ['React', 'TypeScript', 'Node.js'],
        rateMin: 90,
        rateMax: 110,
        location: 'Remote',
        rating: 4.8,
        reviewCount: 15
      }

      const matches = await findMatches(request, [profile])

      expect(matches[0].scoreBreakdown).toBeDefined()
      expect(matches[0].scoreBreakdown.skills).toBeDefined()
      expect(matches[0].scoreBreakdown.budget).toBeDefined()
      expect(matches[0].scoreBreakdown.location).toBeDefined()
      expect(matches[0].scoreBreakdown.rating).toBeDefined()
    })

    it('should explain scoring factors', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React', 'TypeScript'],
        budgetMin: 80,
        budgetMax: 120
      }

      const profile = {
        id: 'profile-1',
        skills: ['React', 'JavaScript'], // Missing TypeScript
        rateMin: 90,
        rateMax: 110
      }

      const matches = await findMatches(request, [profile])

      expect(matches[0].explanation).toBeDefined()
      expect(matches[0].explanation).toContain('skills')
      expect(matches[0].explanation).toContain('budget')
    })
  })

  describe('Performance Optimization', () => {
    it('should limit results to top matches', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React']
      }

      const profiles = Array(100).fill(null).map((_, index) => ({
        id: `profile-${index}`,
        skills: ['React'],
        rateMin: 80 + index,
        rateMax: 100 + index
      }))

      const matches = await findMatches(request, profiles, { limit: 10 })

      expect(matches.length).toBe(10)
    })

    it('should cache matching results', async () => {
      const request = {
        id: 'request-123',
        requiredSkills: ['React']
      }

      const profiles = [
        {
          id: 'profile-1',
          skills: ['React'],
          rateMin: 90,
          rateMax: 110
        }
      ]

      // First call
      const matches1 = await findMatches(request, profiles)
      
      // Second call should use cache
      const matches2 = await findMatches(request, profiles)

      expect(matches1).toEqual(matches2)
    })
  })
})
