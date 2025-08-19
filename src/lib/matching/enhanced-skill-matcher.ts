import { Skill, SkillRequirement } from './matching-engine'

export interface SkillNode {
  name: string
  category: string
  level: string
  dependencies: SkillDependency[]
  synonyms: string[]
  relatedSkills: string[]
}

export interface SkillDependency {
  skill: string
  importance: number // 0-1
  type: 'prerequisite' | 'complementary' | 'alternative'
}

export interface SkillMatchResult {
  overallScore: number
  missingCritical: string[]
  skillGaps: SkillGap[]
  transferableSkills: string[]
  learningPath: LearningPath[]
  detailedMatches: DetailedSkillMatch[]
}

export interface SkillGap {
  skill: string
  gap: number // 0-1
  learnability: number // 0-1
  alternatives: string[]
}

export interface LearningPath {
  skill: string
  prerequisites: string[]
  estimatedTime: number // weeks
  resources: string[]
}

export interface DetailedSkillMatch {
  requiredSkill: string
  matchedSkill: string
  score: number
  levelCompatibility: number
  experienceDepth: number
  recencyFactor: number
  contextBonus: number
}

export class EnhancedSkillMatcher {
  private skillDependencies: Map<string, SkillDependency[]> = new Map([
    ['React', [
      { skill: 'JavaScript', importance: 0.9, type: 'prerequisite' },
      { skill: 'HTML', importance: 0.8, type: 'prerequisite' },
      { skill: 'CSS', importance: 0.7, type: 'prerequisite' },
      { skill: 'JSX', importance: 0.9, type: 'component' }
    ]],
    ['Node.js', [
      { skill: 'JavaScript', importance: 0.95, type: 'prerequisite' },
      { skill: 'npm', importance: 0.6, type: 'tool' },
      { skill: 'Express', importance: 0.7, type: 'framework' }
    ]],
    ['Python', [
      { skill: 'pip', importance: 0.5, type: 'tool' },
      { skill: 'virtualenv', importance: 0.4, type: 'tool' }
    ]],
    ['Docker', [
      { skill: 'Linux', importance: 0.6, type: 'prerequisite' },
      { skill: 'CLI', importance: 0.7, type: 'prerequisite' }
    ]],
    ['AWS', [
      { skill: 'Cloud Computing', importance: 0.8, type: 'prerequisite' },
      { skill: 'Linux', importance: 0.6, type: 'prerequisite' }
    ]]
  ])

  private skillSynonyms: Map<string, string[]> = new Map([
    ['javascript', ['js', 'node.js', 'nodejs', 'es6', 'typescript']],
    ['react', ['reactjs', 'react.js', 'nextjs', 'next.js']],
    ['python', ['django', 'flask', 'fastapi', 'pandas', 'numpy']],
    ['aws', ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation']],
    ['docker', ['containerization', 'kubernetes', 'k8s']],
    ['sql', ['mysql', 'postgresql', 'mongodb', 'database']],
    ['html', ['html5', 'css', 'frontend']],
    ['css', ['scss', 'sass', 'less', 'styling']],
    ['git', ['github', 'gitlab', 'version control']]
  ])

  calculateAdvancedSkillMatch(
    requiredSkills: SkillRequirement[],
    talentSkills: Skill[]
  ): SkillMatchResult {
    let totalScore = 0
    let totalWeight = 0
    const missingCritical: string[] = []
    const skillGaps: SkillGap[] = []
    const detailedMatches: DetailedSkillMatch[] = []

    for (const required of requiredSkills) {
      const matches = this.findSkillMatches(required, talentSkills)
      const skillWeight = this.getEnhancedSkillWeight(required)
      
      if (matches.length === 0) {
        if (required.isRequired) {
          missingCritical.push(required.name)
          // Check if talent has prerequisite skills that could bridge the gap
          const bridgeScore = this.calculateBridgeSkillScore(required, talentSkills)
          totalScore += bridgeScore * skillWeight * 0.3 // Reduced score for bridging
        }
        skillGaps.push({
          skill: required.name,
          gap: this.calculateSkillGap(required, talentSkills),
          learnability: this.assessLearnability(required, talentSkills),
          alternatives: this.findAlternativeSkills(required, talentSkills)
        })
      } else {
        const bestMatch = this.getBestSkillMatch(required, matches)
        const matchScore = this.calculateDetailedSkillScore(required, bestMatch)
        totalScore += matchScore * skillWeight
        
        detailedMatches.push({
          requiredSkill: required.name,
          matchedSkill: bestMatch.name,
          score: matchScore,
          levelCompatibility: this.calculateLevelCompatibility(required.level, bestMatch.level),
          experienceDepth: Math.min(bestMatch.yearsOfExperience / (required.yearsRequired || 3), 1.5),
          recencyFactor: this.calculateRecencyFactor(bestMatch),
          contextBonus: required.name === bestMatch.name ? 0.1 : 0
        })
      }
      
      totalWeight += skillWeight
    }

    return {
      overallScore: totalWeight > 0 ? totalScore / totalWeight : 0,
      missingCritical,
      skillGaps,
      transferableSkills: this.findTransferableSkills(requiredSkills, talentSkills),
      learningPath: this.generateLearningPath(skillGaps, talentSkills),
      detailedMatches
    }
  }

  private findSkillMatches(required: SkillRequirement, talentSkills: Skill[]): Skill[] {
    const matches: Skill[] = []
    const requiredName = required.name.toLowerCase()
    
    for (const talentSkill of talentSkills) {
      const talentName = talentSkill.name.toLowerCase()
      
      // Direct match
      if (talentName === requiredName) {
        matches.push(talentSkill)
        continue
      }
      
      // Synonym match
      const synonyms = this.skillSynonyms.get(requiredName) || []
      if (synonyms.includes(talentName)) {
        matches.push(talentSkill)
        continue
      }
      
      // Check if talent skill is a synonym of required skill
      for (const [key, values] of this.skillSynonyms.entries()) {
        if (values.includes(talentName) && key === requiredName) {
          matches.push(talentSkill)
          break
        }
      }
    }
    
    return matches
  }

  private getEnhancedSkillWeight(required: SkillRequirement): number {
    // Base weight from requirement
    let weight = required.weight / 10
    
    // Adjust based on skill criticality
    if (required.isRequired) {
      weight *= 1.5
    }
    
    // Adjust based on level - higher levels are more critical
    const levelMultiplier = {
      'junior': 0.8,
      'mid': 1.0,
      'senior': 1.2,
      'expert': 1.5
    }
    weight *= levelMultiplier[required.level] || 1.0
    
    return Math.min(weight, 1.0)
  }

  private calculateBridgeSkillScore(required: SkillRequirement, talentSkills: Skill[]): number {
    const dependencies = this.skillDependencies.get(required.name) || []
    let bridgeScore = 0
    
    for (const dep of dependencies) {
      const hasDependency = talentSkills.some(skill => 
        skill.name.toLowerCase() === dep.skill.toLowerCase()
      )
      if (hasDependency) {
        bridgeScore += dep.importance
      }
    }
    
    return Math.min(bridgeScore, 1.0)
  }

  private calculateDetailedSkillScore(required: SkillRequirement, talent: Skill): number {
    // Level compatibility with more nuanced scoring
    const levelScore = this.calculateLevelCompatibility(required.level, talent.level)
    
    // Experience depth bonus
    const experienceBonus = Math.min(talent.yearsOfExperience / (required.yearsRequired || 3), 1.5) * 0.2
    
    // Recency factor - skills used recently score higher
    const recencyFactor = this.calculateRecencyFactor(talent)
    
    // Domain context bonus - same category skills
    const contextBonus = required.name === talent.name ? 0.1 : 0
    
    return Math.min(levelScore + experienceBonus + recencyFactor + contextBonus, 1.0)
  }

  private calculateLevelCompatibility(requiredLevel: string, talentLevel: string): number {
    const levels = ['junior', 'mid', 'senior', 'expert']
    const requiredIndex = levels.indexOf(requiredLevel)
    const talentIndex = levels.indexOf(talentLevel)
    
    if (talentIndex >= requiredIndex) {
      return 1.0 // Talent meets or exceeds required level
    } else {
      // Partial credit for being close
      const gap = requiredIndex - talentIndex
      return Math.max(0.3, 1.0 - (gap * 0.2))
    }
  }

  private calculateRecencyFactor(talent: Skill): number {
    // For now, assume recent experience based on years
    // In a real implementation, this would use actual project dates
    if (talent.yearsOfExperience >= 2) {
      return 0.1 // Recent experience
    } else if (talent.yearsOfExperience >= 1) {
      return 0.05 // Somewhat recent
    }
    return 0.0 // No recent experience
  }

  private calculateSkillGap(required: SkillRequirement, talentSkills: Skill[]): number {
    // Calculate how far the talent is from having this skill
    const dependencies = this.skillDependencies.get(required.name) || []
    let gap = 1.0 // Full gap by default
    
    for (const dep of dependencies) {
      const hasDependency = talentSkills.some(skill => 
        skill.name.toLowerCase() === dep.skill.toLowerCase()
      )
      if (hasDependency) {
        gap -= dep.importance * 0.3 // Reduce gap based on prerequisites
      }
    }
    
    return Math.max(0, gap)
  }

  private assessLearnability(required: SkillRequirement, talentSkills: Skill[]): number {
    // Assess how easy it would be for this talent to learn the required skill
    const dependencies = this.skillDependencies.get(required.name) || []
    let learnability = 0.5 // Base learnability
    
    for (const dep of dependencies) {
      const hasDependency = talentSkills.some(skill => 
        skill.name.toLowerCase() === dep.skill.toLowerCase()
      )
      if (hasDependency) {
        learnability += dep.importance * 0.2
      }
    }
    
    // Boost learnability if talent has similar skills
    const similarSkills = this.findSimilarSkills(required.name, talentSkills)
    learnability += similarSkills.length * 0.1
    
    return Math.min(learnability, 1.0)
  }

  private findSimilarSkills(requiredSkill: string, talentSkills: Skill[]): string[] {
    // Find skills that are in the same category or related
    const skillCategories: Record<string, string[]> = {
      'frontend': ['html', 'css', 'javascript', 'react', 'vue', 'angular'],
      'backend': ['node.js', 'python', 'java', 'c#', 'php', 'ruby'],
      'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis'],
      'devops': ['docker', 'kubernetes', 'aws', 'azure', 'jenkins'],
      'mobile': ['react native', 'flutter', 'swift', 'kotlin']
    }
    
    const similar: string[] = []
    const requiredLower = requiredSkill.toLowerCase()
    
    for (const [category, skills] of Object.entries(skillCategories)) {
      if (skills.includes(requiredLower)) {
        // Add other skills in the same category that the talent has
        for (const skill of skills) {
          if (skill !== requiredLower && talentSkills.some(ts => ts.name.toLowerCase() === skill)) {
            similar.push(skill)
          }
        }
        break
      }
    }
    
    return similar
  }

  private findAlternativeSkills(required: SkillRequirement, talentSkills: Skill[]): string[] {
    // Find alternative skills that could fulfill the requirement
    const alternatives: string[] = []
    
    // Check for skills that are commonly used together or are alternatives
    const alternativeMappings: Record<string, string[]> = {
      'react': ['vue', 'angular', 'svelte'],
      'vue': ['react', 'angular', 'svelte'],
      'angular': ['react', 'vue', 'svelte'],
      'node.js': ['python', 'java', 'c#'],
      'python': ['node.js', 'java', 'c#'],
      'mysql': ['postgresql', 'mongodb', 'sqlite'],
      'aws': ['azure', 'google cloud', 'digitalocean']
    }
    
    const alternativesForSkill = alternativeMappings[required.name.toLowerCase()] || []
    for (const alt of alternativesForSkill) {
      if (talentSkills.some(skill => skill.name.toLowerCase() === alt)) {
        alternatives.push(alt)
      }
    }
    
    return alternatives
  }

  private findTransferableSkills(requiredSkills: SkillRequirement[], talentSkills: Skill[]): string[] {
    const transferable: string[] = []
    
    for (const talentSkill of talentSkills) {
      // Check if this skill could be useful for any of the required skills
      const dependencies = this.skillDependencies.get(talentSkill.name) || []
      for (const dep of dependencies) {
        const isRequired = requiredSkills.some(req => 
          req.name.toLowerCase() === dep.skill.toLowerCase()
        )
        if (isRequired && !transferable.includes(talentSkill.name)) {
          transferable.push(talentSkill.name)
        }
      }
    }
    
    return transferable
  }

  private generateLearningPath(skillGaps: SkillGap[], talentSkills: Skill[]): LearningPath[] {
    return skillGaps
      .filter(gap => gap.learnability > 0.3) // Only include learnable skills
      .map(gap => ({
        skill: gap.skill,
        prerequisites: this.getSkillPrerequisites(gap.skill),
        estimatedTime: this.estimateLearningTime(gap.skill, gap.learnability),
        resources: this.getLearningResources(gap.skill)
      }))
  }

  private getSkillPrerequisites(skill: string): string[] {
    const dependencies = this.skillDependencies.get(skill) || []
    return dependencies
      .filter(dep => dep.type === 'prerequisite')
      .map(dep => dep.skill)
  }

  private estimateLearningTime(skill: string, learnability: number): number {
    // Base learning times in weeks
    const baseTimes: Record<string, number> = {
      'react': 4,
      'node.js': 6,
      'python': 8,
      'docker': 3,
      'aws': 6
    }
    
    const baseTime = baseTimes[skill.toLowerCase()] || 4
    return Math.round(baseTime * (1 - learnability * 0.5)) // Faster if more learnable
  }

  private getLearningResources(skill: string): string[] {
    // Return learning resources for the skill
    const resources: Record<string, string[]> = {
      'react': ['React Documentation', 'Create React App', 'React Tutorial'],
      'node.js': ['Node.js Documentation', 'Express.js Guide', 'Node.js Tutorial'],
      'python': ['Python Documentation', 'Real Python', 'Python Tutorial'],
      'docker': ['Docker Documentation', 'Docker Tutorial', 'Docker Compose Guide'],
      'aws': ['AWS Documentation', 'AWS Tutorial', 'AWS Free Tier']
    }
    
    return resources[skill.toLowerCase()] || ['Online Documentation', 'Tutorials', 'Practice Projects']
  }

  private getBestSkillMatch(required: SkillRequirement, matches: Skill[]): Skill {
    if (matches.length === 0) {
      throw new Error('No matches provided')
    }
    
    // Return the best match based on level and experience
    return matches.reduce((best, current) => {
      const bestScore = this.calculateDetailedSkillScore(required, best)
      const currentScore = this.calculateDetailedSkillScore(required, current)
      return currentScore > bestScore ? current : best
    })
  }
}
