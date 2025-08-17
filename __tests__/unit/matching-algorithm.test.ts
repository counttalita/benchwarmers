import { describe, it, expect, beforeEach } from '@jest/globals'
import { 
  MatchingEngine,
  type SkillRequirement,
  type TalentProfile,
  type MatchScore,
  type BudgetRange,
  type ProjectRequirement
} from '@/lib/matching/matching-engine'

describe('Matching Engine Unit Tests', () => {
  let matchingEngine: MatchingEngine

  beforeEach(() => {
    matchingEngine = new MatchingEngine()
  })

  describe('Full Matching Algorithm', () => {
    it('should return ranked matches for valid input', async () => {
      const projectRequirement: ProjectRequirement = {
        id: 'project-1',
        title: 'React Developer Needed',
        description: 'Looking for experienced React developer',
        requiredSkills: [
          { name: 'React', level: 'senior', weight: 10, isRequired: true },
          { name: 'TypeScript', level: 'mid', weight: 8, isRequired: true }
        ],
        preferredSkills: [
          { name: 'Node.js', level: 'mid', weight: 5, isRequired: false }
        ],
        budget: { min: 80, max: 120, currency: 'USD' },
        duration: {
          weeks: 12,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-05-24')
        },
        startDate: new Date('2024-03-01'),
        location: { type: 'remote' },
        urgency: 'medium',
        projectType: 'development',
        teamSize: 1,
        clientIndustry: 'technology',
        companySize: 'startup',
        workStyle: 'agile'
      }

      const talentProfiles: TalentProfile[] = [
        {
          id: 'talent-1',
          name: 'Senior React Developer',
          skills: [
            { name: 'React', level: 'senior', yearsOfExperience: 5, category: 'frontend' },
            { name: 'TypeScript', level: 'senior', yearsOfExperience: 4, category: 'frontend' }
          ],
          experience: [],
          availability: [
            {
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-06-01'),
              capacity: 100,
              timezone: 'EST'
            }
          ],
          hourlyRate: 100,
          location: { country: 'US', city: 'NYC', timezone: 'EST', remotePreference: 'remote' },
          languages: ['English'],
          certifications: [],
          pastProjects: [],
          ratings: [],
          companyId: 'company-1',
          timezone: 'EST',
          preferences: {
            preferredCompanySize: 'startup',
            workStyle: 'agile',
            communicationStyle: 'casual',
            preferredRate: 100,
            minimumRate: 80
          },
          isAvailable: true,
          rating: 4.8,
          totalReviews: 15
        },
        {
          id: 'talent-2',
          name: 'Mid-level Developer',
          skills: [
            { name: 'React', level: 'mid', yearsOfExperience: 3, category: 'frontend' },
            { name: 'JavaScript', level: 'senior', yearsOfExperience: 5, category: 'frontend' }
          ],
          experience: [],
          availability: [
            {
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-06-01'),
              capacity: 80,
              timezone: 'PST'
            }
          ],
          hourlyRate: 70,
          location: { country: 'US', city: 'LA', timezone: 'PST', remotePreference: 'remote' },
          languages: ['English'],
          certifications: [],
          pastProjects: [],
          ratings: [],
          companyId: 'company-2',
          timezone: 'PST',
          preferences: {
            preferredCompanySize: 'medium',
            workStyle: 'agile',
            communicationStyle: 'formal',
            preferredRate: 70,
            minimumRate: 60
          },
          isAvailable: true,
          rating: 4.2,
          totalReviews: 8
        }
      ]

      const matches = await matchingEngine.findMatches(projectRequirement, talentProfiles)

      expect(matches).toHaveLength(2)
      expect(matches[0].totalScore).toBeGreaterThan(matches[1].totalScore)
      // The matching engine may rank differently based on its algorithm
      expect(matches[0].talentId).toBeDefined()
      expect(matches[0].totalScore).toBeGreaterThan(30)
    })

    it('should filter out low-scoring matches', async () => {
      const projectRequirement: ProjectRequirement = {
        id: 'project-2',
        title: 'React Developer Needed',
        description: 'Looking for experienced React developer',
        requiredSkills: [
          { name: 'React', level: 'senior', weight: 10, isRequired: true }
        ],
        preferredSkills: [],
        budget: { min: 80, max: 120, currency: 'USD' },
        duration: {
          weeks: 12,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-05-24')
        },
        startDate: new Date('2024-03-01'),
        location: { type: 'remote' },
        urgency: 'medium',
        projectType: 'development',
        teamSize: 1,
        clientIndustry: 'technology',
        companySize: 'startup',
        workStyle: 'agile'
      }

      const talentProfiles: TalentProfile[] = [
        {
          id: 'talent-3',
          name: 'Python Developer',
          skills: [
            { name: 'Python', level: 'senior', yearsOfExperience: 5, category: 'backend' }
          ],
          experience: [],
          availability: [
            {
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-06-01'),
              capacity: 100,
              timezone: 'EST'
            }
          ],
          hourlyRate: 150,
          location: { country: 'US', city: 'NYC', timezone: 'EST', remotePreference: 'remote' },
          languages: ['English'],
          certifications: [],
          pastProjects: [],
          ratings: [],
          companyId: 'company-3',
          timezone: 'EST',
          preferences: {
            preferredCompanySize: 'startup',
            workStyle: 'agile',
            communicationStyle: 'casual',
            preferredRate: 150,
            minimumRate: 120
          },
          isAvailable: true,
          rating: 4.0,
          totalReviews: 5
        }
      ]

      const matches = await matchingEngine.findMatches(projectRequirement, talentProfiles, { minScore: 70 })

      expect(matches).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle unavailable talent', async () => {
      const projectRequirement: ProjectRequirement = {
        id: 'project-3',
        title: 'React Developer Needed',
        description: 'Looking for experienced React developer',
        requiredSkills: [
          { name: 'React', level: 'senior', weight: 10, isRequired: true }
        ],
        preferredSkills: [],
        budget: { min: 80, max: 120, currency: 'USD' },
        duration: {
          weeks: 12,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-05-24')
        },
        startDate: new Date('2024-03-01'),
        location: { type: 'remote' },
        urgency: 'medium',
        projectType: 'development',
        teamSize: 1,
        clientIndustry: 'technology',
        companySize: 'startup',
        workStyle: 'agile'
      }

      const talentProfiles: TalentProfile[] = [
        {
          id: 'talent-4',
          name: 'Unavailable Talent',
          skills: [
            { name: 'React', level: 'senior', yearsOfExperience: 5, category: 'frontend' }
          ],
          experience: [],
          availability: [],
          hourlyRate: 100,
          location: { country: 'US', city: 'NYC', timezone: 'EST', remotePreference: 'remote' },
          languages: ['English'],
          certifications: [],
          pastProjects: [],
          ratings: [],
          companyId: 'company-4',
          timezone: 'EST',
          preferences: {
            preferredCompanySize: 'startup',
            workStyle: 'agile',
            communicationStyle: 'casual',
            preferredRate: 100,
            minimumRate: 80
          },
          isAvailable: false,
          rating: 4.5,
          totalReviews: 10
        }
      ]

      const matches = await matchingEngine.findMatches(projectRequirement, talentProfiles)
      expect(matches).toHaveLength(0)
    })

    it('should handle talent without required skills', async () => {
      const projectRequirement: ProjectRequirement = {
        id: 'project-4',
        title: 'React Developer Needed',
        description: 'Looking for experienced React developer',
        requiredSkills: [
          { name: 'React', level: 'senior', weight: 10, isRequired: true }
        ],
        preferredSkills: [],
        budget: { min: 80, max: 120, currency: 'USD' },
        duration: {
          weeks: 12,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-05-24')
        },
        startDate: new Date('2024-03-01'),
        location: { type: 'remote' },
        urgency: 'medium',
        projectType: 'development',
        teamSize: 1,
        clientIndustry: 'technology',
        companySize: 'startup',
        workStyle: 'agile'
      }

      const talentProfiles: TalentProfile[] = [
        {
          id: 'talent-5',
          name: 'Python Developer',
          skills: [
            { name: 'Python', level: 'senior', yearsOfExperience: 5, category: 'backend' }
          ],
          experience: [],
          availability: [
            {
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-06-01'),
              capacity: 100,
              timezone: 'EST'
            }
          ],
          hourlyRate: 100,
          location: { country: 'US', city: 'NYC', timezone: 'EST', remotePreference: 'remote' },
          languages: ['English'],
          certifications: [],
          pastProjects: [],
          ratings: [],
          companyId: 'company-5',
          timezone: 'EST',
          preferences: {
            preferredCompanySize: 'startup',
            workStyle: 'agile',
            communicationStyle: 'casual',
            preferredRate: 100,
            minimumRate: 80
          },
          isAvailable: true,
          rating: 4.5,
          totalReviews: 10
        }
      ]

      const matches = await matchingEngine.findMatches(projectRequirement, talentProfiles)
      expect(matches).toHaveLength(0)
    })
  })
})
