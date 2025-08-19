import { z } from 'zod'
import { EnhancedSkillMatcher } from './enhanced-skill-matcher'
import { DynamicWeightsCalculator } from './dynamic-weights'
import { FairnessAnalyzer } from './fairness-analyzer'

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
  includeBiasAnalysis?: boolean
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

export interface SkillDependency {
  skill: string
  importance: number
  type: 'prerequisite' | 'component' | 'framework' | 'tool'
}

interface TransferableSkill {
  fromSkill: string
  toSkill: string
  transferRate: number // 0-1, how much skill transfers
}

interface LearningPath {
  targetSkill: string
  prerequisites: string[]
  estimatedTimeWeeks: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface MarketData {
  averageRate: number
  demandLevel: number // 0-1
  supplyLevel: number // 0-1
}

interface BudgetAnalysis {
  overallScore: number
  budgetFit: number
  marketPosition: number
  valueScore: number
  negotiationPotential: number
  expectedROI: number
  costRisk: number
}

interface BiasDetectionResult {
  hasBias: boolean
  biasTypes: string[]
  fairnessScore: number
  recommendations: string[]
}

interface FairnessMetrics {
  demographicParity: number
  equalOpportunity: number
  calibration: number
  overallFairness: number
}

interface SkillMatchResult {
  skill: string
  score: number
  level: 'junior' | 'mid' | 'senior' | 'expert'
  hasExperience: boolean
  experienceYears: number
  transferableFrom?: string[]
  learningPath?: LearningPath
  overallScore: number
}

interface SkillGap {
  skill: string
  requiredLevel: 'junior' | 'mid' | 'senior' | 'expert'
  currentLevel?: 'junior' | 'mid' | 'senior' | 'expert'
  severity: 'critical' | 'major' | 'minor'
  canLearn: boolean
  learningPath?: LearningPath
}

export class MatchingEngine {
  private enhancedSkillMatcher: EnhancedSkillMatcher
  private dynamicWeightsCalculator: DynamicWeightsCalculator
  private fairnessAnalyzer: FairnessAnalyzer

  constructor() {
    this.enhancedSkillMatcher = new EnhancedSkillMatcher()
    this.dynamicWeightsCalculator = new DynamicWeightsCalculator()
    this.fairnessAnalyzer = new FairnessAnalyzer()
  }

  private get defaultWeights(): ProjectWeights {
    return {
      skills: 0.30,           // 30% - Most important
      experience: 0.20,       // 20% - Proven track record
      availability: 0.15,     // 15% - Can they start when needed
      budget: 0.15,          // 15% - Cost compatibility  
      location: 0.10,        // 10% - Time zone/location fit
      culture: 0.05,         // 5% - Company culture fit
      velocity: 0.03,        // 3% - How fast they deliver
      reliability: 0.02      // 2% - Past performance reliability
    }
  }

  // Enhanced skill dependencies mapping
  private readonly skillDependencies: Map<string, SkillDependency[]> = new Map([
    ['React', [
      { skill: 'JavaScript', importance: 0.9, type: 'prerequisite', required: true },
      { skill: 'HTML', importance: 0.8, type: 'prerequisite', required: true },
      { skill: 'CSS', importance: 0.7, type: 'prerequisite', required: true },
      { skill: 'JSX', importance: 0.9, type: 'component', required: false }
    ]],
    ['Node.js', [
      { skill: 'JavaScript', importance: 0.95, type: 'prerequisite', required: true },
      { skill: 'npm', importance: 0.6, type: 'tool', required: false },
      { skill: 'Express', importance: 0.7, type: 'framework', required: false }
    ]],
    ['Angular', [
      { skill: 'TypeScript', importance: 0.9, type: 'prerequisite', required: true },
      { skill: 'JavaScript', importance: 0.8, type: 'prerequisite', required: true },
      { skill: 'HTML', importance: 0.8, type: 'prerequisite', required: true },
      { skill: 'CSS', importance: 0.7, type: 'prerequisite', required: true }
    ]],
    ['Vue.js', [
      { skill: 'JavaScript', importance: 0.9, type: 'prerequisite', required: true },
      { skill: 'HTML', importance: 0.8, type: 'prerequisite', required: true },
      { skill: 'CSS', importance: 0.7, type: 'prerequisite', required: true }
    ]]
  ])

  async findMatches(
    requirement: ProjectRequirement,
    availableTalent: TalentProfile[],
    options: MatchingOptions = {}
  ): Promise<MatchScore[]> {
    
    // Step 1: Get dynamic weights based on project characteristics
    const dynamicWeights = this.getDynamicWeights(requirement)
    const weights = { ...dynamicWeights, ...options.customWeights }
    
    // Step 2: Pre-filter talent based on hard requirements
    const eligibleTalent = this.preFilterTalent(requirement, availableTalent)
    
    // Step 3: Calculate scores for each talent with dynamic weights
    const scoredMatches = await Promise.all(
      eligibleTalent.map((talent: TalentProfile) => this.calculateTalentScore(requirement, talent, { ...options, customWeights: weights }))
    )
    
    // Step 4: Sort by total score (descending)
    const rankedMatches = scoredMatches
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((match: MatchScore, index: number) => ({ ...match, rank: index + 1 }))
    
    // Step 5: Apply bias detection and fairness adjustments
    const biasAnalysis = this.fairnessAnalyzer.analyzeMatchingBias(rankedMatches, requirement, availableTalent)
    
    // Step 6: Apply business rules and filters
    const finalMatches = this.applyBusinessRules(biasAnalysis.adjustedMatches, requirement, options)
    
    // Add bias analysis to the results if requested
    if (options.includeBiasAnalysis) {
      return finalMatches.map(match => ({
        ...match,
        biasAnalysis: biasAnalysis
      }))
    }
    
    return finalMatches
  }

  private getDynamicWeights(requirement: ProjectRequirement): ProjectWeights {
    // Use the enhanced dynamic weights calculator
    return this.dynamicWeightsCalculator.calculateDynamicWeights(requirement)
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
    const budgetScore = this.calculateAdvancedBudgetScore(requirement, talent).overallScore
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
    // Use the enhanced skill matcher for better semantic understanding
    const requiredSkillMatchResult = this.enhancedSkillMatcher.calculateAdvancedSkillMatch(
      requirement.requiredSkills,
      talent.skills
    )
    
    const preferredSkillMatchResult = this.enhancedSkillMatcher.calculateAdvancedSkillMatch(
      requirement.preferredSkills,
      talent.skills
    )
    
    // Weight required skills more heavily than preferred
    const requiredWeight = 0.8
    const preferredWeight = 0.2
    
    return (requiredSkillMatchResult.overallScore * requiredWeight) + (preferredSkillMatchResult.overallScore * preferredWeight)
  }

  private calculateAdvancedSkillMatch(requiredSkills: SkillRequirement[], talentSkills: Skill[]): SkillMatchResult {
    let totalScore = 0
    let totalWeight = 0
    const missingCritical: string[] = []
    const skillGaps: SkillGap[] = []
    const transferableSkills: string[] = []
    const learningPath: LearningPath[] = []

    for (const required of requiredSkills) {
      const directMatches = talentSkills.filter(skill => this.isSkillMatch(required.name, skill.name))
      const skillWeight = this.getEnhancedSkillWeight(required)
      
      if (directMatches.length === 0) {
        if (required.isRequired) {
          missingCritical.push(required.name)
          
          // Check for transferable skills and prerequisites
          const bridgeScore = this.calculateBridgeSkillScore(required, talentSkills)
          const transferable = this.findTransferableSkillsForRequirement(required, talentSkills)
          
          if (transferable.length > 0) {
            transferableSkills.push(...transferable)
            totalScore += bridgeScore * skillWeight * 0.4 // Reduced score for transferable
          }
          
          // Calculate learning path
          const dependencies = this.skillDependencies.get(required.name) || []
          const hasPrerequisites = dependencies.filter(dep => 
            talentSkills.some(skill => this.isSkillMatch(dep.skill, skill.name))
          )
          
          if (hasPrerequisites.length > 0) {
            learningPath.push({
              targetSkill: required.name,
              prerequisites: hasPrerequisites.map(dep => dep.skill),
              estimatedTimeWeeks: 8,
              difficulty: 'medium'
            })
            totalScore += (hasPrerequisites.length / dependencies.length) * skillWeight * 0.3
          }
        }
        
        skillGaps.push({
          skill: required.name,
          requiredLevel: required.level,
          currentLevel: undefined,
          severity: 'critical',
          canLearn: true,
          learningPath: learningPath.find(lp => lp.targetSkill === required.name)
        })
      } else {
        const bestMatch = this.getBestSkillMatch(required, directMatches)
        const matchScore = this.calculateDetailedSkillScore(required, bestMatch)
        totalScore += matchScore * skillWeight
      }
      
      totalWeight += skillWeight
    }

    return {
      skill: 'overall',
      score: totalWeight > 0 ? totalScore / totalWeight : 0,
      level: 'mid',
      hasExperience: missingCritical.length === 0,
      experienceYears: 0,
      transferableFrom: transferableSkills,
      learningPath: learningPath[0],
      overallScore: totalWeight > 0 ? totalScore / totalWeight : 0
    }
  }

  private getEnhancedSkillWeight(skill: SkillRequirement): number {
    // Base weight from skill definition
    let weight = skill.weight || 5
    
    // Adjust based on skill criticality
    if (skill.isRequired) weight *= 1.5
    
    // Adjust based on experience requirements
    if (skill.yearsRequired && skill.yearsRequired > 5) weight *= 1.2
    
    // Adjust based on skill level
    const levelMultipliers = { junior: 1.0, mid: 1.1, senior: 1.3, expert: 1.5 }
    weight *= levelMultipliers[skill.level] || 1.0
    
    return weight
  }

  private calculateBridgeSkillScore(required: SkillRequirement, talentSkills: Skill[]): number {
    const dependencies = this.skillDependencies.get(required.name) || []
    if (dependencies.length === 0) return 0
    
    let bridgeScore = 0
    for (const dep of dependencies) {
      const hasSkill = talentSkills.some(skill => this.isSkillMatch(dep.skill, skill.name))
      if (hasSkill) {
        bridgeScore += dep.importance * (dep.type === 'prerequisite' ? 1.0 : 0.7)
      }
    }
    
    return Math.min(bridgeScore / dependencies.length, 0.8) // Max 80% for bridge skills
  }

  private findTransferableSkillsForRequirement(required: SkillRequirement, talentSkills: Skill[]): string[] {
    const transferable: string[] = []
    
    // Check for skills in the same category
    const sameCategory = talentSkills.filter(skill => 
      skill.category === this.getSkillCategory(required.name) && 
      skill.level !== 'junior'
    )
    
    if (sameCategory.length > 0) {
      transferable.push(...sameCategory.map(s => s.name))
    }
    
    // Check for related technologies
    for (const [stack, technologies] of techStacks) {
      if (technologies.includes(required.name)) {
        const relatedSkills = talentSkills.filter(skill => 
          technologies.includes(skill.name) && skill.name !== required.name
        )
        transferable.push(...relatedSkills.map(s => s.name))
      }
    }
    
    return [...new Set(transferable)] // Remove duplicates
  }

  private getSkillCategory(skillName: string): string {
    const categoryMap: { [key: string]: string } = {
      'React': 'frontend', 'Angular': 'frontend', 'Vue.js': 'frontend',
      'Node.js': 'backend', 'Express': 'backend', 'Django': 'backend',
      'Docker': 'devops', 'Kubernetes': 'devops', 'AWS': 'devops',
      'Figma': 'design', 'Sketch': 'design', 'Adobe XD': 'design',
      'Python': 'backend', 'JavaScript': 'frontend', 'TypeScript': 'frontend'
    }
    return categoryMap[skillName] || 'other'
  }

  private getBestSkillMatch(required: SkillRequirement, matches: Skill[]): Skill {
    return matches.sort((a, b) => {
      const aScore = this.getSkillLevelScore(a.level) + (a.yearsOfExperience * 0.1)
      const bScore = this.getSkillLevelScore(b.level) + (b.yearsOfExperience * 0.1)
      return bScore - aScore
    })[0]
  }

  private calculateDetailedSkillScore(required: SkillRequirement, talent: Skill): number {
    // Level compatibility with more nuanced scoring
    const levelScore = this.getLevelCompatibility(required.level, talent.level) / 100
    
    // Experience depth bonus
    const requiredYears = required.yearsRequired || 3
    const experienceBonus = Math.min(talent.yearsOfExperience / requiredYears, 1.5) * 0.2
    
    // Recency factor - assume recent skills are better (simplified)
    const recencyFactor = 0.1 // Could be enhanced with actual usage data
    
    // Perfect match bonus
    const perfectMatchBonus = required.name.toLowerCase() === talent.name.toLowerCase() ? 0.1 : 0
    
    return Math.min(levelScore + experienceBonus + recencyFactor + perfectMatchBonus, 1.0)
  }

  private calculateSkillGap(required: SkillRequirement, talentSkills: Skill[]): number {
    const requiredLevel = this.getSkillLevelScore(required.level)
    const relatedSkills = talentSkills.filter(skill => 
      this.getSkillCategory(skill.name) === this.getSkillCategory(required.name)
    )
    
    if (relatedSkills.length === 0) return 1.0 // Full gap
    
    const bestRelated = relatedSkills.sort((a, b) => 
      this.getSkillLevelScore(b.level) - this.getSkillLevelScore(a.level)
    )[0]
    
    const currentLevel = this.getSkillLevelScore(bestRelated.level)
    return Math.max(0, (requiredLevel - currentLevel) / 4) // Normalize to 0-1
  }

  private assessLearnability(required: SkillRequirement, talentSkills: Skill[]): number {
    const dependencies = this.skillDependencies.get(required.name) || []
    if (dependencies.length === 0) return 0.5 // Default learnability
    
    const prerequisitesMet = dependencies.filter(dep => 
      dep.type === 'prerequisite' && 
      talentSkills.some(skill => this.isSkillMatch(dep.skill, skill.name))
    ).length
    
    return Math.min(prerequisitesMet / dependencies.filter(d => d.type === 'prerequisite').length, 1.0)
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
    const techOverlap = this.calculateTechStackOverlap(requirement, talent)
    score += techOverlap * 0.3

    return Math.min(score, 1)
  }

  private calculateTechStackOverlap(requirement: ProjectRequirement, talent: TalentProfile): number {
    const requiredTech = requirement.requiredSkills.map((s: any) => s.name.toLowerCase())
    const talentTech = talent.skills.map((s: any) => s.name.toLowerCase())
    
    const overlap = requiredTech.filter((tech: any) => talentTech.includes(tech))
    return requiredTech.length > 0 ? overlap.length / requiredTech.length : 0
  }

  private calculateAvailabilityScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    const availabilityAnalysis = this.calculateAdvancedAvailabilityScore(requirement, talent)
    return availabilityAnalysis.overallScore
  }

  private calculateAdvancedAvailabilityScore(requirement: ProjectRequirement, talent: TalentProfile): any {
    const { startDate, duration } = requirement
    const { availability } = talent

    // Basic availability check
    if (availability.length === 0) {
      return {
        overallScore: 0.1,
        capacityScore: 0,
        scheduleCompatibility: 0,
        conflictRisk: 1.0,
        startDateFeasibility: 0,
        workloadBalance: 0,
        timeZoneAlignment: 0.8
      }
    }

    // Simplified availability calculation for now
    const capacityScore = this.calculateSimpleCapacityScore(requirement, talent)
    const timeZoneAlignment = this.calculateSimpleTimeZoneAlignment(requirement, talent)
    
    const overallScore = (capacityScore * 0.7) + (timeZoneAlignment * 0.3)

    return {
      overallScore,
      capacityScore,
      scheduleCompatibility: 0.8,
      conflictRisk: 0.2,
      startDateFeasibility: 0.9,
      workloadBalance: 0.8,
      timeZoneAlignment
    }
  }

  private calculateAdvancedBudgetScore(requirement: ProjectRequirement, talent: TalentProfile): BudgetAnalysis {
    const { min: reqMin, max: reqMax } = requirement.budget
    const talentRate = talent.hourlyRate
    const marketData = this.getMarketRateData(talent.skills, talent.location)
    
    // Basic budget fit
    const budgetFit = this.calculateBasicBudgetFit(reqMin, reqMax, talentRate)
    
    // Market positioning
    const marketPosition = this.calculateMarketPosition(talentRate, marketData)
    
    // Value proposition
    const valueScore = this.calculateValueProposition(talent, talentRate, marketData)
    
    // Negotiation potential
    const negotiationPotential = this.assessNegotiationPotential(talentRate, reqMin, reqMax, talent.preferences)
    
    // ROI prediction
    const expectedROI = this.predictROI(talent, requirement, talentRate)
    
    // Cost risk assessment
    const costRisk = this.assessCostRisks(talent, requirement, talentRate)
    
    const overallScore = this.calculateWeightedBudgetScore({
      budgetFit,
      marketPosition,
      valueScore,
      negotiationPotential,
      expectedROI,
      costRisk
    })

    return {
      overallScore,
      budgetFit,
      marketPosition,
      valueScore,
      negotiationPotential,
      expectedROI,
      costRisk
    }
  }

  private calculateBasicBudgetFit(reqMin: number, reqMax: number, talentRate: number): number {
    // Perfect match: talent rate is within budget range
    if (talentRate >= reqMin && talentRate <= reqMax) {
      return 1.0
    }

    // Symmetric scoring curve - penalize both under and over budget
    const budgetMidpoint = (reqMin + reqMax) / 2
    const budgetRange = reqMax - reqMin
    const deviation = Math.abs(talentRate - budgetMidpoint)
    
    // Under budget penalty (might indicate lack of experience)
    if (talentRate < reqMin) {
      const underBudgetPenalty = (reqMin - talentRate) / reqMin
      return Math.max(0.7 - underBudgetPenalty * 0.3, 0.3)
    }
    
    // Over budget penalty
    const overBudgetPenalty = (talentRate - reqMax) / reqMax
    return Math.max(0.6 - overBudgetPenalty * 0.4, 0.1)
  }

  private getMarketRateData(skills: Skill[], location: Location): MarketData {
    // Simplified market data calculation - in production, this would use real market data
    const skillLevels = skills.map(s => this.getSkillLevelScore(s.level))
    const avgSkillLevel = skillLevels.reduce((sum, level) => sum + level, 0) / skillLevels.length
    
    // Base rates by location (simplified)
    const locationMultipliers: { [key: string]: number } = {
      'US': 1.0, 'CA': 0.85, 'UK': 0.90, 'DE': 0.80, 'IN': 0.30, 'PH': 0.25
    }
    
    const locationMultiplier = locationMultipliers[location.country] || 0.6
    const baseRate = 50 + (avgSkillLevel * 25) // $50-150 base range
    
    return {
      averageRate: baseRate * locationMultiplier,
      demandLevel: Math.random() * 0.5 + 0.5, // Simplified - would use real data
      supplyLevel: Math.random() * 0.5 + 0.5
    }
  }

  private calculateMarketPosition(talentRate: number, marketData: MarketData): number {
    const ratio = talentRate / marketData.averageRate
    
    // Optimal range is 0.8-1.2x market rate
    if (ratio >= 0.8 && ratio <= 1.2) return 1.0
    if (ratio >= 0.6 && ratio <= 1.5) return 0.8
    if (ratio >= 0.4 && ratio <= 2.0) return 0.6
    return 0.3
  }

  private calculateValueProposition(talent: TalentProfile, rate: number, marketData: MarketData): number {
    // Value = (Quality × Delivery Speed × Reliability) / Cost
    const qualityScore = talent.rating / 5
    const speedScore = this.calculateDeliverySpeed(talent)
    const reliabilityScore = this.calculateReliabilityScore(talent)
    const costNormalized = rate / marketData.averageRate
    
    return Math.min((qualityScore * speedScore * reliabilityScore) / costNormalized, 2.0)
  }

  private calculateDeliverySpeed(talent: TalentProfile): number {
    if (talent.pastProjects.length === 0) return 0.5
    
    const completedProjects = talent.pastProjects.filter(p => p.outcome === 'completed')
    if (completedProjects.length === 0) return 0.3
    
    // Calculate average delivery efficiency
    const avgEfficiency = completedProjects.reduce((sum, project) => {
      // Assume projects with higher ratings were delivered more efficiently
      return sum + (project.rating / 5)
    }, 0) / completedProjects.length
    
    return Math.min(avgEfficiency, 1.0)
  }

  private assessNegotiationPotential(talentRate: number, reqMin: number, reqMax: number, preferences: TalentPreferences): number {
    // Check if talent's preferred rate aligns with budget
    const preferredInRange = preferences.preferredRate >= reqMin && preferences.preferredRate <= reqMax
    const minimumInRange = preferences.minimumRate <= reqMax
    
    if (preferredInRange) return 1.0
    if (minimumInRange) return 0.7
    
    // Calculate flexibility based on rate vs preferences
    const flexibility = Math.max(0, 1 - Math.abs(talentRate - preferences.preferredRate) / preferences.preferredRate)
    return Math.min(flexibility * 0.5, 0.5)
  }

  private predictROI(talent: TalentProfile, requirement: ProjectRequirement, talentRate: number): number {
    // Simplified ROI calculation based on talent quality and project success probability
    const qualityFactor = talent.rating / 5
    const experienceFactor = Math.min(talent.experience.length / 5, 1.0)
    const completionRate = talent.pastProjects.length > 0 ? 
      talent.pastProjects.filter(p => p.outcome === 'completed').length / talent.pastProjects.length : 0.5
    
    // Higher rates should deliver proportionally higher value
    const rateEfficiency = Math.min(talentRate / 100, 1.5) // Normalize around $100/hr
    
    return (qualityFactor * experienceFactor * completionRate * rateEfficiency) / 2
  }

  private assessCostRisks(talent: TalentProfile, requirement: ProjectRequirement, talentRate: number): number {
    let riskScore = 0
    
    // Rate volatility risk
    if (talentRate > requirement.budget.max * 1.2) riskScore += 0.3
    
    // Experience mismatch risk
    const avgExperience = talent.skills.reduce((sum, s) => sum + s.yearsOfExperience, 0) / talent.skills.length
    if (avgExperience < 2) riskScore += 0.2
    
    // Project completion risk
    const incompletionRate = talent.pastProjects.length > 0 ?
      talent.pastProjects.filter(p => p.outcome !== 'completed').length / talent.pastProjects.length : 0.3
    riskScore += incompletionRate * 0.3
    
    // Communication risk (simplified)
    if (talent.preferences.communicationStyle === 'formal' && requirement.workStyle === 'agile') {
      riskScore += 0.1
    }
    
    return Math.min(riskScore, 1.0)
  }

  private calculateWeightedBudgetScore(analysis: Omit<BudgetAnalysis, 'overallScore'>): number {
    const weights = {
      budgetFit: 0.35,
      valueScore: 0.25,
      marketPosition: 0.15,
      expectedROI: 0.15,
      negotiationPotential: 0.10
    }
    
    // Invert cost risk (lower risk = higher score)
    const riskAdjustment = 1 - analysis.costRisk
    
    const weightedScore = 
      (analysis.budgetFit * weights.budgetFit) +
      (analysis.valueScore * weights.valueScore) +
      (analysis.marketPosition * weights.marketPosition) +
      (analysis.expectedROI * weights.expectedROI) +
      (analysis.negotiationPotential * weights.negotiationPotential)
    
    return Math.min(weightedScore * riskAdjustment, 1.0)
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
      reasons.push(`Perfect skill match for ${matchingSkills.join(', ')}`)
    }

    if (scores.experienceScore > 0.5) {
      reasons.push(`Strong experience in ${requirement.clientIndustry} industry`)
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

    // Apply bias detection and fairness adjustments
    // Note: Bias detection would need access to talent data, simplified for now
    const biasDetection = this.detectBias(filteredMatches, requirement)
    if (biasDetection.hasBias) {
      filteredMatches = this.applyFairnessAdjustments(filteredMatches, biasDetection)
    }

    // Apply minimum score filter (default to 0.05 if not specified)
    const minScore = options.minScore !== undefined ? options.minScore : 0.05
    filteredMatches = filteredMatches.filter(match => match.totalScore >= minScore)

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

  private detectBias(matches: MatchScore[], requirement: ProjectRequirement): BiasDetectionResult {
    const biasTypes: string[] = []
    const recommendations: string[] = []
    
    // Simplified bias detection based on score distribution
    const scores = matches.map(m => m.totalScore)
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
    
    // High variance might indicate bias
    if (scoreVariance > 0.1) {
      biasTypes.push('score_variance')
      recommendations.push('Review scoring criteria for potential bias')
    }
    
    // Check for clustering in top scores
    const topScores = scores.filter(s => s > 0.8)
    if (topScores.length > matches.length * 0.8) {
      biasTypes.push('score_clustering')
      recommendations.push('Ensure diverse talent representation in top matches')
    }
    
    const fairnessScore = this.calculateFairnessMetrics(matches).overallFairness
    
    return {
      hasBias: biasTypes.length > 0,
      biasTypes,
      fairnessScore,
      recommendations
    }
  }


  private calculateFairnessMetrics(matches: MatchScore[]): FairnessMetrics {
    // Demographic parity - equal representation across groups
    const demographicParity = this.calculateDemographicParity(matches)
    
    // Equal opportunity - equal true positive rates across groups
    const equalOpportunity = this.calculateEqualOpportunity(matches)
    
    // Calibration - prediction accuracy across groups
    const calibration = this.calculateCalibration(matches)
    
    const overallFairness = (demographicParity + equalOpportunity + calibration) / 3
    
    return {
      demographicParity,
      equalOpportunity,
      calibration,
      overallFairness
    }
  }

  private calculateDemographicParity(matches: MatchScore[]): number {
    // Simplified demographic parity calculation
    // In practice, this would consider protected attributes and require talent data access
    
    // For now, return a baseline fairness score
    return 0.85
  }

  private calculateEqualOpportunity(matches: MatchScore[]): number {
    // Simplified equal opportunity calculation
    // Would need actual performance data in practice
    return 0.85 // Placeholder
  }

  private calculateCalibration(matches: MatchScore[]): number {
    // Simplified calibration calculation
    // Would compare predicted vs actual success rates
    return 0.80 // Placeholder
  }

  private getRegionalGroup(country: string): string {
    const regions: { [key: string]: string } = {
      'US': 'North America', 'CA': 'North America',
      'UK': 'Europe', 'DE': 'Europe', 'FR': 'Europe',
      'IN': 'Asia', 'PH': 'Asia', 'SG': 'Asia'
    }
    return regions[country] || 'Other'
  }

  private applyFairnessAdjustments(matches: MatchScore[], biasDetection: BiasDetectionResult): MatchScore[] {
    let adjustedMatches = [...matches]
    
    // Apply bias corrections based on detected bias types
    if (biasDetection.biasTypes.includes('score_variance')) {
      // Normalize scores to reduce extreme variance
      const scores = adjustedMatches.map(m => m.totalScore)
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
      const maxDeviation = 0.3
      
      adjustedMatches = adjustedMatches.map(match => {
        const deviation = Math.abs(match.totalScore - avgScore)
        if (deviation > maxDeviation) {
          const adjustedScore = avgScore + Math.sign(match.totalScore - avgScore) * maxDeviation
          return { ...match, totalScore: Math.max(0, Math.min(1, adjustedScore)) }
        }
        return match
      })
    }
    
    if (biasDetection.biasTypes.includes('score_clustering')) {
      // Add small random variation to break clustering
      adjustedMatches = adjustedMatches.map(match => ({
        ...match,
        totalScore: Math.max(0, Math.min(1, match.totalScore + (Math.random() - 0.5) * 0.02))
      }))
    }
    
    return adjustedMatches
  }

  private calculateSimpleCapacityScore(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Calculate total available hours from availability windows
    let totalAvailableHours = 0
    talent.availability.forEach(window => {
      totalAvailableHours += window.capacity * 40 / 100 // Convert percentage to hours
    })
    
    const avgAvailableHours = talent.availability.length > 0 ? totalAvailableHours / talent.availability.length : 20
    const requiredHours = 40 // Default full-time
    
    // Perfect match when available hours meet or exceed required hours
    if (avgAvailableHours >= requiredHours) {
      return 1.0
    }
    
    // Partial capacity score
    const capacityRatio = avgAvailableHours / requiredHours
    return Math.max(capacityRatio, 0.2)
  }

  private calculateSimpleTimeZoneAlignment(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Simplified time zone calculation
    const reqTimeZone = requirement.location?.timezone || 'UTC'
    const talentTimeZone = talent.location.timezone || 'UTC'
    
    // For remote work, time zone matters less
    if (requirement.location?.type === 'remote') {
      return 0.9
    }
    
    // Simple same timezone check
    if (reqTimeZone === talentTimeZone) {
      return 1.0
    }
    
    // Different timezones but manageable
    return 0.6
  }

  private assessWorkloadBalance(requirement: ProjectRequirement, talent: TalentProfile): number {
    const requiredHours = 40 // Default to 40 hours per week
    const currentCommitments = talent.pastProjects.filter(p => p.outcome === 'ongoing').length
    
    // Calculate available capacity
    const totalCapacity = talent.availability.length > 0 ? 
      talent.availability.reduce((sum, window) => sum + window.capacity * 40 / 100, 0) / talent.availability.length : 40
    
    // Calculate workload ratio
    const workloadRatio = (requiredHours + currentCommitments * 20) / totalCapacity
    
    // Optimal workload is 80-100% capacity
    if (workloadRatio >= 0.8 && workloadRatio <= 1.0) return 1.0
    if (workloadRatio >= 0.6 && workloadRatio <= 1.2) return 0.8
    if (workloadRatio >= 0.4 && workloadRatio <= 1.5) return 0.6
    
    return 0.3 // Poor workload balance
  }

  private calculateTimeZoneAlignment(requirement: ProjectRequirement, talent: TalentProfile): number {
    // Simplified time zone calculation
    const reqTimeZone = requirement.location?.timezone || 'UTC'
    const talentTimeZone = talent.location.timezone || 'UTC'
    
    // For remote work, time zone matters less
    if (requirement.location?.type === 'remote') {
      return 0.9
    }
    
    // Calculate time difference (simplified)
    const timeZoneOffsets: { [key: string]: number } = {
      'UTC': 0, 'PST': -8, 'EST': -5, 'CET': 1, 'IST': 5.5, 'JST': 9
    }
    
    const reqOffset = timeZoneOffsets[reqTimeZone] || 0
    const talentOffset = timeZoneOffsets[talentTimeZone] || 0
    const timeDiff = Math.abs(reqOffset - talentOffset)
    
    // Perfect alignment
    if (timeDiff <= 1) return 1.0
    // Good overlap
    if (timeDiff <= 3) return 0.8
    // Manageable with some async work
    if (timeDiff <= 6) return 0.6
    // Challenging but possible
    if (timeDiff <= 9) return 0.4
    // Very difficult
    return 0.2
  }

  private calculateWeightedAvailabilityScore(analysis: any): number {
    const weights = {
      capacityScore: 0.25,
      scheduleCompatibility: 0.20,
      startDateFeasibility: 0.20,
      workloadBalance: 0.15,
      timeZoneAlignment: 0.15,
      conflictRisk: 0.05 // Inverted - lower risk = higher score
    }
    
    const conflictAdjustment = 1 - analysis.conflictRisk
    
    const weightedScore = 
      (analysis.capacityScore * weights.capacityScore) +
      (analysis.scheduleCompatibility * weights.scheduleCompatibility) +
      (analysis.startDateFeasibility * weights.startDateFeasibility) +
      (analysis.workloadBalance * weights.workloadBalance) +
      (analysis.timeZoneAlignment * weights.timeZoneAlignment) +
      (conflictAdjustment * weights.conflictRisk)
    
    return Math.min(weightedScore, 1.0)
  }
}
