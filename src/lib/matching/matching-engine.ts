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
    const levels = { 'junior': 1, 'mid': 2, 'senior': 3, 'expert': 4 }
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

  // Placeholder methods for scoring functions
  private calculateSkillsScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Implementation will be added
    return 80
  }

  private calculateExperienceScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Implementation will be added
    return 75
  }

  private calculateAvailabilityScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Implementation will be added
    return 90
  }

  private calculateBudgetScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Implementation will be added
    return 85
  }

  private calculateLocationScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Implementation will be added
    return 80
  }

  private async calculateCultureScore(requirement: ProjectRequirement, talent: TalentProfile): Promise<number> {
    // Implementation will be added
    return 70
  }

  private calculateVelocityScore(talent: TalentProfile): number {
    // Implementation will be added
    return 75
  }

  private calculateReliabilityScore(talent: TalentProfile): number {
    // Implementation will be added
    return 80
  }

  private calculateSuccessProbability(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Implementation will be added
    return 0.85
  }

  private generateMatchReasons(
    requirement: ProjectRequirement, 
    talent: TalentProfile, 
    scores: { skillsScore: number, experienceScore: number, availabilityScore: number, budgetScore: number }
  ): string[] {
    // Implementation will be added
    return ['Good skill match', 'Available for project']
  }

  private generateConcerns(requirement: ProjectRequirement, talent: TalentProfile): string[] {
    // Implementation will be added
    return []
  }

  private calculateConfidence(talent: TalentProfile, requirement: ProjectRequirement): number {
    // Implementation will be added
    return 0.8
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
