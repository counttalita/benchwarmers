import { logError, logInfo, createError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

export interface TimesheetEntry {
  id?: string
  engagementId: string
  date: Date
  startTime: Date
  endTime: Date
  hoursWorked: number
  description: string
  taskCategory?: string
  billable: boolean
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submittedAt?: Date
  approvedAt?: Date
  approvedBy?: string
  rejectionReason?: string
}

export interface TimesheetSummary {
  engagementId: string
  weekStarting: Date
  totalHours: number
  billableHours: number
  entries: TimesheetEntry[]
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submittedAt?: Date
  approvedAt?: Date
}

export class TimesheetManager {
  
  /**
   * Create a new timesheet entry
   */
  async createEntry(entry: Omit<TimesheetEntry, 'id'>, correlationId?: string): Promise<{
    success: boolean
    entryId?: string
    error?: string
  }> {
    try {
      logInfo('Creating timesheet entry', {
        correlationId,
        engagementId: entry.engagementId,
        date: entry.date,
        hoursWorked: entry.hoursWorked
      })

      // Validate engagement exists and is active
      const engagement = await prisma.engagement.findUnique({
        where: { id: entry.engagementId },
        include: {
          timesheetEntries: true,
          contract: {
            include: {
              offer: true
            }
          }
        }
      })

      if (!engagement) {
        return { success: false, error: 'Engagement not found' }
      }

      if (engagement.status !== 'active') {
        return { success: false, error: 'Can only log time for active engagements' }
      }

      // Validate time entry
      if (entry.startTime >= entry.endTime) {
        return { success: false, error: 'End time must be after start time' }
      }

      const calculatedHours = (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60)
      if (Math.abs(calculatedHours - entry.hoursWorked) > 0.1) {
        return { success: false, error: 'Hours worked does not match time range' }
      }

      // Check for overlapping entries
      const existingEntry = await prisma.timesheetEntry.findUnique({
        where: {
          engagementId: entry.engagementId,
          date: entry.date,
          OR: [
            {
              AND: [
                { startTime: { lte: entry.startTime } },
                { endTime: { gt: entry.startTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: entry.endTime } },
                { endTime: { gte: entry.endTime } }
              ]
            }
          ]
        }
      })

      if (existingEntry) {
        return { success: false, error: 'Time entry overlaps with existing entry' }
      }

      // Create timesheet entry
      const newEntry = await prisma.timesheetEntry.create({
        data: {
          id: `TS-${Date.now()}`,
          engagementId: entry.engagementId,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          hoursWorked: entry.hoursWorked,
          description: entry.description,
          taskCategory: entry.taskCategory,
          billable: entry.billable,
          status: entry.status || 'draft'
        }
      })

      logInfo('Timesheet entry created successfully', {
        correlationId,
        entryId: newEntry.id,
        hoursWorked: entry.hoursWorked
      })

      return {
        success: true,
        entryId: newEntry.id
      }

    } catch (error) {
      logError(createError.internal('TIMESHEET_ENTRY_ERROR', 'Failed to create timesheet entry', { 
        error, 
        correlationId,
        engagementId: entry.engagementId 
      }))
      
      return {
        success: false,
        error: 'Internal error creating timesheet entry'
      }
    }
  }

  /**
   * Get timesheet entries for an engagement
   */
  async getEntries(
    engagementId: string,
    filters?: {
      startDate?: Date
      endDate?: Date
      status?: string
      billableOnly?: boolean
    }
  ): Promise<TimesheetEntry[]> {
    const where: { engagementId: string; date?: { gte?: Date; lte?: Date }; status?: string; billable?: boolean } = { engagementId }

    if (filters?.startDate) {
      where.date = { ...where.date, gte: filters.startDate }
    }

    if (filters?.endDate) {
      where.date = { ...where.date, lte: filters.endDate }
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.billableOnly) {
      where.billable = true
    }

    return await prisma.timesheetEntry.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' }
      ]
    })
  }

  /**
   * Get weekly timesheet summary
   */
  async getWeeklySummary(
    engagementId: string,
    weekStarting: Date
  ): Promise<TimesheetSummary> {
    const weekEnd = new Date(weekStarting)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const entries = await this.getEntries(engagementId, {
      startDate: weekStarting,
      endDate: weekEnd
    })

    const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0)
    const billableHours = entries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + entry.hoursWorked, 0)

    // Determine overall status
    let status: 'draft' | 'submitted' | 'approved' | 'rejected' = 'draft'
    let submittedAt: Date | undefined
    let approvedAt: Date | undefined

    if (entries.length > 0) {
      const allSubmitted = entries.every(e => e.status === 'submitted' || e.status === 'approved' || e.status === 'rejected')
      const allApproved = entries.every(e => e.status === 'approved')
      const anyRejected = entries.some(e => e.status === 'rejected')

      if (anyRejected) {
        status = 'rejected'
      } else if (allApproved) {
        status = 'approved'
        approvedAt = entries.reduce((latest, entry) => 
          entry.approvedAt && (!latest || entry.approvedAt > latest) ? entry.approvedAt : latest
        , undefined as Date | undefined)
      } else if (allSubmitted) {
        status = 'submitted'
        submittedAt = entries.reduce((latest, entry) => 
          entry.submittedAt && (!latest || entry.submittedAt > latest) ? entry.submittedAt : latest
        , undefined as Date | undefined)
      }
    }

    return {
      engagementId,
      weekStarting,
      totalHours,
      billableHours,
      entries,
      status,
      submittedAt,
      approvedAt
    }
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(
    engagementId: string,
    weekStarting: Date,
    correlationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logInfo('Submitting timesheet for approval', {
        correlationId,
        engagementId,
        weekStarting
      })

      const weekEnd = new Date(weekStarting)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Get all draft entries for the week
      const entries = await prisma.timesheetEntry.findMany({
        where: {
          engagementId,
          date: {
            gte: weekStarting,
            lte: weekEnd
          },
          status: 'draft'
        }
      })

      if (entries.length === 0) {
        return { success: false, error: 'No draft entries found for this week' }
      }

      // Update all entries to submitted
      await prisma.timesheetEntry.updateMany({
        where: {
          id: { in: entries.map((e: { id: string }) => e.id) }
        },
        data: {
          status: 'submitted',
          submittedAt: new Date()
        }
      })

      logInfo('Timesheet submitted successfully', {
        correlationId,
        engagementId,
        entriesCount: draftEntries.length
      })

      return { success: true }

    } catch (error) {
      logError(createError.internal('TIMESHEET_SUBMIT_ERROR', 'Failed to submit timesheet', { 
        error, 
        correlationId,
        engagementId 
      }))
      
      return {
        success: false,
        error: 'Internal error submitting timesheet'
      }
    }
  }

  /**
   * Approve/reject timesheet entries
   */
  async approveTimesheet(
    entryIds: string[],
    action: 'approve' | 'reject',
    approvedBy: string,
    rejectionReason?: string,
    correlationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logInfo('Processing timesheet approval', {
        correlationId,
        action,
        entryIds: entryIds.length,
        approvedBy
      })

      const updateData: { status: string; approvedAt?: Date; rejectedAt?: Date; rejectionReason?: string } = {
        status: action === 'approve' ? 'approved' : 'rejected'
      }

      if (action === 'approve') {
        updateData.approvedAt = new Date()
        updateData.approvedBy = approvedBy
      } else {
        updateData.rejectionReason = rejectionReason
      }

      await prisma.timesheetEntry.updateMany({
        where: {
          id: { in: entryIds },
          status: 'submitted'
        },
        data: updateData
      })

      logInfo('Timesheet entries processed successfully', {
        correlationId,
        action,
        entriesCount: entryIds.length
      })

      return { success: true }

    } catch (error) {
      logError(createError.internal('TIMESHEET_APPROVAL_ERROR', 'Failed to process timesheet approval', { 
        error, 
        correlationId 
      }))
      
      return {
        success: false,
        error: 'Internal error processing timesheet approval'
      }
    }
  }

  /**
   * Generate timesheet report
   */
  async generateReport(
    engagementId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    engagement: { id: string; status: string; startDate: Date; endDate?: Date; totalAmount: number }
    totalHours: number
    billableHours: number
    totalAmount: number
    entries: TimesheetEntry[]
    weeklySummaries: TimesheetSummary[]
  }> {
    // Get engagement details
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        contract: {
          include: {
            offer: true
          }
        }
      }
    })

    if (!engagement) {
      throw new Error('Engagement not found')
    }

    // Get all entries in date range
    const entries = await this.getEntries(engagementId, {
      startDate,
      endDate,
      status: 'approved'
    })

    const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0)
    const billableHours = entries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + entry.hoursWorked, 0)

    const hourlyRate = Number(engagement.contract.offer.rate)
    const totalAmount = billableHours * hourlyRate

    // Generate weekly summaries
    const weeklySummaries: TimesheetSummary[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
      
      const summary = await this.getWeeklySummary(engagementId, weekStart)
      if (summary.entries.length > 0) {
        weeklySummaries.push(summary)
      }
      
      currentDate.setDate(currentDate.getDate() + 7)
    }

    return {
      engagement,
      totalHours,
      billableHours,
      totalAmount,
      entries,
      weeklySummaries
    }
  }
}

// Export singleton instance
export const timesheetManager = new TimesheetManager()
