import { ProjectRequirement, ProjectWeights } from './matching-engine'

export interface DynamicWeightsConfig {
  baseWeights: ProjectWeights
  urgencyMultipliers: Record<string, number>
  projectTypeMultipliers: Record<string, Partial<ProjectWeights>>
  teamSizeMultipliers: Record<string, Partial<ProjectWeights>>
  industryMultipliers: Record<string, Partial<ProjectWeights>>
}

export class DynamicWeightsCalculator {
  private config: DynamicWeightsConfig = {
    baseWeights: {
      skills: 0.35,
      experience: 0.20,
      availability: 0.15,
      budget: 0.10,
      location: 0.05,
      culture: 0.05,
      velocity: 0.05,
      reliability: 0.05
    },
    
    // Urgency affects availability and velocity weights
    urgencyMultipliers: {
      'low': 1.0,
      'medium': 1.2,
      'high': 1.5,
      'critical': 2.0
    },
    
    // Project type affects skill and experience weights
    projectTypeMultipliers: {
      'development': {
        skills: 1.3,
        experience: 1.2,
        availability: 0.9
      },
      'consulting': {
        experience: 1.4,
        culture: 1.3,
        reliability: 1.2
      },
      'design': {
        skills: 1.2,
        culture: 1.1,
        availability: 1.0
      },
      'data': {
        skills: 1.4,
        experience: 1.3,
        reliability: 1.1
      },
      'other': {
        skills: 1.0,
        experience: 1.0,
        availability: 1.0
      }
    },
    
    // Team size affects culture and communication weights
    teamSizeMultipliers: {
      '1': { // Solo
        culture: 0.8,
        availability: 1.2
      },
      '2-5': { // Small team
        culture: 1.1,
        availability: 1.0
      },
      '6-10': { // Medium team
        culture: 1.3,
        availability: 0.9
      },
      '11+': { // Large team
        culture: 1.5,
        availability: 0.8
      }
    },
    
    // Industry affects experience and reliability weights
    industryMultipliers: {
      'healthcare': {
        experience: 1.3,
        reliability: 1.4,
        culture: 1.2
      },
      'finance': {
        experience: 1.4,
        reliability: 1.5,
        skills: 1.2
      },
      'ecommerce': {
        skills: 1.2,
        velocity: 1.3,
        availability: 1.1
      },
      'saas': {
        skills: 1.3,
        experience: 1.2,
        culture: 1.1
      },
      'startup': {
        availability: 1.3,
        velocity: 1.4,
        budget: 0.8
      },
      'enterprise': {
        experience: 1.3,
        reliability: 1.4,
        culture: 1.3
      }
    }
  }

  calculateDynamicWeights(requirement: ProjectRequirement): ProjectWeights {
    let weights = { ...this.config.baseWeights }
    
    // Apply urgency multiplier
    const urgencyMultiplier = this.config.urgencyMultipliers[requirement.urgency] || 1.0
    weights.availability *= urgencyMultiplier
    weights.velocity *= urgencyMultiplier
    
    // Apply project type multiplier
    const projectTypeMultiplier = this.config.projectTypeMultipliers[requirement.projectType] || {}
    weights = this.applyMultipliers(weights, projectTypeMultiplier)
    
    // Apply team size multiplier
    const teamSizeKey = this.getTeamSizeKey(requirement.teamSize)
    const teamSizeMultiplier = this.config.teamSizeMultipliers[teamSizeKey] || {}
    weights = this.applyMultipliers(weights, teamSizeMultiplier)
    
    // Apply industry multiplier
    const industryMultiplier = this.config.industryMultipliers[requirement.clientIndustry] || {}
    weights = this.applyMultipliers(weights, industryMultiplier)
    
    // Normalize weights to sum to 1.0
    return this.normalizeWeights(weights)
  }

  private applyMultipliers(weights: ProjectWeights, multipliers: Partial<ProjectWeights>): ProjectWeights {
    const result = { ...weights }
    
    for (const [key, multiplier] of Object.entries(multipliers)) {
      if (key in result) {
        result[key as keyof ProjectWeights] *= multiplier
      }
    }
    
    return result
  }

  private getTeamSizeKey(teamSize: number): string {
    if (teamSize === 1) return '1'
    if (teamSize <= 5) return '2-5'
    if (teamSize <= 10) return '6-10'
    return '11+'
  }

  private normalizeWeights(weights: ProjectWeights): ProjectWeights {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
    
    if (total === 0) {
      return this.config.baseWeights
    }
    
    const normalized: ProjectWeights = {} as ProjectWeights
    for (const [key, weight] of Object.entries(weights)) {
      normalized[key as keyof ProjectWeights] = weight / total
    }
    
    return normalized
  }

  getWeightExplanation(requirement: ProjectRequirement): string[] {
    const explanations: string[] = []
    
    // Urgency explanation
    if (requirement.urgency === 'critical') {
      explanations.push('Critical urgency: Availability and velocity weights increased by 2x')
    } else if (requirement.urgency === 'high') {
      explanations.push('High urgency: Availability and velocity weights increased by 1.5x')
    }
    
    // Project type explanation
    const projectType = requirement.projectType
    if (projectType === 'development') {
      explanations.push('Development project: Skills and experience weights prioritized')
    } else if (projectType === 'consulting') {
      explanations.push('Consulting project: Experience and culture weights prioritized')
    } else if (projectType === 'data') {
      explanations.push('Data project: Skills and experience weights prioritized')
    }
    
    // Team size explanation
    const teamSizeKey = this.getTeamSizeKey(requirement.teamSize)
    if (teamSizeKey === '1') {
      explanations.push('Solo project: Availability prioritized over culture')
    } else if (teamSizeKey === '11+') {
      explanations.push('Large team: Culture and communication prioritized')
    }
    
    // Industry explanation
    const industry = requirement.clientIndustry
    if (industry === 'healthcare' || industry === 'finance') {
      explanations.push(`${industry} industry: Experience and reliability prioritized`)
    } else if (industry === 'startup') {
      explanations.push('Startup environment: Availability and velocity prioritized')
    }
    
    return explanations
  }

  // Method to get recommended minimum scores based on project characteristics
  getRecommendedMinScore(requirement: ProjectRequirement): number {
    let baseMinScore = 0.6
    
    // Adjust based on urgency
    if (requirement.urgency === 'critical') {
      baseMinScore = 0.7
    } else if (requirement.urgency === 'high') {
      baseMinScore = 0.65
    }
    
    // Adjust based on project type
    if (requirement.projectType === 'consulting') {
      baseMinScore += 0.05
    } else if (requirement.projectType === 'data') {
      baseMinScore += 0.05
    }
    
    // Adjust based on industry
    if (requirement.clientIndustry === 'healthcare' || requirement.clientIndustry === 'finance') {
      baseMinScore += 0.05
    }
    
    return Math.min(baseMinScore, 0.8) // Cap at 0.8
  }

  // Method to get recommended max results based on project characteristics
  getRecommendedMaxResults(requirement: ProjectRequirement): number {
    let baseMaxResults = 20
    
    // More results for urgent projects
    if (requirement.urgency === 'critical') {
      baseMaxResults = 30
    } else if (requirement.urgency === 'high') {
      baseMaxResults = 25
    }
    
    // More results for specialized projects
    if (requirement.projectType === 'data' || requirement.projectType === 'consulting') {
      baseMaxResults += 5
    }
    
    // More results for enterprise projects
    if (requirement.clientIndustry === 'enterprise') {
      baseMaxResults += 5
    }
    
    return Math.min(baseMaxResults, 50) // Cap at 50
  }
}
