import { prisma } from '@/lib/prisma'
import { MatchingEngine, ProjectRequirement, TalentProfile, MatchScore } from './matching-engine'
import { AvailabilityChecker, ProjectTimeframe } from './availability-checker'
import { logError, logInfo } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

export interface MatchGenerationOptions {
  maxMatches?: number
  minScore?: number
  includeReasons?: boolean
  includeConcerns?: boolean
  enableRealTimeAvailability?: boolean
  responseTimeGuarantee?: number // hours
  customWeights?: any
}

export interface GeneratedMatch {
  id: string
  talentRequestId: string
  talentId: string
  score: number
  breakdown: {
    skillsScore: number
    experienceScore: number
    availabilityScore: number
    budgetScore: number
    locationScore: number
    cultureScore: number
    velocityScore: number
    reliabilityScore: number
  }
  reasons: string[]
  concerns: string[]
  rank: number
  confidence: number
  predictedSuccess: number
  status: 'pending' | 'viewed' | 'interested' | 'not_interested' | 'contacted' | 'hired'
  availabilityDetails?: {
    overlapPercentage: number
    availableHours: number
    conflictingBookings: number
    immediateAvailability: boolean
  }
  createdAt: Date
  expiresAt: Date
  responseDeadline: Date
}

export class MatchGenerator {
  private matchingEngine: MatchingEngine
  private availabilityChecker: AvailabilityChecker

  constructor() {
    this.matchingEngine = new MatchingEngine()
    this.availabilityChecker = new AvailabilityChecker()
  }

  /**
   * Generate matches for a talent request with 24-hour response guarantee
   */
  async generateMatches(
    talentRequestId: string,
    options: MatchGenerationOptions = {}
  ): Promise<GeneratedMatch[]> {
    
    const correlationId = uuidv4()
    
    logInfo('Starting match generation', {
      correlationId,
      talentRequestId,
      options
    })

    try {
      // Fetch talent request details
      const talentRequest = await this.fetchTalentRequest(talentRequestId)
      if (!talentRequest) {
        throw new Error(`Talent request ${talentRequestId} not found`)
      }

      // Convert to matching engine format
      const projectRequirement = this.convertToProjectRequirement(talentRequest)
      
      // Fetch available talent profiles
      const availableTalent = await this.fetchAvailableTalent(projectRequirement)
      
      logInfo('Fetched talent profiles for matching', {
        correlationId,
        talentCount: availableTalent.length
      })

      // Generate matches using the matching engine
      const matchScores = await this.matchingEngine.findMatches(
        projectRequirement,
        availableTalent,
        {
          maxResults: options.maxMatches || 20,
          minScore: options.minScore || 30,
          includeReasons: options.includeReasons !== false,
          includeConcerns: options.includeConcerns !== false,
          customWeights: options.customWeights
        }
      )

      // Enhance with real-time availability if enabled
      let enhancedMatches = matchScores
      if (options.enableRealTimeAvailability !== false) {
        enhancedMatches = await this.enhanceWithAvailability(
          matchScores,
          projectRequirement,
          correlationId
        )
      }

      // Convert to GeneratedMatch format and save to database
      const generatedMatches = await this.saveMatches(
        talentRequestId,
        enhancedMatches,
        options.responseTimeGuarantee || 24,
        correlationId
      )

      // Schedule response deadline notifications
      await this.scheduleResponseDeadlines(generatedMatches, correlationId)

      logInfo('Match generation completed', {
        correlationId,
        matchesGenerated: generatedMatches.length,
        averageScore: generatedMatches.reduce((sum: any, m: any) => sum + m.score, 0) / generatedMatches.length
      })

      return generatedMatches

    } catch (error) {
      console.error('Error generating matches:', error, { correlationId, talentRequestId })
      throw error
    }
  }

  /**
   * Fetch talent request from database
   */
  private async fetchTalentRequest(talentRequestId: string): Promise<any> {
    return await prisma.talentRequest.findUnique({
      where: { id: talentRequestId },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  }

  /**
   * Convert database talent request to matching engine format
   */
  private convertToProjectRequirement(talentRequest: any): ProjectRequirement {
    const duration = talentRequest.duration || { value: 12, unit: 'weeks' }
    const durationInWeeks = this.convertToWeeks(duration.value, duration.unit)
    
    return {
      id: talentRequest.id,
      title: talentRequest.title,
      description: talentRequest.description,
      requiredSkills: (talentRequest.requiredSkills || []).map((skill: any) => ({
        name: skill.name,
        level: skill.level,
        weight: skill.priority === 'required' ? 10 : skill.priority === 'preferred' ? 7 : 4,
        yearsRequired: skill.yearsRequired,
        isRequired: skill.priority === 'required'
      })),
      preferredSkills: (talentRequest.requiredSkills || [])
        .filter((skill: any) => skill.priority !== 'required')
        .map((skill: any) => ({
          name: skill.name,
          level: skill.level,
          weight: skill.priority === 'preferred' ? 7 : 4,
          yearsRequired: skill.yearsRequired,
          isRequired: false
        })),
      budget: {
        min: talentRequest.budget?.min || 0,
        max: talentRequest.budget?.max || 1000,
        currency: talentRequest.budget?.currency || 'USD'
      },
      duration: {
        weeks: durationInWeeks,
        startDate: new Date(talentRequest.startDate),
        endDate: talentRequest.endDate ? new Date(talentRequest.endDate) : 
          new Date(new Date(talentRequest.startDate).getTime() + durationInWeeks * 7 * 24 * 60 * 60 * 1000)
      },
      startDate: new Date(talentRequest.startDate),
      location: {
        type: talentRequest.remotePreference || 'remote',
        timezone: talentRequest.timezone,
        country: talentRequest.location?.split(',')[1]?.trim(),
        city: talentRequest.location?.split(',')[0]?.trim()
      },
      urgency: talentRequest.urgency || 'medium',
      projectType: this.mapProjectType(talentRequest.projectType),
      teamSize: talentRequest.teamSize || 1,
      clientIndustry: talentRequest.industry || 'Technology',
      companySize: talentRequest.companySize || 'medium',
      workStyle: this.mapWorkStyle(talentRequest.communicationStyle)
    }
  }

  /**
   * Convert duration to weeks
   */
  private convertToWeeks(value: number, unit: string): number {
    switch (unit) {
      case 'days': return value / 7
      case 'weeks': return value
      case 'months': return value * 4.33
      default: return value
    }
  }

  /**
   * Map project type to matching engine format
   */
  private mapProjectType(projectType: string | undefined): 'development' | 'consulting' | 'design' | 'data' | 'other' {
    if (!projectType) return 'development'
    
    const mapping: Record<string, 'development' | 'consulting' | 'design' | 'data' | 'other'> = {
      'short-term': 'development',
      'long-term': 'development',
      'contract': 'consulting',
      'full-time': 'development',
      'consulting': 'consulting',
      'development': 'development',
      'design': 'design',
      'ui-ux': 'design',
      'frontend': 'development',
      'backend': 'development',
      'fullstack': 'development',
      'data-science': 'data',
      'analytics': 'data',
      'machine-learning': 'data',
      'ai': 'data'
    }
    return mapping[projectType.toLowerCase()] || 'other'
  }

  /**
   * Map work style to matching engine format
   */
  private mapWorkStyle(communicationStyle: string | undefined): 'agile' | 'waterfall' | 'hybrid' {
    if (!communicationStyle) return 'hybrid'
    
    const mapping: Record<string, 'agile' | 'waterfall' | 'hybrid'> = {
      'formal': 'waterfall',
      'casual': 'agile',
      'collaborative': 'agile',
      'independent': 'hybrid'
    }
    return mapping[communicationStyle] || 'hybrid'
  }

  /**
   * Fetch available talent profiles
   */
  private async fetchAvailableTalent(projectRequirement: ProjectRequirement): Promise<TalentProfile[]> {
    const talents = await prisma.talentProfile.findMany({
      where: {
        isVisible: true,
        // Add basic filtering to reduce dataset
        OR: [
          {
            skills: {
              path: ['$[*].name'],
              array_contains: projectRequirement.requiredSkills.map(s => s.name)
            }
          }
        ]
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 100 // Limit to prevent performance issues
    })

    return talents.map(talent => this.convertToTalentProfile(talent))
  }

  /**
   * Convert database talent to matching engine format
   */
  private convertToTalentProfile(talent: any): TalentProfile {
    return {
      id: talent.id,
      name: talent.name,
      skills: (talent.skills || []).map((skill: any) => ({
        name: skill.name,
        level: skill.level,
        yearsOfExperience: skill.years || 0,
        category: this.categorizeSkill(skill.name)
      })),
      experience: (talent.experience || []).map((exp: any) => ({
        company: exp.company,
        role: exp.role,
        duration: exp.duration,
        industry: exp.industry || 'Technology',
        technologies: exp.technologies || [],
        achievements: exp.achievements || []
      })),
      availability: (talent.availability || []).map((avail: any) => ({
        startDate: new Date(avail.startDate),
        endDate: new Date(avail.endDate),
        capacity: avail.capacity || 100,
        timezone: talent.timezone || 'UTC'
      })),
      hourlyRate: talent.rate?.min || 50,
      location: {
        country: talent.location?.split(',')[1]?.trim() || 'Unknown',
        city: talent.location?.split(',')[0]?.trim() || 'Unknown',
        timezone: talent.timezone || 'UTC',
        remotePreference: talent.remotePreference || 'remote'
      },
      languages: talent.languages || ['English'],
      certifications: (talent.certifications || []).map((cert: any) => ({
        name: cert.name,
        issuer: cert.issuer,
        issueDate: new Date(cert.issueDate),
        expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined,
        credentialId: cert.credentialId
      })),
      pastProjects: [], // Would need to fetch from engagements
      ratings: [], // Would need to fetch from reviews
      companyId: talent.companyId,
      timezone: talent.timezone || 'UTC',
      preferences: {
        preferredCompanySize: 'medium',
        workStyle: 'agile',
        communicationStyle: 'mixed',
        preferredRate: talent.rate?.max || 100,
        minimumRate: talent.rate?.min || 50
      },
      isAvailable: talent.isAvailable || false,
      rating: talent.rating || 4.0,
      totalReviews: talent.reviewCount || 0
    }
  }

  /**
   * Categorize skill for matching engine
   */
  private categorizeSkill(skillName: string): string {
    const categories: Record<string, string> = {
      'React': 'frontend',
      'Vue.js': 'frontend',
      'Angular': 'frontend',
      'Node.js': 'backend',
      'Python': 'backend',
      'Java': 'backend',
      'AWS': 'devops',
      'Docker': 'devops',
      'Kubernetes': 'devops',
      'Figma': 'design',
      'Adobe Creative Suite': 'design'
    }
    return categories[skillName] || 'other'
  }

  /**
   * Enhance matches with real-time availability data
   */
  private async enhanceWithAvailability(
    matchScores: MatchScore[],
    projectRequirement: ProjectRequirement,
    correlationId: string
  ): Promise<MatchScore[]> {
    
    const projectTimeframe: ProjectTimeframe = {
      startDate: projectRequirement.startDate,
      endDate: projectRequirement.duration.endDate,
      hoursPerWeek: 40, // Default, could be from requirement
      timezone: projectRequirement.location.timezone || 'UTC',
      urgency: projectRequirement.urgency === 'critical' ? 'urgent' : projectRequirement.urgency
    }

    const talentIds = matchScores.map(match => match.talentId)
    const availabilityMatches = await this.availabilityChecker.checkAvailability(
      talentIds,
      projectTimeframe,
      correlationId
    )

    // Create availability lookup
    const availabilityLookup = new Map(
      availabilityMatches.map(avail => [avail.talentId, avail])
    )

    // Enhance match scores with availability data
    return matchScores.map(match => {
      const availability = availabilityLookup.get(match.talentId)
      if (availability) {
        // Update availability score with real-time data
        match.breakdown.availabilityScore = availability.availabilityScore
        
        // Recalculate total score
        const weights = {
          skills: 0.30,
          experience: 0.20,
          availability: 0.15,
          budget: 0.15,
          location: 0.10,
          culture: 0.05,
          velocity: 0.03,
          reliability: 0.02
        }
        
        match.totalScore = 
          (match.breakdown.skillsScore * weights.skills) +
          (match.breakdown.experienceScore * weights.experience) +
          (match.breakdown.availabilityScore * weights.availability) +
          (match.breakdown.budgetScore * weights.budget) +
          (match.breakdown.locationScore * weights.location) +
          (match.breakdown.cultureScore * weights.culture) +
          (match.breakdown.velocityScore * weights.velocity) +
          (match.breakdown.reliabilityScore * weights.reliability)

        // Add availability concerns to existing concerns
        match.concerns = [...match.concerns, ...availability.concerns]
      }
      return match
    }).sort((a, b) => b.totalScore - a.totalScore) // Re-sort by updated scores
  }

  /**
   * Save matches to database
   */
  private async saveMatches(
    talentRequestId: string,
    matchScores: MatchScore[],
    responseTimeGuarantee: number,
    correlationId: string
  ): Promise<GeneratedMatch[]> {
    
    const now = new Date()
    const responseDeadline = new Date(now.getTime() + responseTimeGuarantee * 60 * 60 * 1000)
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const generatedMatches: GeneratedMatch[] = []

    for (const [index, matchScore] of matchScores.entries()) {
      const generatedMatch: GeneratedMatch = {
        id: uuidv4(),
        talentRequestId,
        talentId: matchScore.talentId,
        score: matchScore.totalScore,
        breakdown: matchScore.breakdown,
        reasons: matchScore.reasons,
        concerns: matchScore.concerns,
        rank: index + 1,
        confidence: matchScore.confidence,
        predictedSuccess: matchScore.predictedSuccess,
        status: 'pending',
        createdAt: now,
        expiresAt,
        responseDeadline
      }

      // Save to database
      await prisma.match.create({
        data: {
          id: generatedMatch.id,
          requestId: talentRequestId,
          profileId: matchScore.talentId,
          score: matchScore.totalScore,
          scoreBreakdown: matchScore.breakdown,
          status: 'pending'
        }
      })

      generatedMatches.push(generatedMatch)
    }

    logInfo('Saved matches to database', {
      correlationId,
      matchCount: generatedMatches.length,
      responseDeadline
    })

    return generatedMatches
  }

  /**
   * Schedule response deadline notifications
   */
  private async scheduleResponseDeadlines(
    matches: GeneratedMatch[],
    correlationId: string
  ): Promise<void> {
    
    // This would typically integrate with a job queue system like Bull/Agenda
    // For now, we'll just log the scheduling
    
    for (const match of matches) {
      logInfo('Scheduled response deadline notification', {
        correlationId,
        matchId: match.id,
        talentId: match.talentId,
        deadline: match.responseDeadline
      })
      
      // TODO: Schedule actual notification job
      // await jobQueue.add('response-deadline-notification', {
      //   matchId: match.id,
      //   talentId: match.talentId,
      //   talentRequestId: match.talentRequestId
      // }, {
      //   delay: match.responseDeadline.getTime() - Date.now()
      // })
    }
  }

  /**
   * Get matches for a talent request
   */
  async getMatches(talentRequestId: string): Promise<GeneratedMatch[]> {
    const matches = await prisma.match.findMany({
      where: {
        requestId: talentRequestId
      },
      orderBy: { score: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            title: true,
            skills: true,
            rateMin: true,
            rateMax: true,
            location: true,
            rating: true,
            reviewCount: true
          }
        }
      }
    })

    return matches.map(match => ({
      id: match.id,
      talentRequestId: match.requestId,
      talentId: match.profileId,
      score: Number(match.score),
      breakdown: match.scoreBreakdown as any,
      reasons: [], // Would need to be calculated or stored separately
      concerns: [], // Would need to be calculated or stored separately
      rank: 0, // Would need to be calculated based on score ranking
      confidence: 0, // Would need to be calculated or stored separately
      predictedSuccess: 0, // Would need to be calculated or stored separately
      status: match.status as any,
      createdAt: match.createdAt,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days from now
      responseDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Default 3 days from now
    }))
  }

  /**
   * Update match status
   */
  async updateMatchStatus(
    matchId: string,
    status: 'pending' | 'viewed' | 'interested' | 'not_interested',
    correlationId?: string
  ): Promise<void> {
    
    await prisma.match.update({
      where: { id: matchId },
      data: { 
        status,
        updatedAt: new Date()
      }
    })

    logInfo('Updated match status', {
      correlationId,
      matchId,
      status
    })
  }

  /**
   * Get match statistics for a talent request
   */
  async getMatchStatistics(talentRequestId: string): Promise<{
    totalMatches: number
    averageScore: number
    statusBreakdown: Record<string, number>
    topSkillMatches: string[]
    responseRate: number
  }> {
    
    const matches = await prisma.match.findMany({
      where: { requestId: talentRequestId },
      include: {
        profile: {
          select: { skills: true }
        }
      }
    })

    const totalMatches = matches.length
    const averageScore = matches.reduce((sum: any, m: any) => sum + Number(m.score), 0) / totalMatches
    
    const statusBreakdown = matches.reduce((acc: any, match: any) => {
      acc[match.status] = (acc[match.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const skillCounts = new Map<string, number>()
    matches.forEach(match => {
      const skills = match.profile?.skills as any[] || []
      skills.forEach(skill => {
        skillCounts.set(skill.name, (skillCounts.get(skill.name) || 0) + 1)
      })
    })

    const topSkillMatches = Array.from(skillCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill)

    const respondedMatches = matches.filter(m => 
      ['interested', 'not_interested', 'contacted', 'hired'].includes(m.status)
    ).length
    
    const responseRate = totalMatches > 0 ? (respondedMatches / totalMatches) * 100 : 0

    return {
      totalMatches,
      averageScore: Math.round(averageScore * 100) / 100,
      statusBreakdown,
      topSkillMatches,
      responseRate: Math.round(responseRate * 100) / 100
    }
  }
}
