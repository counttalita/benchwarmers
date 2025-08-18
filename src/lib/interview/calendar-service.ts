import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { z } from 'zod'

export interface InterviewSlot {
  id: string
  startTime: Date
  endTime: Date
  timezone: string
  isAvailable: boolean
  bookedBy?: string
  interviewId?: string
}

export interface InterviewSchedule {
  id: string
  talentId: string
  seekerId: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  timezone: string
  meetingType: 'video' | 'audio' | 'in_person'
  meetingUrl?: string
  location?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CalendarIntegration {
  type: 'google' | 'outlook' | 'zoom' | 'teams'
  accessToken: string
  refreshToken?: string
  calendarId?: string
  userId: string
}

const interviewScheduleSchema = z.object({
  talentId: z.string(),
  seekerId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  timezone: z.string(),
  meetingType: z.enum(['video', 'audio', 'in_person']),
  meetingUrl: z.string().url().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
})

export class CalendarService {
  /**
   * Create an interview schedule
   */
  async scheduleInterview(data: z.infer<typeof interviewScheduleSchema>): Promise<InterviewSchedule> {
    try {
      // Validate input
      const validatedData = interviewScheduleSchema.parse(data)

      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(
        validatedData.talentId,
        validatedData.startTime,
        validatedData.endTime
      )

      if (conflicts.length > 0) {
        throw new Error('Schedule conflict detected')
      }

      // Create interview schedule
      const interview = await prisma.interviewSchedule.create({
        data: {
          talentId: validatedData.talentId,
          seekerId: validatedData.seekerId,
          title: validatedData.title,
          description: validatedData.description,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          timezone: validatedData.timezone,
          meetingType: validatedData.meetingType,
          meetingUrl: validatedData.meetingUrl,
          location: validatedData.location,
          status: 'scheduled',
          notes: validatedData.notes
        }
      })

      // Create calendar event if integration is available
      await this.createCalendarEvent(interview)

      // Send notifications
      await this.sendInterviewNotifications(interview)

      logger.info('Interview scheduled successfully', {
        interviewId: interview.id,
        talentId: validatedData.talentId,
        seekerId: validatedData.seekerId,
        startTime: validatedData.startTime
      })

      return interview

    } catch (error) {
      logger.error('Failed to schedule interview', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get available time slots for a talent
   */
  async getAvailableSlots(
    talentId: string,
    date: Date,
    timezone: string
  ): Promise<InterviewSlot[]> {
    try {
      // Get talent's availability preferences
      const talent = await prisma.talentProfile.findUnique({
        where: { id: talentId },
        select: {
          availability: true,
          timezone: true,
          workingHours: true
        }
      })

      if (!talent) {
        throw new Error('Talent not found')
      }

      // Generate time slots based on working hours
      const slots = this.generateTimeSlots(date, talent.workingHours || {}, timezone)

      // Filter out booked slots
      const bookedSlots = await this.getBookedSlots(talentId, date)
      const availableSlots = slots.map(slot => ({
        ...slot,
        isAvailable: !bookedSlots.some(booked => 
          this.isTimeOverlap(slot.startTime, slot.endTime, booked.startTime, booked.endTime)
        )
      }))

      return availableSlots

    } catch (error) {
      logger.error('Failed to get available slots', {
        talentId,
        date,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Reschedule an interview
   */
  async rescheduleInterview(
    interviewId: string,
    newStartTime: Date,
    newEndTime: Date,
    reason?: string
  ): Promise<InterviewSchedule> {
    try {
      // Get current interview
      const interview = await prisma.interviewSchedule.findUnique({
        where: { id: interviewId }
      })

      if (!interview) {
        throw new Error('Interview not found')
      }

      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(
        interview.talentId,
        newStartTime,
        newEndTime,
        interviewId
      )

      if (conflicts.length > 0) {
        throw new Error('Schedule conflict detected')
      }

      // Update interview
      const updatedInterview = await prisma.interviewSchedule.update({
        where: { id: interviewId },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          status: 'rescheduled',
          notes: reason ? `${interview.notes || ''}\nRescheduled: ${reason}` : interview.notes
        }
      })

      // Update calendar event
      await this.updateCalendarEvent(updatedInterview)

      // Send reschedule notifications
      await this.sendRescheduleNotifications(updatedInterview, reason)

      logger.info('Interview rescheduled successfully', {
        interviewId,
        newStartTime,
        newEndTime
      })

      return updatedInterview

    } catch (error) {
      logger.error('Failed to reschedule interview', {
        interviewId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(interviewId: string, reason?: string): Promise<void> {
    try {
      const interview = await prisma.interviewSchedule.findUnique({
        where: { id: interviewId }
      })

      if (!interview) {
        throw new Error('Interview not found')
      }

      // Update interview status
      await prisma.interviewSchedule.update({
        where: { id: interviewId },
        data: {
          status: 'cancelled',
          notes: reason ? `${interview.notes || ''}\nCancelled: ${reason}` : interview.notes
        }
      })

      // Remove calendar event
      await this.removeCalendarEvent(interview)

      // Send cancellation notifications
      await this.sendCancellationNotifications(interview, reason)

      logger.info('Interview cancelled successfully', {
        interviewId,
        reason
      })

    } catch (error) {
      logger.error('Failed to cancel interview', {
        interviewId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get interview schedule for a user
   */
  async getUserInterviews(userId: string, role: 'talent' | 'seeker'): Promise<InterviewSchedule[]> {
    try {
      const whereClause = role === 'talent' 
        ? { talentId: userId }
        : { seekerId: userId }

      const interviews = await prisma.interviewSchedule.findMany({
        where: whereClause,
        orderBy: { startTime: 'asc' },
        include: {
          talent: {
            select: {
              name: true,
              title: true,
              company: {
                select: { name: true }
              }
            }
          },
          seeker: {
            select: {
              name: true,
              company: {
                select: { name: true }
              }
            }
          }
        }
      })

      return interviews

    } catch (error) {
      logger.error('Failed to get user interviews', {
        userId,
        role,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Add calendar integration
   */
  async addCalendarIntegration(data: {
    userId: string
    type: 'google' | 'outlook' | 'zoom' | 'teams'
    accessToken: string
    refreshToken?: string
    calendarId?: string
  }): Promise<void> {
    try {
      await prisma.calendarIntegration.upsert({
        where: {
          userId_type: {
            userId: data.userId,
            type: data.type
          }
        },
        update: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          calendarId: data.calendarId,
          updatedAt: new Date()
        },
        create: {
          userId: data.userId,
          type: data.type,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          calendarId: data.calendarId
        }
      })

      logger.info('Calendar integration added successfully', {
        userId: data.userId,
        type: data.type
      })

    } catch (error) {
      logger.error('Failed to add calendar integration', {
        userId: data.userId,
        type: data.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  // Private helper methods
  private async checkScheduleConflicts(
    talentId: string,
    startTime: Date,
    endTime: Date,
    excludeInterviewId?: string
  ): Promise<InterviewSchedule[]> {
    const whereClause: any = {
      talentId,
      status: { in: ['scheduled', 'rescheduled'] },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime }
        }
      ]
    }

    if (excludeInterviewId) {
      whereClause.id = { not: excludeInterviewId }
    }

    return await prisma.interviewSchedule.findMany({ where: whereClause })
  }

  private generateTimeSlots(
    date: Date,
    workingHours: Record<string, any>,
    timezone: string
  ): InterviewSlot[] {
    const slots: InterviewSlot[] = []
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' })
    const hours = workingHours[dayOfWeek] || { start: '09:00', end: '17:00' }

    const startHour = parseInt(hours.start.split(':')[0])
    const endHour = parseInt(hours.end.split(':')[0])

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = new Date(date)
      startTime.setHours(hour, 0, 0, 0)

      const endTime = new Date(date)
      endTime.setHours(hour + 1, 0, 0, 0)

      slots.push({
        id: `slot-${date.getTime()}-${hour}`,
        startTime,
        endTime,
        timezone,
        isAvailable: true
      })
    }

    return slots
  }

  private async getBookedSlots(talentId: string, date: Date): Promise<InterviewSchedule[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return await prisma.interviewSchedule.findMany({
      where: {
        talentId,
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: { in: ['scheduled', 'rescheduled'] }
      }
    })
  }

  private isTimeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1
  }

  private async createCalendarEvent(interview: InterviewSchedule): Promise<void> {
    try {
      // Get calendar integration for both users
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          userId: { in: [interview.talentId, interview.seekerId] }
        }
      })

      // Create calendar events for each integration
      for (const integration of integrations) {
        await this.createEventForIntegration(integration, interview)
      }

    } catch (error) {
      logger.error('Failed to create calendar event', {
        interviewId: interview.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async createEventForIntegration(
    integration: any,
    interview: InterviewSchedule
  ): Promise<void> {
    // This would integrate with actual calendar APIs
    // For now, just log the event creation
    logger.info('Calendar event created', {
      integrationType: integration.type,
      userId: integration.userId,
      interviewId: interview.id,
      title: interview.title,
      startTime: interview.startTime
    })
  }

  private async updateCalendarEvent(interview: InterviewSchedule): Promise<void> {
    // Update calendar events for rescheduled interviews
    logger.info('Calendar event updated', {
      interviewId: interview.id,
      startTime: interview.startTime
    })
  }

  private async removeCalendarEvent(interview: InterviewSchedule): Promise<void> {
    // Remove calendar events for cancelled interviews
    logger.info('Calendar event removed', {
      interviewId: interview.id
    })
  }

  private async sendInterviewNotifications(interview: InterviewSchedule): Promise<void> {
    // Send notifications to both talent and seeker
    logger.info('Interview notifications sent', {
      interviewId: interview.id,
      talentId: interview.talentId,
      seekerId: interview.seekerId
    })
  }

  private async sendRescheduleNotifications(
    interview: InterviewSchedule,
    reason?: string
  ): Promise<void> {
    // Send reschedule notifications
    logger.info('Reschedule notifications sent', {
      interviewId: interview.id,
      reason
    })
  }

  private async sendCancellationNotifications(
    interview: InterviewSchedule,
    reason?: string
  ): Promise<void> {
    // Send cancellation notifications
    logger.info('Cancellation notifications sent', {
      interviewId: interview.id,
      reason
    })
  }
}

export const calendarService = new CalendarService()
