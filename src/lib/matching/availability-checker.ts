import { prisma } from '@/lib/prisma'
import { logError, logInfo } from '@/lib/errors'

export interface AvailabilitySlot {
  id: string
  talentId: string
  startDate: Date
  endDate: Date
  capacity: number // 0-100 percentage
  timezone: string
  isRecurring: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    daysOfWeek?: number[] // 0-6, Sunday = 0
    endDate?: Date
  }
  status: 'available' | 'booked' | 'tentative' | 'blocked'
  createdAt: Date
  updatedAt: Date
}

export interface ProjectTimeframe {
  startDate: Date
  endDate: Date
  hoursPerWeek: number
  timezone: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
}

export interface AvailabilityMatch {
  talentId: string
  overlapPercentage: number
  availableHours: number
  conflictingBookings: number
  immediateAvailability: boolean
  capacityUtilization: number
  timezoneCompatibility: number
  availabilityScore: number
  concerns: string[]
  recommendations: string[]
}

export class AvailabilityChecker {
  
  /**
   * Check real-time availability for multiple talents against a project timeframe
   */
  async checkAvailability(
    talentIds: string[],
    projectTimeframe: ProjectTimeframe,
    correlationId?: string
  ): Promise<AvailabilityMatch[]> {
    
    logInfo('Checking availability for talents', {
      correlationId,
      talentCount: talentIds.length,
      projectStart: projectTimeframe.startDate,
      projectEnd: projectTimeframe.endDate
    })

    try {
      // Fetch availability data for all talents
      const availabilityData = await this.fetchTalentAvailability(talentIds)
      
      // Check each talent's availability
      const matches = await Promise.all(
        talentIds.map(talentId => 
          this.checkTalentAvailability(talentId, projectTimeframe, availabilityData[talentId] || [])
        )
      )

      logInfo('Availability check completed', {
        correlationId,
        matchesFound: matches.length,
        averageScore: matches.reduce((sum, m) => sum + m.availabilityScore, 0) / matches.length
      })

      return matches

    } catch (error) {
      logError('Error checking availability', error, { correlationId, talentIds })
      throw error
    }
  }

  /**
   * Fetch availability slots for multiple talents from database
   */
  private async fetchTalentAvailability(talentIds: string[]): Promise<Record<string, AvailabilitySlot[]>> {
    const availabilityRecords = await prisma.talentProfile.findMany({
      where: {
        id: { in: talentIds }
      },
      select: {
        id: true,
        availability: true,
        timezone: true
      }
    })

    const result: Record<string, AvailabilitySlot[]> = {}
    
    for (const record of availabilityRecords) {
      // Parse availability JSON data and convert to AvailabilitySlot format
      const availability = Array.isArray(record.availability) ? record.availability : []
      
      result[record.id] = availability.map((slot: any, index: number) => ({
        id: `${record.id}-${index}`,
        talentId: record.id,
        startDate: new Date(slot.startDate),
        endDate: new Date(slot.endDate),
        capacity: slot.capacity || 100,
        timezone: record.timezone || 'UTC',
        isRecurring: slot.isRecurring || false,
        recurringPattern: slot.recurringPattern,
        status: slot.status || 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    }

    return result
  }

  /**
   * Check availability for a single talent
   */
  private async checkTalentAvailability(
    talentId: string,
    projectTimeframe: ProjectTimeframe,
    availabilitySlots: AvailabilitySlot[]
  ): Promise<AvailabilityMatch> {
    
    // Expand recurring slots into actual time slots
    const expandedSlots = this.expandRecurringSlots(availabilitySlots, projectTimeframe)
    
    // Calculate overlap with project timeframe
    const overlap = this.calculateTimeframeOverlap(expandedSlots, projectTimeframe)
    
    // Check for conflicting bookings
    const conflicts = await this.checkConflictingBookings(talentId, projectTimeframe)
    
    // Calculate timezone compatibility
    const timezoneCompatibility = this.calculateTimezoneCompatibility(
      projectTimeframe.timezone,
      expandedSlots[0]?.timezone || 'UTC'
    )
    
    // Calculate capacity utilization
    const capacityUtilization = this.calculateCapacityUtilization(expandedSlots, projectTimeframe)
    
    // Generate concerns and recommendations
    const concerns = this.generateAvailabilityConcerns(overlap, conflicts, capacityUtilization)
    const recommendations = this.generateRecommendations(overlap, projectTimeframe, expandedSlots)
    
    // Calculate overall availability score
    const availabilityScore = this.calculateAvailabilityScore({
      overlapPercentage: overlap.percentage,
      conflictingBookings: conflicts.length,
      capacityUtilization,
      timezoneCompatibility,
      urgency: projectTimeframe.urgency
    })

    return {
      talentId,
      overlapPercentage: overlap.percentage,
      availableHours: overlap.hours,
      conflictingBookings: conflicts.length,
      immediateAvailability: this.checkImmediateAvailability(expandedSlots, projectTimeframe.startDate),
      capacityUtilization,
      timezoneCompatibility,
      availabilityScore,
      concerns,
      recommendations
    }
  }

  /**
   * Expand recurring availability slots into actual time periods
   */
  private expandRecurringSlots(
    slots: AvailabilitySlot[],
    projectTimeframe: ProjectTimeframe
  ): AvailabilitySlot[] {
    const expandedSlots: AvailabilitySlot[] = []
    
    for (const slot of slots) {
      if (!slot.isRecurring || !slot.recurringPattern) {
        expandedSlots.push(slot)
        continue
      }
      
      const pattern = slot.recurringPattern
      const patternEndDate = pattern.endDate || projectTimeframe.endDate
      
      let currentDate = new Date(slot.startDate)
      let slotIndex = 0
      
      while (currentDate <= patternEndDate && currentDate <= projectTimeframe.endDate) {
        // Check if this occurrence should be included based on pattern
        if (this.shouldIncludeRecurrence(currentDate, pattern)) {
          const slotDuration = slot.endDate.getTime() - slot.startDate.getTime()
          const expandedSlot: AvailabilitySlot = {
            ...slot,
            id: `${slot.id}-recurring-${slotIndex}`,
            startDate: new Date(currentDate),
            endDate: new Date(currentDate.getTime() + slotDuration),
            isRecurring: false // Mark as expanded
          }
          expandedSlots.push(expandedSlot)
          slotIndex++
        }
        
        // Move to next occurrence
        currentDate = this.getNextRecurrence(currentDate, pattern)
      }
    }
    
    return expandedSlots
  }

  /**
   * Check if a date should be included in recurring pattern
   */
  private shouldIncludeRecurrence(date: Date, pattern: any): boolean {
    if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
      return pattern.daysOfWeek.includes(date.getDay())
    }
    return true
  }

  /**
   * Get next occurrence date for recurring pattern
   */
  private getNextRecurrence(currentDate: Date, pattern: any): Date {
    const nextDate = new Date(currentDate)
    
    switch (pattern.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + pattern.interval)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * pattern.interval))
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + pattern.interval)
        break
    }
    
    return nextDate
  }

  /**
   * Calculate overlap between availability slots and project timeframe
   */
  private calculateTimeframeOverlap(
    slots: AvailabilitySlot[],
    projectTimeframe: ProjectTimeframe
  ): { percentage: number; hours: number } {
    
    const projectStart = projectTimeframe.startDate
    const projectEnd = projectTimeframe.endDate
    const projectDuration = projectEnd.getTime() - projectStart.getTime()
    
    let totalOverlapTime = 0
    
    for (const slot of slots) {
      if (slot.status !== 'available') continue
      
      const overlapStart = new Date(Math.max(slot.startDate.getTime(), projectStart.getTime()))
      const overlapEnd = new Date(Math.min(slot.endDate.getTime(), projectEnd.getTime()))
      
      if (overlapStart < overlapEnd) {
        const overlapDuration = overlapEnd.getTime() - overlapStart.getTime()
        const capacityAdjustedOverlap = overlapDuration * (slot.capacity / 100)
        totalOverlapTime += capacityAdjustedOverlap
      }
    }
    
    const overlapPercentage = projectDuration > 0 ? (totalOverlapTime / projectDuration) * 100 : 0
    const overlapHours = totalOverlapTime / (1000 * 60 * 60) // Convert to hours
    
    return {
      percentage: Math.min(100, Math.round(overlapPercentage * 100) / 100),
      hours: Math.round(overlapHours * 100) / 100
    }
  }

  /**
   * Check for conflicting bookings during project timeframe
   */
  private async checkConflictingBookings(
    talentId: string,
    projectTimeframe: ProjectTimeframe
  ): Promise<any[]> {
    
    // Query existing engagements/bookings that overlap with project timeframe
    const conflicts = await prisma.engagement.findMany({
      where: {
        talentId,
        status: { in: ['active', 'confirmed'] },
        OR: [
          {
            startDate: {
              lte: projectTimeframe.endDate
            },
            endDate: {
              gte: projectTimeframe.startDate
            }
          }
        ]
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        hoursPerWeek: true,
        status: true
      }
    })
    
    return conflicts
  }

  /**
   * Calculate timezone compatibility score
   */
  private calculateTimezoneCompatibility(projectTimezone: string, talentTimezone: string): number {
    const timezoneOffsets: Record<string, number> = {
      'UTC': 0, 'EST': -5, 'CST': -6, 'MST': -7, 'PST': -8,
      'GMT': 0, 'CET': 1, 'EET': 2, 'JST': 9, 'AEST': 10, 'IST': 5.5
    }
    
    const projectOffset = timezoneOffsets[projectTimezone] || 0
    const talentOffset = timezoneOffsets[talentTimezone] || 0
    const timeDiff = Math.abs(projectOffset - talentOffset)
    
    if (timeDiff <= 2) return 100
    if (timeDiff <= 4) return 80
    if (timeDiff <= 6) return 60
    if (timeDiff <= 8) return 40
    return 20
  }

  /**
   * Calculate capacity utilization
   */
  private calculateCapacityUtilization(
    slots: AvailabilitySlot[],
    projectTimeframe: ProjectTimeframe
  ): number {
    
    const availableSlots = slots.filter(slot => slot.status === 'available')
    if (availableSlots.length === 0) return 0
    
    const averageCapacity = availableSlots.reduce((sum, slot) => sum + slot.capacity, 0) / availableSlots.length
    return Math.round(averageCapacity * 100) / 100
  }

  /**
   * Check if talent is immediately available
   */
  private checkImmediateAvailability(slots: AvailabilitySlot[], projectStartDate: Date): boolean {
    const now = new Date()
    const gracePeriod = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    
    return slots.some(slot => 
      slot.status === 'available' &&
      slot.startDate <= new Date(now.getTime() + gracePeriod) &&
      slot.endDate >= projectStartDate
    )
  }

  /**
   * Generate availability concerns
   */
  private generateAvailabilityConcerns(
    overlap: { percentage: number; hours: number },
    conflicts: any[],
    capacityUtilization: number
  ): string[] {
    
    const concerns: string[] = []
    
    if (overlap.percentage < 50) {
      concerns.push(`Limited availability - only ${overlap.percentage}% overlap with project timeline`)
    }
    
    if (conflicts.length > 0) {
      concerns.push(`${conflicts.length} conflicting engagement${conflicts.length > 1 ? 's' : ''} during project period`)
    }
    
    if (capacityUtilization > 80) {
      concerns.push(`High capacity utilization (${capacityUtilization}%) - may be overbooked`)
    }
    
    if (overlap.hours < 40) {
      concerns.push(`Limited available hours (${overlap.hours}h) for project requirements`)
    }
    
    return concerns
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    overlap: { percentage: number; hours: number },
    projectTimeframe: ProjectTimeframe,
    slots: AvailabilitySlot[]
  ): string[] {
    
    const recommendations: string[] = []
    
    if (overlap.percentage < 80) {
      recommendations.push('Consider adjusting project timeline for better availability match')
    }
    
    const immediateSlots = slots.filter(slot => 
      slot.startDate <= projectTimeframe.startDate &&
      slot.status === 'available'
    )
    
    if (immediateSlots.length === 0) {
      const nextAvailable = slots
        .filter(slot => slot.status === 'available')
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]
      
      if (nextAvailable) {
        const daysUntilAvailable = Math.ceil(
          (nextAvailable.startDate.getTime() - projectTimeframe.startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        recommendations.push(`Talent available in ${daysUntilAvailable} days - consider delayed start`)
      }
    }
    
    if (projectTimeframe.hoursPerWeek > overlap.hours) {
      recommendations.push('Consider reducing weekly hour requirements or extending project duration')
    }
    
    return recommendations
  }

  /**
   * Calculate overall availability score
   */
  private calculateAvailabilityScore(params: {
    overlapPercentage: number
    conflictingBookings: number
    capacityUtilization: number
    timezoneCompatibility: number
    urgency: string
  }): number {
    
    let score = 0
    
    // Base score from overlap percentage
    score += params.overlapPercentage * 0.4
    
    // Penalty for conflicts
    score -= params.conflictingBookings * 15
    
    // Capacity utilization score (sweet spot around 60-80%)
    if (params.capacityUtilization >= 60 && params.capacityUtilization <= 80) {
      score += 20
    } else if (params.capacityUtilization < 60) {
      score += params.capacityUtilization * 0.3
    } else {
      score += Math.max(0, 100 - params.capacityUtilization) * 0.2
    }
    
    // Timezone compatibility
    score += params.timezoneCompatibility * 0.2
    
    // Urgency bonus/penalty
    if (params.urgency === 'urgent') {
      score += params.overlapPercentage > 80 ? 10 : -20
    } else if (params.urgency === 'high') {
      score += params.overlapPercentage > 60 ? 5 : -10
    }
    
    return Math.max(0, Math.min(100, Math.round(score * 100) / 100))
  }

  /**
   * Get availability summary for a talent
   */
  async getAvailabilitySummary(talentId: string): Promise<{
    totalSlots: number
    availableSlots: number
    bookedSlots: number
    averageCapacity: number
    nextAvailableDate: Date | null
    upcomingConflicts: number
  }> {
    
    const slots = await this.fetchTalentAvailability([talentId])
    const talentSlots = slots[talentId] || []
    
    const availableSlots = talentSlots.filter(slot => slot.status === 'available')
    const bookedSlots = talentSlots.filter(slot => slot.status === 'booked')
    
    const averageCapacity = availableSlots.length > 0 
      ? availableSlots.reduce((sum, slot) => sum + slot.capacity, 0) / availableSlots.length
      : 0
    
    const nextAvailableDate = availableSlots
      .filter(slot => slot.startDate > new Date())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]?.startDate || null
    
    const upcomingConflicts = await prisma.engagement.count({
      where: {
        talentId,
        status: { in: ['active', 'confirmed'] },
        startDate: { gte: new Date() }
      }
    })
    
    return {
      totalSlots: talentSlots.length,
      availableSlots: availableSlots.length,
      bookedSlots: bookedSlots.length,
      averageCapacity: Math.round(averageCapacity * 100) / 100,
      nextAvailableDate,
      upcomingConflicts
    }
  }
}
