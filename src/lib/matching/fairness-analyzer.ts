import { MatchScore, TalentProfile, ProjectRequirement } from './matching-engine'

export interface BiasAnalysisResult {
  genderBias: BiasMetric
  ageBias: BiasMetric
  locationBias: BiasMetric
  experienceBias: BiasMetric
  educationBias: BiasMetric
  overallBiasScore: number
  recommendations: string[]
  adjustedMatches: MatchScore[]
}

export interface BiasMetric {
  detected: boolean
  severity: 'low' | 'medium' | 'high'
  score: number // 0-1, higher means more bias
  details: string
  affectedGroups: string[]
}

export interface DemographicData {
  gender?: string
  age?: number
  location: string
  experience: number
  education?: string
}

export class FairnessAnalyzer {
  private biasThresholds = {
    low: 0.1,
    medium: 0.25,
    high: 0.4
  }

  analyzeMatchingBias(
    matches: MatchScore[],
    requirement: ProjectRequirement,
    talentProfiles: TalentProfile[]
  ): BiasAnalysisResult {
    const analysis = {
      genderBias: this.detectGenderBias(matches, talentProfiles),
      ageBias: this.detectAgeBias(matches, talentProfiles),
      locationBias: this.detectLocationBias(matches, talentProfiles),
      experienceBias: this.detectExperienceBias(matches, talentProfiles),
      educationBias: this.detectEducationBias(matches, talentProfiles),
      overallBiasScore: 0
    }

    // Calculate overall bias score
    analysis.overallBiasScore = this.calculateOverallBias(analysis)
    
    return {
      ...analysis,
      recommendations: this.generateFairnessRecommendations(analysis),
      adjustedMatches: this.applyFairnessAdjustments(matches, analysis, talentProfiles)
    }
  }

  private detectGenderBias(matches: MatchScore[], talentProfiles: TalentProfile[]): BiasMetric {
    // This is a simplified implementation
    // In a real system, you'd have gender data from profiles
    const genderDistribution = this.getGenderDistribution(matches, talentProfiles)
    const biasScore = this.calculateDistributionBias(genderDistribution)
    
    return {
      detected: biasScore > this.biasThresholds.low,
      severity: this.getBiasSeverity(biasScore),
      score: biasScore,
      details: `Gender distribution shows ${biasScore.toFixed(2)} bias score`,
      affectedGroups: this.getAffectedGroups(genderDistribution)
    }
  }

  private detectAgeBias(matches: MatchScore[], talentProfiles: TalentProfile[]): BiasMetric {
    const ageGroups = this.getAgeGroupDistribution(matches, talentProfiles)
    const biasScore = this.calculateDistributionBias(ageGroups)
    
    return {
      detected: biasScore > this.biasThresholds.low,
      severity: this.getBiasSeverity(biasScore),
      score: biasScore,
      details: `Age group distribution shows ${biasScore.toFixed(2)} bias score`,
      affectedGroups: this.getAffectedGroups(ageGroups)
    }
  }

  private detectLocationBias(matches: MatchScore[], talentProfiles: TalentProfile[]): BiasMetric {
    const locationDistribution = this.getLocationDistribution(matches, talentProfiles)
    const biasScore = this.calculateDistributionBias(locationDistribution)
    
    return {
      detected: biasScore > this.biasThresholds.low,
      severity: this.getBiasSeverity(biasScore),
      score: biasScore,
      details: `Location distribution shows ${biasScore.toFixed(2)} bias score`,
      affectedGroups: this.getAffectedGroups(locationDistribution)
    }
  }

  private detectExperienceBias(matches: MatchScore[], talentProfiles: TalentProfile[]): BiasMetric {
    const experienceGroups = this.getExperienceGroupDistribution(matches, talentProfiles)
    const biasScore = this.calculateDistributionBias(experienceGroups)
    
    return {
      detected: biasScore > this.biasThresholds.low,
      severity: this.getBiasSeverity(biasScore),
      score: biasScore,
      details: `Experience level distribution shows ${biasScore.toFixed(2)} bias score`,
      affectedGroups: this.getAffectedGroups(experienceGroups)
    }
  }

  private detectEducationBias(matches: MatchScore[], talentProfiles: TalentProfile[]): BiasMetric {
    // Simplified implementation - in reality you'd have education data
    const educationDistribution = this.getEducationDistribution(matches, talentProfiles)
    const biasScore = this.calculateDistributionBias(educationDistribution)
    
    return {
      detected: biasScore > this.biasThresholds.low,
      severity: this.getBiasSeverity(biasScore),
      score: biasScore,
      details: `Education level distribution shows ${biasScore.toFixed(2)} bias score`,
      affectedGroups: this.getAffectedGroups(educationDistribution)
    }
  }

  private getGenderDistribution(matches: MatchScore[], talentProfiles: TalentProfile[]): Record<string, number> {
    // Simplified - in reality you'd extract gender from profiles
    const distribution: Record<string, number> = {}
    
    for (const match of matches) {
      const profile = talentProfiles.find(p => p.id === match.talentId)
      if (profile) {
        // Mock gender distribution for demonstration
        const gender = this.getMockGender(profile.id)
        distribution[gender] = (distribution[gender] || 0) + 1
      }
    }
    
    return distribution
  }

  private getAgeGroupDistribution(matches: MatchScore[], talentProfiles: TalentProfile[]): Record<string, number> {
    const distribution: Record<string, number> = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '55+': 0
    }
    
    for (const match of matches) {
      const profile = talentProfiles.find(p => p.id === match.talentId)
      if (profile) {
        const age = this.getMockAge(profile.id)
        const ageGroup = this.getAgeGroup(age)
        distribution[ageGroup]++
      }
    }
    
    return distribution
  }

  private getLocationDistribution(matches: MatchScore[], talentProfiles: TalentProfile[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    for (const match of matches) {
      const profile = talentProfiles.find(p => p.id === match.talentId)
      if (profile) {
        const location = profile.location.country
        distribution[location] = (distribution[location] || 0) + 1
      }
    }
    
    return distribution
  }

  private getExperienceGroupDistribution(matches: MatchScore[], talentProfiles: TalentProfile[]): Record<string, number> {
    const distribution: Record<string, number> = {
      '0-2 years': 0,
      '3-5 years': 0,
      '6-10 years': 0,
      '10+ years': 0
    }
    
    for (const match of matches) {
      const profile = talentProfiles.find(p => p.id === match.talentId)
      if (profile) {
        const totalExperience = this.calculateTotalExperience(profile)
        const experienceGroup = this.getExperienceGroup(totalExperience)
        distribution[experienceGroup]++
      }
    }
    
    return distribution
  }

  private getEducationDistribution(matches: MatchScore[], talentProfiles: TalentProfile[]): Record<string, number> {
    // Simplified - in reality you'd have education data
    const distribution: Record<string, number> = {
      'High School': 0,
      'Bachelor': 0,
      'Master': 0,
      'PhD': 0,
      'Other': 0
    }
    
    for (const match of matches) {
      const profile = talentProfiles.find(p => p.id === match.talentId)
      if (profile) {
        const education = this.getMockEducation(profile.id)
        distribution[education]++
      }
    }
    
    return distribution
  }

  private calculateDistributionBias(distribution: Record<string, number>): number {
    const values = Object.values(distribution)
    if (values.length === 0) return 0
    
    const total = values.reduce((sum, count) => sum + count, 0)
    if (total === 0) return 0
    
    const expected = total / values.length
    const variance = values.reduce((sum, count) => sum + Math.pow(count - expected, 2), 0) / values.length
    
    // Normalize variance to 0-1 scale
    return Math.min(variance / (total * total), 1.0)
  }

  private getBiasSeverity(score: number): 'low' | 'medium' | 'high' {
    if (score >= this.biasThresholds.high) return 'high'
    if (score >= this.biasThresholds.medium) return 'medium'
    return 'low'
  }

  private getAffectedGroups(distribution: Record<string, number>): string[] {
    const values = Object.values(distribution)
    const total = values.reduce((sum, count) => sum + count, 0)
    const average = total / values.length
    
    return Object.entries(distribution)
      .filter(([_, count]) => count < average * 0.5) // Groups with less than 50% of average
      .map(([group, _]) => group)
  }

  private calculateOverallBias(analysis: Omit<BiasAnalysisResult, 'recommendations' | 'adjustedMatches'>): number {
    const biasScores = [
      analysis.genderBias.score,
      analysis.ageBias.score,
      analysis.locationBias.score,
      analysis.experienceBias.score,
      analysis.educationBias.score
    ]
    
    return biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length
  }

  private generateFairnessRecommendations(analysis: Omit<BiasAnalysisResult, 'recommendations' | 'adjustedMatches'>): string[] {
    const recommendations: string[] = []
    
    if (analysis.overallBiasScore > this.biasThresholds.high) {
      recommendations.push('High bias detected: Consider reviewing matching criteria and adding diversity initiatives')
    }
    
    if (analysis.genderBias.detected) {
      recommendations.push('Gender bias detected: Review skill requirements and consider gender-neutral language')
    }
    
    if (analysis.ageBias.detected) {
      recommendations.push('Age bias detected: Ensure experience requirements are not age-discriminatory')
    }
    
    if (analysis.locationBias.detected) {
      recommendations.push('Location bias detected: Consider remote work options and timezone flexibility')
    }
    
    if (analysis.experienceBias.detected) {
      recommendations.push('Experience bias detected: Consider candidates with transferable skills')
    }
    
    return recommendations
  }

  private applyFairnessAdjustments(
    matches: MatchScore[],
    analysis: Omit<BiasAnalysisResult, 'recommendations' | 'adjustedMatches'>,
    talentProfiles: TalentProfile[]
  ): MatchScore[] {
    return matches.map(match => {
      let adjustmentFactor = 1.0
      
      // Apply small positive adjustments to counteract detected bias
      if (this.isUnderrepresented(match, analysis, talentProfiles)) {
        adjustmentFactor += 0.05 // Small boost to level playing field
      }
      
      return {
        ...match,
        totalScore: Math.min(match.totalScore * adjustmentFactor, 1.0),
        fairnessAdjusted: true
      }
    })
  }

  private isUnderrepresented(
    match: MatchScore,
    analysis: Omit<BiasAnalysisResult, 'recommendations' | 'adjustedMatches'>,
    talentProfiles: TalentProfile[]
  ): boolean {
    const profile = talentProfiles.find(p => p.id === match.talentId)
    if (!profile) return false
    
    // Check if this profile belongs to any underrepresented group
    const underrepresentedGroups = [
      ...analysis.genderBias.affectedGroups,
      ...analysis.ageBias.affectedGroups,
      ...analysis.locationBias.affectedGroups,
      ...analysis.experienceBias.affectedGroups,
      ...analysis.educationBias.affectedGroups
    ]
    
    // Simplified check - in reality you'd have more sophisticated logic
    return underrepresentedGroups.some(group => 
      this.profileBelongsToGroup(profile, group)
    )
  }

  private profileBelongsToGroup(profile: TalentProfile, group: string): boolean {
    // Simplified implementation - in reality you'd have more sophisticated logic
    const profileId = profile.id.toLowerCase()
    
    // Mock logic for demonstration
    if (group === 'Female' && profileId.includes('female')) return true
    if (group === '18-25' && profileId.includes('young')) return true
    if (group === 'Africa' && profile.location.country === 'South Africa') return true
    if (group === '0-2 years' && this.calculateTotalExperience(profile) <= 2) return true
    
    return false
  }

  // Helper methods for mock data (in reality these would come from actual profile data)
  private getMockGender(profileId: string): string {
    // Mock gender assignment for demonstration
    const hash = profileId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return hash % 2 === 0 ? 'Male' : 'Female'
  }

  private getMockAge(profileId: string): number {
    // Mock age assignment for demonstration
    const hash = profileId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return 25 + (hash % 30) // Age between 25-55
  }

  private getMockEducation(profileId: string): string {
    // Mock education assignment for demonstration
    const hash = profileId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const educations = ['High School', 'Bachelor', 'Master', 'PhD', 'Other']
    return educations[hash % educations.length]
  }

  private getAgeGroup(age: number): string {
    if (age <= 25) return '18-25'
    if (age <= 35) return '26-35'
    if (age <= 45) return '36-45'
    if (age <= 55) return '46-55'
    return '55+'
  }

  private calculateTotalExperience(profile: TalentProfile): number {
    return profile.experience.reduce((total, exp) => {
      const years = this.parseExperienceDuration(exp.duration)
      return total + years
    }, 0)
  }

  private parseExperienceDuration(duration: string): number {
    // Parse duration strings like "3 years", "6 months", etc.
    const match = duration.match(/(\d+)\s*(year|month|week|day)s?/i)
    if (!match) return 0
    
    const value = parseInt(match[1])
    const unit = match[2].toLowerCase()
    
    switch (unit) {
      case 'year': return value
      case 'month': return value / 12
      case 'week': return value / 52
      case 'day': return value / 365
      default: return 0
    }
  }

  private getExperienceGroup(years: number): string {
    if (years <= 2) return '0-2 years'
    if (years <= 5) return '3-5 years'
    if (years <= 10) return '6-10 years'
    return '10+ years'
  }
}
