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
      eligibleTalent.map(talent => this.calculateTalentScore(requirement, talent, options))
    )
    
    // Step 3: Sort by total score (descending)
    const rankedMatches = scoredMatches
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((match, index) => ({ ...match, rank: index + 1 }))
    
    // Step 4: Apply business rules and filters
    return this.applyBusinessRules(rankedMatches, requirement, options)
  }

  private preFilterTalent(
    requirement: ProjectRequirement,
    talent: TalentProfile[]
  ): TalentProfile[] {
    return talent.filter(t => {
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

    const reasons = options.includeReasons !== false ? 
      this.generateMatchReasons(requirement, talent, {
        skillsScore,
        experienceScore,
        availabilityScore,
        budgetScore
      }) : []

    const concerns = options.includeConcerns !== false ? 
      this.generateConcerns(requirement, talent) : []

    const predictedSuccess = this.calculateSuccessProbability(requirement, talent)

    return {
      talentId: talent.id,
      totalScore: Math.round(totalScore * 100) / 100,
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
      confidence: this.calculateConfidence(talent, requirement),
      predictedSuccess
    }
  }

  // Helper methods will be implemented in the next part
  private isSkillMatch(required: string, actual: string): boolean {
    if (required.toLowerCase() === actual.toLowerCase()) return true
    
    const synonyms = skillSynonyms.get(required.toLowerCase()) || []
    return synonyms.some(synonym => 
      actual.toLowerCase().includes(synonym) || 
      synonym.includes(actual.toLowerCase())
    )
  }

  private isLevelSufficient(required: string, actual: string): boolean {
    const levels: { [key: string]: number } = { 'junior': 1, 'mid': 2, 'senior': 3, 'expert': 4 }
    return (levels[actual] || 1) >= (levels[required] || 1)
  }

  private checkAvailability(availability: AvailabilityWindow[], requirement: ProjectRequirement): boolean {
    const projectStart = requirement.startDate
    const projectEnd = new Date(projectStart.getTime() + requirement.duration.weeks * 7 * 24 * 60 * 60 * 1000)

    return availability.some(avail => {
      const overlap = this.calculateOverlap(
        { start: projectStart, end: projectEnd },
        { start: avail.startDate, end: avail.endDate }
      )
      return overlap.percentage > 0
    })
  }

  private calculateOverlap(project: { start: Date, end: Date }, availability: { start: Date, end: Date }) {
    const overlapStart = new Date(Math.max(project.start.getTime(), availability.start.getTime()))
    const overlapEnd = new Date(Math.min(project.end.getTime(), availability.end.getTime()))
    
    if (overlapStart >= overlapEnd) return { percentage: 0, days: 0 }

    const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
    const projectDays = (project.end.getTime() - project.start.getTime()) / (1000 * 60 * 60 * 24)
    
    return {
      percentage: Math.min(100, (overlapDays / projectDays) * 100),
      days: overlapDays
    }
  }

  private calculateSkillsScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    let totalScore = 0
    let maxPossibleScore = 0

    // Score required skills (higher weight)
    for (const reqSkill of requirement.requiredSkills) {
      maxPossibleScore += reqSkill.weight * 2 // Required skills count double
      
      const matchingSkill = this.findMatchingSkill(reqSkill, talent.skills)
      if (matchingSkill) {
        const levelScore = this.calculateLevelScore(reqSkill.level, matchingSkill.level)
        const experienceScore = this.calculateSkillExperienceScore(reqSkill, matchingSkill)
        const skillScore = (levelScore + experienceScore) / 2
        
        totalScore += skillScore * reqSkill.weight * 2
      }
    }

    // Score preferred skills (normal weight)
    for (const prefSkill of requirement.preferredSkills) {
      maxPossibleScore += prefSkill.weight
      
      const matchingSkill = this.findMatchingSkill(prefSkill, talent.skills)
      if (matchingSkill) {
        const levelScore = this.calculateLevelScore(prefSkill.level, matchingSkill.level)
        const experienceScore = this.calculateSkillExperienceScore(prefSkill, matchingSkill)
        const skillScore = (levelScore + experienceScore) / 2
        
        totalScore += skillScore * prefSkill.weight
      }
    }

    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0
  }

  private findMatchingSkill(reqSkill: SkillRequirement, talentSkills: Skill[]): Skill | null {
    // Direct match
    let match = talentSkills.find(s => 
      s.name.toLowerCase() === reqSkill.name.toLowerCase()
    )
    
    if (match) return match

    // Synonym match
    const synonyms = skillSynonyms.get(reqSkill.name.toLowerCase()) || []
    match = talentSkills.find(s => 
      synonyms.some(synonym => 
        s.name.toLowerCase().includes(synonym) || 
        synonym.includes(s.name.toLowerCase())
      )
    )

    if (match) return match

    // Technology stack expansion
    for (const [stackName, stackSkills] of techStacks.entries()) {
      if (reqSkill.name.toLowerCase() === stackName.toLowerCase()) {
        match = talentSkills.find(s => 
          stackSkills.some(stackSkill => 
            s.name.toLowerCase().includes(stackSkill.toLowerCase()) ||
            stackSkill.toLowerCase().includes(s.name.toLowerCase())
          )
        )
        if (match) return match
      }
    }

    return null
  }

  private calculateLevelScore(required: string, actual: string): number {
    return levelCompatibility[required]?.[actual] || 50
  }

  private calculateSkillExperienceScore(reqSkill: SkillRequirement, talentSkill: Skill): number {
    if (!reqSkill.yearsRequired) return 100

    const yearsDiff = talentSkill.yearsOfExperience - reqSkill.yearsRequired

    if (yearsDiff >= 0) {
      // Bonus for more experience
      return 100 + Math.min(yearsDiff * 10, 50)
    } else {
      // Penalty for less experience
      return Math.max(0, 100 + yearsDiff * 20)
    }
  }

  private calculateExperienceScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    if (talent.experience.length === 0) return 50

    // Calculate average years of experience
    const avgExperience = talent.experience.reduce((sum, exp) => {
      const years = this.parseDuration(exp.duration)
      return sum + years
    }, 0) / talent.experience.length

    // Industry experience bonus
    const industryExperience = talent.experience.filter(exp => 
      exp.industry.toLowerCase() === requirement.clientIndustry.toLowerCase()
    ).length

    const industryBonus = industryExperience > 0 ? 30 : 0

    return Math.min(100, avgExperience * 10 + industryBonus)
  }

  private calculateAvailabilityScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    const projectStart = requirement.startDate
    const projectEnd = new Date(projectStart.getTime() + requirement.duration.weeks * 7 * 24 * 60 * 60 * 1000)

    let bestScore = 0

    for (const availability of talent.availability) {
      const overlap = this.calculateOverlap(
        { start: projectStart, end: projectEnd },
        { start: availability.startDate, end: availability.endDate }
      )

      if (overlap.percentage > 0) {
        let score = overlap.percentage

        // Bonus for immediate availability
        if (availability.startDate <= projectStart) {
          score += 20
        }

        // Bonus for full availability during project
        if (overlap.percentage === 100) {
          score += 30
        }

        // Consider talent's capacity (not overbooked)
        const capacityScore = Math.max(0, 100 - availability.capacity)
        score = (score + capacityScore) / 2

        bestScore = Math.max(bestScore, score)
      }
    }

    return Math.min(bestScore, 100)
  }

  private calculateBudgetScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    const talentRate = talent.hourlyRate
    const budgetMin = requirement.budget.min
    const budgetMax = requirement.budget.max
    const budgetMid = (budgetMin + budgetMax) / 2

    // Perfect score if rate is within budget range
    if (talentRate >= budgetMin && talentRate <= budgetMax) {
      // Bonus for being closer to the middle of the range
      const distanceFromMid = Math.abs(talentRate - budgetMid)
      const maxDistance = (budgetMax - budgetMin) / 2
      return 100 - (distanceFromMid / maxDistance) * 20
    }

    // Penalty for being outside budget
    if (talentRate < budgetMin) {
      // May indicate lower quality, but could be a bargain
      const underBudgetPenalty = ((budgetMin - talentRate) / budgetMin) * 50
      return Math.max(20, 100 - underBudgetPenalty)
    } else {
      // Over budget - significant penalty
      const overBudgetPenalty = ((talentRate - budgetMax) / budgetMax) * 100
      return Math.max(0, 100 - overBudgetPenalty)
    }
  }

  private calculateLocationScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Timezone compatibility
    const timezoneScore = this.calculateTimezoneScore(requirement.location, talent.location)
    
    // Remote work preference alignment
    const remoteScore = this.calculateRemoteWorkScore(requirement.location, talent.location)

    return (timezoneScore + remoteScore) / 2
  }

  private calculateTimezoneScore(requirement: LocationRequirement, talent: Location): number {
    if (!requirement.timezone || !talent.timezone) return 50

    const timezoneDiff = Math.abs(
      this.getTimezoneOffset(requirement.timezone) - this.getTimezoneOffset(talent.timezone)
    )

    if (timezoneDiff <= 2) return 100
    if (timezoneDiff <= 4) return 80
    if (timezoneDiff <= 6) return 60
    if (timezoneDiff <= 8) return 40
    return 20
  }

  private calculateRemoteWorkScore(requirement: LocationRequirement, talent: Location): number {
    if (requirement.type === talent.remotePreference) return 100
    if (requirement.type === 'hybrid' || talent.remotePreference === 'hybrid') return 70
    return 30
  }

  private getTimezoneOffset(timezone: string): number {
    // Simplified timezone offset calculation
    const offsets: { [key: string]: number } = {
      'UTC': 0, 'EST': -5, 'CST': -6, 'MST': -7, 'PST': -8,
      'GMT': 0, 'CET': 1, 'EET': 2, 'JST': 9, 'AEST': 10
    }
    return offsets[timezone] || 0
  }

  private async calculateCultureScore(requirement: ProjectRequirement, talent: TalentProfile): Promise<number> {
    // Company size compatibility
    const companySizeScore = this.getCompanySizeCompatibility(
      requirement.companySize, 
      talent.preferences.preferredCompanySize
    )

    // Industry experience
    const industryScore = this.getIndustryExperience(
      requirement.clientIndustry,
      talent.experience
    )

    // Working style compatibility  
    const workStyleScore = this.getWorkStyleCompatibility(
      requirement.workStyle,
      talent.preferences.workStyle
    )

    return (companySizeScore + industryScore + workStyleScore) / 3
  }

  private getCompanySizeCompatibility(projectSize: string, talentPreference: string): number {
    if (projectSize === talentPreference) return 100
    if (projectSize === 'medium' || talentPreference === 'medium') return 70
    return 40
  }

  private getIndustryExperience(projectIndustry: string, experience: Experience[]): number {
    const industryExp = experience.filter(exp => 
      exp.industry.toLowerCase() === projectIndustry.toLowerCase()
    ).length

    return industryExp > 0 ? 100 : 0
  }

  private getWorkStyleCompatibility(projectStyle: string, talentStyle: string): number {
    if (projectStyle === talentStyle) return 100
    if (projectStyle === 'hybrid' || talentStyle === 'hybrid') return 70
    return 40
  }

  private calculateVelocityScore(talent: TalentProfile): number {
    // Based on rating and reviews - higher rating indicates faster delivery
    return talent.rating * 20 // Convert 1-5 to 0-100
  }

  private calculateReliabilityScore(talent: TalentProfile): number {
    if (talent.totalReviews === 0) return 50 // Default score

    const avgRating = talent.rating
    const totalReviews = talent.totalReviews

    // Weight by number of reviews
    const reviewWeight = Math.min(totalReviews / 10, 1) // Cap at 10 reviews
    const baseScore = avgRating * 20 // Convert 1-5 to 0-100

    return baseScore * reviewWeight + (1 - reviewWeight) * 50
  }

  private calculateSuccessProbability(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Calculate success probability based on multiple factors
    const skillsMatch = this.calculateSkillsScore(requirement, talent) / 100
    const experienceMatch = this.calculateExperienceScore(requirement, talent) / 100
    const availabilityMatch = this.calculateAvailabilityScore(requirement, talent) / 100
    const reliabilityMatch = this.calculateReliabilityScore(talent) / 100

    // Weighted average of key success factors
    const successProbability = 
      (skillsMatch * 0.4) +
      (experienceMatch * 0.3) +
      (availabilityMatch * 0.2) +
      (reliabilityMatch * 0.1)

    return Math.min(1, Math.max(0, successProbability))
  }

  private parseDuration(duration: string): number {
    // Simple duration parser - can be enhanced
    const match = duration.match(/(\d+)\s*(year|month|week|day)/i)
    if (!match) return 0
    
    const value = parseInt(match[1])
    const unit = match[2].toLowerCase()
    
    switch (unit) {
      case 'year': return value * 12
      case 'month': return value
      case 'week': return value / 4
      case 'day': return value / 30
      default: return 0
    }
  }

  private generateMatchReasons(
    requirement: ProjectRequirement, 
    talent: TalentProfile, 
    scores: { skillsScore: number, experienceScore: number, availabilityScore: number, budgetScore: number }
  ): string[] {
    const reasons: string[] = []

    if (scores.skillsScore >= 80) {
      const matchedSkills = requirement.requiredSkills
        .filter(req => talent.skills.some(s => this.isSkillMatch(req.name, s.name)))
        .map(req => req.name)
      reasons.push(`Perfect skill match for ${matchedSkills.join(', ')}`)
    }

    if (scores.experienceScore >= 80) {
      reasons.push(`Strong experience in ${requirement.clientIndustry} industry`)
    }

    if (scores.availabilityScore >= 90) {
      reasons.push('Available immediately for your project')
    }

    if (scores.budgetScore >= 90) {
      reasons.push(`Rate is within your budget range`)
    }

    if (talent.rating >= 4.5) {
      reasons.push(`Excellent track record with ${talent.rating}/5 rating`)
    }

    // Check for technology stack matches
    const techStackMatches = Array.from(techStacks.entries()).filter(([stackName, stackSkills]) => {
      const hasStackSkill = talent.skills.some(skill => 
        stackSkills.some(stackSkill => this.isSkillMatch(stackSkill, skill.name))
      )
      return hasStackSkill && requirement.requiredSkills.some(req => 
        req.name.toLowerCase() === stackName.toLowerCase()
      )
    })

    if (techStackMatches.length > 0) {
      reasons.push(`Technology stack perfectly matches your requirements`)
    }

    return reasons
  }

  private generateConcerns(requirement: ProjectRequirement, talent: TalentProfile): string[] {
    const concerns: string[] = []

    if (talent.hourlyRate > requirement.budget.max * 1.2) {
      concerns.push(`Rate is ${Math.round((talent.hourlyRate / requirement.budget.max - 1) * 100)}% above budget`)
    }

    const missingSkills = requirement.requiredSkills.filter(req => 
      !talent.skills.some(s => this.isSkillMatch(req.name, s.name))
    )
    if (missingSkills.length > 0) {
      concerns.push(`Missing required skills: ${missingSkills.map(s => s.name).join(', ')}`)
    }

    if (talent.rating < 3.5) {
      concerns.push('Below average performance rating')
    }

    // Check availability concerns
    const projectStart = requirement.startDate
    const earliestAvailability = talent.availability
      .map(avail => avail.startDate)
      .sort((a, b) => a.getTime() - b.getTime())[0]

    if (earliestAvailability && earliestAvailability > projectStart) {
      const daysDiff = Math.ceil((earliestAvailability.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
      concerns.push(`Available in ${daysDiff} days (project starts in ${Math.ceil((projectStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days)`)
    }

    return concerns
  }

  private calculateConfidence(talent: TalentProfile, requirement: ProjectRequirement): number {
    // Calculate confidence based on data completeness and consistency
    let confidence = 0.5 // Base confidence

    // More reviews = higher confidence
    confidence += Math.min(talent.totalReviews / 20, 0.3)

    // Complete profile = higher confidence
    if (talent.skills.length > 0) confidence += 0.1
    if (talent.experience.length > 0) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  private applyBusinessRules(
    matches: MatchScore[], 
    requirement: ProjectRequirement, 
    options: MatchingOptions
  ): MatchScore[] {
    let filteredMatches = matches

    // Apply minimum score filter
    const minScore = options.minScore || 30
    filteredMatches = filteredMatches.filter(match => match.totalScore >= minScore)

    // Apply maximum results limit
    const maxResults = options.maxResults || 50
    filteredMatches = filteredMatches.slice(0, maxResults)

    return filteredMatches
  }
}
