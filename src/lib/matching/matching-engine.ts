import { z } from 'zod'

// Type definitions
export interface Skill {
  name: string
  level: 'junior' | 'mid' | 'senior' | 'expert'
  yearsOfExperience: number
  category: 'frontend' | 'backend' | 'devops' | 'design' | 'data' | 'mobile' | 'other'
}

export interface Experience {
  company: string
  role: string
  duration: string
  industry: string
  technologies: string[]
  achievements: string[]
}

export interface AvailabilityWindow {
  startDate: Date
  endDate: Date
  capacity: number // 0-100 percentage
  timezone: string
}

export interface Location {
  country: string
  city: string
  timezone: string
  remotePreference: 'remote' | 'hybrid' | 'onsite'
}

export interface Certification {
  name: string
  issuer: string
  issueDate: Date
  expiryDate?: Date
  credentialId?: string
}

export interface ProjectHistory {
  title: string
  description: string
  duration: number // weeks
  technologies: string[]
  outcome: 'completed' | 'ongoing' | 'cancelled'
  rating: number // 1-5
  feedback: string
  completedAt?: Date // When the project was completed
}

export interface Rating {
  score: number // 1-5
  review: string
  reviewer: string
  date: Date
  category: 'technical' | 'communication' | 'delivery' | 'overall'
}

export interface TalentPreferences {
  preferredCompanySize: 'startup' | 'small' | 'medium' | 'enterprise'
  workStyle: 'agile' | 'waterfall' | 'hybrid'
  communicationStyle: 'formal' | 'casual' | 'mixed'
  preferredRate: number
  minimumRate: number
}

export interface TalentProfile {
  id: string
  name: string
  skills: Skill[]
  experience: Experience[]
  availability: AvailabilityWindow[]
  hourlyRate: number
  location: Location
  languages: string[]
  certifications: Certification[]
  pastProjects: ProjectHistory[]
  ratings: Rating[]
  companyId: string
  timezone: string
  preferences: TalentPreferences
  isAvailable: boolean
  rating: number
  totalReviews: number
}

export interface SkillRequirement {
  name: string
  level: 'junior' | 'mid' | 'senior' | 'expert'
  weight: number // 1-10, how critical this skill is
  yearsRequired?: number
  isRequired: boolean
}

export interface BudgetRange {
  min: number
  max: number
  currency: string
}

export interface Duration {
  weeks: number
  startDate: Date
  endDate: Date
}

export interface LocationRequirement {
  type: 'remote' | 'hybrid' | 'onsite'
  timezone?: string
  country?: string
  city?: string
}

export interface ProjectRequirement {
  id: string
  title: string
  description: string
  requiredSkills: SkillRequirement[]
  preferredSkills: SkillRequirement[]
  budget: BudgetRange
  duration: Duration
  startDate: Date
  location: LocationRequirement
  urgency: 'low' | 'medium' | 'high' | 'critical'
  projectType: 'development' | 'consulting' | 'design' | 'data' | 'other'
  teamSize: number
  clientIndustry: string
  companySize: 'startup' | 'small' | 'medium' | 'enterprise'
  workStyle: 'agile' | 'waterfall' | 'hybrid'
}

export interface MatchScore {
  talentId: string
  totalScore: number
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
}

export interface MatchingOptions {
  maxResults?: number
  minScore?: number
  includeReasons?: boolean
  includeConcerns?: boolean
  enableML?: boolean
  cacheResults?: boolean
  realTimeUpdates?: boolean
  customWeights?: Partial<ProjectWeights>
}

export interface ProjectWeights {
  skills: number
  experience: number
  availability: number
  budget: number
  location: number
  culture: number
  velocity: number
  reliability: number
}

// Technology stack expansion mapping
const techStacks: Map<string, string[]> = new Map([
  ['MEAN Stack', ['MongoDB', 'Express', 'Angular', 'Node.js']],
  ['MERN Stack', ['MongoDB', 'Express', 'React', 'Node.js']],
  ['LAMP Stack', ['Linux', 'Apache', 'MySQL', 'PHP']],
  ['JAMstack', ['JavaScript', 'APIs', 'Markup']],
  ['Serverless', ['AWS Lambda', 'Azure Functions', 'Google Cloud Functions']],
  ['Microservices', ['Docker', 'Kubernetes', 'Service Mesh']],
  ['AI/ML Stack', ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn']],
  ['DevOps Stack', ['Docker', 'Kubernetes', 'Jenkins', 'Terraform']],
  ['Mobile Stack', ['React Native', 'Flutter', 'Swift', 'Kotlin']],
  ['Data Stack', ['Python', 'Pandas', 'NumPy', 'SQL', 'Spark']]
])

// Skill synonyms mapping
const skillSynonyms: Map<string, string[]> = new Map([
  ['javascript', ['js', 'node.js', 'nodejs', 'es6', 'typescript']],
  ['react', ['reactjs', 'react.js', 'nextjs', 'next.js']],
  ['python', ['django', 'flask', 'fastapi', 'pandas', 'numpy']],
  ['aws', ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation']],
  ['docker', ['containerization', 'kubernetes', 'k8s']],
  ['sql', ['mysql', 'postgresql', 'mongodb', 'database']],
  ['html', ['html5', 'css', 'frontend']],
  ['css', ['scss', 'sass', 'less', 'styling']],
  ['git', ['github', 'gitlab', 'version control']],
  ['agile', ['scrum', 'kanban', 'sprint']],
  ['api', ['rest', 'graphql', 'webservices']],
  ['testing', ['jest', 'cypress', 'selenium', 'unit testing']],
  ['typescript', ['ts', 'typed javascript']],
  ['node.js', ['nodejs', 'node', 'server-side javascript']],
  ['angular', ['angularjs', 'angular 2+']],
  ['vue.js', ['vue', 'vuejs']],
  ['mongodb', ['mongo', 'nosql']],
  ['postgresql', ['postgres', 'psql']],
  ['redis', ['cache', 'in-memory database']],
  ['elasticsearch', ['elastic', 'search engine']]
])

// Level compatibility matrix
const levelCompatibility: { [key: string]: { [key: string]: number } } = {
  'junior': { 'junior': 100, 'mid': 110, 'senior': 120, 'expert': 130 },
  'mid': { 'junior': 75, 'mid': 100, 'senior': 110, 'expert': 120 },
  'senior': { 'junior': 50, 'mid': 75, 'senior': 100, 'expert': 110 },
  'expert': { 'junior': 30, 'mid': 60, 'senior': 90, 'expert': 100 }
}

// Industry compatibility matrix
const industryCompatibility: { [key: string]: { [key: string]: number } } = {
  'technology': { 'technology': 100, 'finance': 85, 'healthcare': 80, 'e-commerce': 95 },
  'finance': { 'technology': 85, 'finance': 100, 'healthcare': 75, 'e-commerce': 90 },
  'healthcare': { 'technology': 80, 'finance': 75, 'healthcare': 100, 'e-commerce': 70 },
  'e-commerce': { 'technology': 95, 'finance': 90, 'healthcare': 70, 'e-commerce': 100 }
}

export class MatchingEngine {
  private readonly defaultWeights: ProjectWeights = {
    skills: 0.30,           // 30% - Most important
    experience: 0.20,       // 20% - Proven track record
    availability: 0.15,     // 15% - Can they start when needed
    budget: 0.15,          // 15% - Cost compatibility  
    location: 0.10,        // 10% - Time zone/location fit
    culture: 0.05,         // 5% - Company culture fit
    velocity: 0.03,        // 3% - How fast they deliver
    reliability: 0.02      // 2% - Past performance reliability
  }

  async findMatches(
    requirement: ProjectRequirement,
    availableTalent: TalentProfile[],
    options: MatchingOptions = {}
  ): Promise<MatchScore[]> {
    
    // Step 1: Pre-filter talent based on hard requirements
    const eligibleTalent = this.preFilterTalent(requirement, availableTalent)
    
    // Step 2: Calculate scores for each talent
    const scoredMatches = await Promise.all(
      eligibleTalent.map((talent: TalentProfile) => this.calculateTalentScore(requirement, talent, options))
    )
    
    // Step 3: Sort by total score (descending)
    const rankedMatches = scoredMatches
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((match: MatchScore, index: number) => ({ ...match, rank: index + 1 }))
    
    // Step 4: Apply business rules and filters
    return this.applyBusinessRules(rankedMatches, requirement, options)
  }

  private preFilterTalent(
    requirement: ProjectRequirement,
    talent: TalentProfile[]
  ): TalentProfile[] {
    return talent.filter((t: TalentProfile) => {
      // Must be available
      if (!t.isAvailable) return false

      // Must have at least one required skill
      const hasRequiredSkill = requirement.requiredSkills.some(reqSkill =>
        t.skills.some(tSkill => 
          this.isSkillMatch(reqSkill.name, tSkill.name) &&
          this.isLevelSufficient(reqSkill.level, tSkill.level)
        )
      )

      // Must be available during project timeframe
      const isAvailable = this.checkAvailability(t.availability, requirement)
      
      // Budget must be within reasonable range (within 150% of max budget)
      const budgetCompatible = t.hourlyRate <= (requirement.budget.max * 1.5)

      return hasRequiredSkill && isAvailable && budgetCompatible
    })
  }

  private async calculateTalentScore(
    requirement: ProjectRequirement,
    talent: TalentProfile,
    options: MatchingOptions
  ): Promise<MatchScore> {
    
    const weights = { ...this.defaultWeights, ...options.customWeights }
    
    const skillsScore = this.calculateSkillsScore(requirement, talent)
    const experienceScore = this.calculateExperienceScore(requirement, talent)
    const availabilityScore = this.calculateAvailabilityScore(requirement, talent)
    const budgetScore = this.calculateBudgetScore(requirement, talent)
    const locationScore = this.calculateLocationScore(requirement, talent)
    const cultureScore = await this.calculateCultureScore(requirement, talent)
    const velocityScore = this.calculateVelocityScore(talent)
    const reliabilityScore = this.calculateReliabilityScore(talent)

    const totalScore = 
      (skillsScore * weights.skills) +
      (experienceScore * weights.experience) +
      (availabilityScore * weights.availability) +
      (budgetScore * weights.budget) +
      (locationScore * weights.location) +
      (cultureScore * weights.culture) +
      (velocityScore * weights.velocity) +
      (reliabilityScore * weights.reliability)

    const reasons = this.generateReasons(requirement, talent, {
      skillsScore,
      experienceScore,
      availabilityScore,
      budgetScore,
      locationScore,
      cultureScore,
      velocityScore,
      reliabilityScore
    })

    const concerns = this.generateConcerns(requirement, talent, {
      skillsScore,
      experienceScore,
      availabilityScore,
      budgetScore,
      locationScore,
      cultureScore,
      velocityScore,
      reliabilityScore
    })

    const confidence = this.calculateConfidence(talent, requirement)
    const predictedSuccess = this.predictSuccess(talent, requirement)

    return {
      talentId: talent.id,
      totalScore,
      breakdown: {
        skillsScore,
        experienceScore,
        availabilityScore,
        budgetScore,
        locationScore,
        cultureScore,
        velocityScore,
        reliabilityScore
      },
      reasons,
      concerns,
      rank: 0, // Will be set later
      confidence,
      predictedSuccess
    }
  }

  private calculateSkillsScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    let totalScore = 0
    let totalWeight = 0

    // Calculate required skills score
    for (const reqSkill of requirement.requiredSkills) {
      const bestMatch = talent.skills
        .filter(skill => this.isSkillMatch(reqSkill.name, skill.name))
        .sort((a, b) => this.getSkillLevelScore(b.level) - this.getSkillLevelScore(a.level))[0]

      if (bestMatch) {
        const levelCompatibility = this.getLevelCompatibility(reqSkill.level, bestMatch.level)
        const experienceBonus = Math.min(bestMatch.yearsOfExperience / 5, 1) * 0.2 // Max 20% bonus
        const skillScore = (levelCompatibility / 100) * (1 + experienceBonus)
        totalScore += skillScore * reqSkill.weight
        totalWeight += reqSkill.weight
      }
    }

    // Calculate preferred skills bonus
    for (const prefSkill of requirement.preferredSkills) {
      const bestMatch = talent.skills
        .filter(skill => this.isSkillMatch(prefSkill.name, skill.name))
        .sort((a, b) => this.getSkillLevelScore(b.level) - this.getSkillLevelScore(a.level))[0]

      if (bestMatch) {
        const levelCompatibility = this.getLevelCompatibility(prefSkill.level, bestMatch.level)
        const bonusScore = (levelCompatibility / 100) * prefSkill.weight * 0.5 // 50% weight for preferred skills
        totalScore += bonusScore
        totalWeight += prefSkill.weight * 0.5
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  private calculateExperienceScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    let score = 0

    // Industry experience
    const industryMatch = talent.experience.some(exp => 
      this.isIndustryMatch(exp.industry, requirement.clientIndustry)
    )
    if (industryMatch) score += 0.3

    // Project type experience
    const projectTypeMatch = talent.pastProjects.some(project => 
      this.isProjectTypeMatch(project, requirement.projectType)
    )
    if (projectTypeMatch) score += 0.2

    // Company size experience
    const companySizeMatch = talent.experience.some(exp => 
      this.isCompanySizeMatch(exp, requirement.companySize)
    )
    if (companySizeMatch) score += 0.2

    // Technology stack overlap
    const techOverlap = this.calculateTechnologyOverlap(requirement, talent)
    score += techOverlap * 0.3

    return Math.min(score, 1)
  }

  private calculateAvailabilityScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    const projectStart = requirement.startDate
    const projectEnd = new Date(projectStart.getTime() + (requirement.duration.weeks * 7 * 24 * 60 * 60 * 1000))

    let totalCapacity = 0
    let overlapDays = 0

    for (const availability of talent.availability) {
      const overlap = this.calculateDateOverlap(
        availability.startDate,
        availability.endDate,
        projectStart,
        projectEnd
      )

      if (overlap > 0) {
        overlapDays += overlap
        totalCapacity += (availability.capacity / 100) * overlap
      }
    }

    if (overlapDays === 0) return 0

    const averageCapacity = totalCapacity / overlapDays
    const projectDuration = requirement.duration.weeks * 7

    // Score based on capacity and overlap
    const capacityScore = averageCapacity
    const overlapScore = Math.min(overlapDays / projectDuration, 1)

    return (capacityScore * 0.7) + (overlapScore * 0.3)
  }

  private calculateBudgetScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    const { min: reqMin, max: reqMax } = requirement.budget
    const talentRate = talent.hourlyRate

    // Perfect match: talent rate is within budget range
    if (talentRate >= reqMin && talentRate <= reqMax) {
      return 1.0
    }

    // Calculate penalty for being outside budget
    if (talentRate < reqMin) {
      // Under budget - small penalty
      const penalty = (reqMin - talentRate) / reqMin
      return Math.max(0.8 - penalty * 0.2, 0.5)
    } else {
      // Over budget - larger penalty
      const penalty = (talentRate - reqMax) / reqMax
      return Math.max(0.6 - penalty * 0.4, 0.2)
    }
  }

  private calculateLocationScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    const { location: reqLocation } = requirement
    const { location: talentLocation } = talent

    // Remote work compatibility
    if (reqLocation.type === 'remote') {
      return 1.0 // Perfect for remote work
    }

    // Timezone compatibility
    if (reqLocation.timezone && talentLocation.timezone) {
      const timezoneDiff = this.calculateTimezoneDifference(reqLocation.timezone, talentLocation.timezone)
      if (timezoneDiff <= 2) return 1.0
      if (timezoneDiff <= 4) return 0.8
      if (timezoneDiff <= 6) return 0.6
      return 0.3
    }

    // Location-based scoring
    if (reqLocation.country && talentLocation.country) {
      if (reqLocation.country === talentLocation.country) {
        if (reqLocation.city && talentLocation.city) {
          return reqLocation.city === talentLocation.city ? 1.0 : 0.8
        }
        return 0.9
      }
      return 0.5
    }

    return 0.7 // Default score
  }

  private async calculateCultureScore(requirement: ProjectRequirement, talent: TalentProfile): Promise<number> {
    let score = 0

    // Work style compatibility
    if (requirement.workStyle === talent.preferences.workStyle) {
      score += 0.4
    } else if (this.isWorkStyleCompatible(requirement.workStyle, talent.preferences.workStyle)) {
      score += 0.2
    }

    // Communication style compatibility
    if (requirement.workStyle === 'agile' && talent.preferences.communicationStyle === 'casual') {
      score += 0.3
    } else if (requirement.workStyle === 'waterfall' && talent.preferences.communicationStyle === 'formal') {
      score += 0.3
    }

    // Company size preference
    if (requirement.companySize === talent.preferences.preferredCompanySize) {
      score += 0.3
    }

    return Math.min(score, 1)
  }

  private calculateVelocityScore(talent: TalentProfile): number {
    if (talent.pastProjects.length === 0) return 0.5

    const completedProjects = talent.pastProjects.filter(p => p.outcome === 'completed')
    if (completedProjects.length === 0) return 0.3

    // Calculate average project duration vs expected
    const avgDuration = completedProjects.reduce((sum: any, p: any) => sum + p.duration, 0) / completedProjects.length
    
    // Score based on project completion speed (lower duration = higher score)
    const baseScore = Math.max(0.5, 1 - (avgDuration - 4) / 20) // Normalize around 4 weeks
    
    // Bonus for on-time completion
    const onTimeBonus = completedProjects.filter(p => p.rating >= 4).length / completedProjects.length * 0.2

    return Math.min(baseScore + onTimeBonus, 1)
  }

  private calculateReliabilityScore(talent: TalentProfile): number {
    if (talent.ratings.length === 0) return 0.5

    // Average rating
    const avgRating = talent.ratings.reduce((sum: any, r: any) => sum + r.score, 0) / talent.ratings.length
    
    // Rating consistency
    const ratingVariance = talent.ratings.reduce((sum: any, r: any) => sum + Math.pow(r.score - avgRating, 2), 0) / talent.ratings.length
    const consistencyScore = Math.max(0, 1 - ratingVariance / 2)

    // Project completion rate
    const completionRate = talent.pastProjects.filter(p => p.outcome === 'completed').length / talent.pastProjects.length

    return (avgRating / 5 * 0.6) + (consistencyScore * 0.2) + (completionRate * 0.2)
  }

  private generateReasons(requirement: ProjectRequirement, talent: TalentProfile, scores: any): string[] {
    const reasons: string[] = []

    if (scores.skillsScore > 0.8) {
      const matchingSkills = requirement.requiredSkills
        .filter(req => talent.skills.some(t => this.isSkillMatch(req.name, t.name)))
        .map(req => req.name)
      reasons.push(`Strong match in ${matchingSkills.join(', ')}`)
    }

    if (scores.experienceScore > 0.8) {
      reasons.push('Relevant industry and project experience')
    }

    if (scores.availabilityScore > 0.9) {
      reasons.push('Excellent availability during project timeline')
    }

    if (scores.budgetScore > 0.9) {
      reasons.push('Rate fits perfectly within budget range')
    }

    if (scores.locationScore > 0.9) {
      reasons.push('Ideal location/timezone compatibility')
    }

    if (talent.rating >= 4.5) {
      reasons.push(`High rating (${talent.rating}/5) from ${talent.totalReviews} reviews`)
    }

    return reasons
  }

  private generateConcerns(requirement: ProjectRequirement, talent: TalentProfile, scores: any): string[] {
    const concerns: string[] = []

    if (scores.skillsScore < 0.6) {
      concerns.push('Limited experience with required skills')
    }

    if (scores.availabilityScore < 0.7) {
      concerns.push('Limited availability during project timeline')
    }

    if (scores.budgetScore < 0.7) {
      concerns.push('Rate may be outside budget range')
    }

    if (scores.locationScore < 0.6) {
      concerns.push('Potential timezone/location challenges')
    }

    if (talent.rating < 3.5 && talent.totalReviews > 0) {
      concerns.push(`Lower rating (${talent.rating}/5) may indicate reliability issues`)
    }

    if (talent.pastProjects.length < 3) {
      concerns.push('Limited project history')
    }

    return concerns
  }

  private calculateConfidence(talent: TalentProfile, requirement: ProjectRequirement): number {
    let confidence = 0.5 // Base confidence

    // More data = higher confidence
    if (talent.totalReviews > 10) confidence += 0.2
    if (talent.pastProjects.length > 5) confidence += 0.2
    if (talent.experience.length > 3) confidence += 0.1

    // Recent activity
    const recentProjects = talent.pastProjects.filter(p => 
      new Date().getTime() - new Date(p.completedAt || Date.now()).getTime() < 365 * 24 * 60 * 60 * 1000
    )
    if (recentProjects.length > 0) confidence += 0.1

    return Math.min(confidence, 1)
  }

  private predictSuccess(talent: TalentProfile, requirement: ProjectRequirement): number {
    let successProbability = 0.5

    // Based on past performance
    if (talent.rating >= 4.5) successProbability += 0.2
    if (talent.rating >= 4.0) successProbability += 0.1

    // Based on project completion rate
    const completionRate = talent.pastProjects.filter(p => p.outcome === 'completed').length / talent.pastProjects.length
    successProbability += completionRate * 0.2

    // Based on experience level
    const avgExperience = talent.skills.reduce((sum: any, s: any) => sum + s.yearsOfExperience, 0) / talent.skills.length
    if (avgExperience >= 5) successProbability += 0.1

    return Math.min(successProbability, 1)
  }

  // Helper methods
  private isSkillMatch(requiredSkill: string, talentSkill: string): boolean {
    const normalizedRequired = requiredSkill.toLowerCase().trim()
    const normalizedTalent = talentSkill.toLowerCase().trim()

    // Direct match
    if (normalizedRequired === normalizedTalent) return true

    // Synonym match
    const synonyms = skillSynonyms.get(normalizedRequired) || []
    if (synonyms.includes(normalizedTalent)) return true

    // Tech stack expansion
    for (const [stack, technologies] of techStacks) {
      if (technologies.some(tech => tech.toLowerCase() === normalizedRequired)) {
        if (technologies.some(tech => tech.toLowerCase() === normalizedTalent)) return true
      }
    }

    return false
  }

  private isLevelSufficient(requiredLevel: string, talentLevel: string): boolean {
    const levelScores: Record<string, number> = { 'junior': 1, 'mid': 2, 'senior': 3, 'expert': 4 }
    return (levelScores[talentLevel] || 1) >= (levelScores[requiredLevel] || 1)
  }

  private getSkillLevelScore(level: 'junior' | 'mid' | 'senior' | 'expert'): number {
    const scores = { 'junior': 1, 'mid': 2, 'senior': 3, 'expert': 4 }
    return scores[level] || 1
  }

  private getLevelCompatibility(requiredLevel: string, talentLevel: string): number {
    return levelCompatibility[requiredLevel]?.[talentLevel] || 50
  }

  private checkAvailability(availability: AvailabilityWindow[], requirement: ProjectRequirement): boolean {
    const projectStart = requirement.startDate
    const projectEnd = new Date(projectStart.getTime() + (requirement.duration.weeks * 7 * 24 * 60 * 60 * 1000))

    return availability.some(window => {
      const overlap = this.calculateDateOverlap(
        window.startDate,
        window.endDate,
        projectStart,
        projectEnd
      )
      return overlap > 0 && window.capacity > 50
    })
  }

  private calculateDateOverlap(start1: Date, end1: Date, start2: Date, end2: Date): number {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()))
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()))
    
    if (overlapStart >= overlapEnd) return 0
    
    return (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
  }

  private calculateTimezoneDifference(tz1: string, tz2: string): number {
    // Simplified timezone difference calculation
    const tzOffsets: { [key: string]: number } = {
      'UTC': 0, 'EST': -5, 'PST': -8, 'CST': -6, 'MST': -7,
      'GMT': 0, 'CET': 1, 'JST': 9, 'AEST': 10, 'IST': 5.5
    }
    
    const offset1 = tzOffsets[tz1] || 0
    const offset2 = tzOffsets[tz2] || 0
    
    return Math.abs(offset1 - offset2)
  }

  private isIndustryMatch(expIndustry: string, reqIndustry: string): boolean {
    const normalizedExp = expIndustry.toLowerCase()
    const normalizedReq = reqIndustry.toLowerCase()
    
    return normalizedExp === normalizedReq || 
           industryCompatibility[normalizedExp]?.[normalizedReq] > 80
  }

  private isProjectTypeMatch(project: ProjectHistory, reqType: string): boolean {
    const typeMapping: { [key: string]: string[] } = {
      'development': ['development', 'programming', 'coding', 'software'],
      'consulting': ['consulting', 'advisory', 'strategy'],
      'design': ['design', 'ui/ux', 'graphic design'],
      'data': ['data', 'analytics', 'machine learning', 'ai']
    }
    
    const projectDesc = project.description.toLowerCase()
    const reqTypeKeywords = typeMapping[reqType] || []
    
    return reqTypeKeywords.some(keyword => projectDesc.includes(keyword))
  }

  private isCompanySizeMatch(experience: Experience, reqSize: string): boolean {
    // Simplified company size matching
    const sizeKeywords: { [key: string]: string[] } = {
      'startup': ['startup', 'early-stage', 'seed'],
      'small': ['small', 'sme', 'medium'],
      'medium': ['medium', 'mid-size'],
      'enterprise': ['enterprise', 'large', 'fortune', 'multinational']
    }
    
    const companyDesc = experience.company.toLowerCase()
    const reqSizeKeywords = sizeKeywords[reqSize] || []
    
    return reqSizeKeywords.some(keyword => companyDesc.includes(keyword))
  }

  private calculateTechnologyOverlap(requirement: ProjectRequirement, talent: TalentProfile): number {
    const reqTechnologies = [
      ...requirement.requiredSkills.map(s => s.name),
      ...requirement.preferredSkills.map(s => s.name)
    ]
    
    const talentTechnologies = [
      ...talent.skills.map(s => s.name),
      ...talent.experience.flatMap(e => e.technologies),
      ...talent.pastProjects.flatMap(p => p.technologies)
    ]
    
    const matches = reqTechnologies.filter(reqTech =>
      talentTechnologies.some(talentTech => this.isSkillMatch(reqTech, talentTech))
    )
    
    return matches.length / reqTechnologies.length
  }

  private isWorkStyleCompatible(style1: string, style2: string): boolean {
    const compatibility: { [key: string]: string[] } = {
      'agile': ['hybrid'],
      'waterfall': ['hybrid'],
      'hybrid': ['agile', 'waterfall']
    }
    
    return compatibility[style1]?.includes(style2) || false
  }

  private applyBusinessRules(matches: MatchScore[], requirement: ProjectRequirement, options: MatchingOptions): MatchScore[] {
    let filteredMatches = matches

    // Apply minimum score filter
    if (options.minScore !== undefined) {
      filteredMatches = filteredMatches.filter(match => match.totalScore >= options.minScore!)
    }

    // Apply maximum results limit
    if (options.maxResults) {
      filteredMatches = filteredMatches.slice(0, options.maxResults)
    }

    // Business rule: Prefer talent with higher ratings for critical projects
    if (requirement.urgency === 'critical') {
      filteredMatches.sort((a, b) => {
        // This would need access to talent data, simplified for now
        return b.totalScore - a.totalScore
      })
    }

    return filteredMatches
  }
}
