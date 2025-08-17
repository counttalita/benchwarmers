import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { timesheetManager, TimesheetEntry } from '@/lib/timesheet/timesheet-manager'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const createTimesheetEntrySchema = z.object({
  engagementId: z.string().min(1, 'Engagement ID is required'),
  date: z.string().transform(str => new Date(str)),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  description: z.string().min(1, 'Description is required'),
  taskCategory: z.string().optional(),
  billable: z.boolean().default(true)
})

const submitTimesheetSchema = z.object({
  engagementId: z.string().min(1, 'Engagement ID is required'),
  weekStarting: z.string().transform(str => new Date(str))
})

// GET /api/timesheets - Get timesheet entries with filtering
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const engagementId = searchParams.get('engagementId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const billableOnly = searchParams.get('billableOnly') === 'true'
    const weekStarting = searchParams.get('weekStarting')

    if (!engagementId) {
      return NextResponse.json({
        success: false,
        error: 'Engagement ID is required',
        correlationId
      }, { status: 400 })
    }

    logInfo('Fetching timesheet entries', {
      correlationId,
      engagementId,
      filters: { startDate, endDate, status, billableOnly, weekStarting }
    })

    if (weekStarting) {
      // Get weekly summary
      const summary = await timesheetManager.getWeeklySummary(
        engagementId,
        new Date(weekStarting)
      )

      return NextResponse.json({
        success: true,
        data: summary,
        correlationId
      })
    } else {
      // Get filtered entries
      const filters: any = {}
      
      if (startDate) filters.startDate = new Date(startDate)
      if (endDate) filters.endDate = new Date(endDate)
      if (status) filters.status = status
      if (billableOnly) filters.billableOnly = true

      const entries = await timesheetManager.getEntries(engagementId, filters)

      logInfo('Timesheet entries retrieved successfully', {
        correlationId,
        entriesCount: entries.length
      })

      return NextResponse.json({
        success: true,
        data: entries,
        correlationId
      })
    }

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_timesheet_entries' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve timesheet entries',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/timesheets - Create new timesheet entry or submit timesheet
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    const action = body.action || 'create'
    
    logInfo('Processing timesheet request', {
      correlationId,
      action,
      requestBody: { ...body, action: undefined }
    })

    if (action === 'submit') {
      // Submit timesheet for approval
      const validatedData = submitTimesheetSchema.parse(body)

      const result = await timesheetManager.submitTimesheet(
        validatedData.engagementId,
        validatedData.weekStarting,
        correlationId
      )

      if (result.success) {
        logInfo('Timesheet submitted successfully', {
          correlationId,
          engagementId: validatedData.engagementId
        })

        return NextResponse.json({
          success: true,
          message: 'Timesheet submitted for approval',
          correlationId
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
          correlationId
        }, { status: 400 })
      }
    } else {
      // Create new timesheet entry
      const validatedData = createTimesheetEntrySchema.parse(body)

      // Calculate hours worked
      const hoursWorked = (validatedData.endTime.getTime() - validatedData.startTime.getTime()) / (1000 * 60 * 60)

      const entryData: Omit<TimesheetEntry, 'id'> = {
        engagementId: validatedData.engagementId,
        date: validatedData.date,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
        description: validatedData.description,
        taskCategory: validatedData.taskCategory,
        billable: validatedData.billable,
        status: 'draft'
      }

      const result = await timesheetManager.createEntry(entryData, correlationId)

      if (result.success) {
        logInfo('Timesheet entry created successfully', {
          correlationId,
          entryId: result.entryId
        })

        return NextResponse.json({
          success: true,
          data: {
            entryId: result.entryId,
            hoursWorked: entryData.hoursWorked
          },
          message: 'Timesheet entry created successfully',
          correlationId
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
          correlationId
        }, { status: 400 })
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'TIMESHEET_VALIDATION_ERROR',
        'Validation error processing timesheet request',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'process_timesheet_request' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process timesheet request',
      correlationId
    }, { status: 500 })
  }
}
