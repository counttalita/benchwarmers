import { NextRequest, NextResponse } from 'next/server'
import { calendarService } from '@/lib/interview/calendar-service'
import { logRequest, logError } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const scheduleInterviewSchema = z.object({
  talentId: z.string(),
  seekerId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string(),
  meetingType: z.enum(['video', 'audio', 'in_person']),
  meetingUrl: z.string().url().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
})

const getSlotsSchema = z.object({
  talentId: z.string(),
  date: z.string().datetime(),
  timezone: z.string()
})

export async function POST(request: NextRequest) {
  const correlationId = `schedule-interview-${Date.now()}`
  
  try {
    logRequest(request, correlationId)

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = scheduleInterviewSchema.parse(body)

    // Verify user is the seeker
    if (validatedBody.seekerId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. Only the seeker can schedule interviews.' },
        { status: 403 }
      )
    }

    // Schedule interview
    const interview = await calendarService.scheduleInterview({
      talentId: validatedBody.talentId,
      seekerId: validatedBody.seekerId,
      title: validatedBody.title,
      description: validatedBody.description,
      startTime: new Date(validatedBody.startTime),
      endTime: new Date(validatedBody.endTime),
      timezone: validatedBody.timezone,
      meetingType: validatedBody.meetingType,
      meetingUrl: validatedBody.meetingUrl,
      location: validatedBody.location,
      notes: validatedBody.notes
    })

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      interview,
      metadata: {
        correlationId,
        talentId: validatedBody.talentId,
        seekerId: validatedBody.seekerId,
        interviewId: interview.id
      }
    })

  } catch (error) {
    logError('Failed to schedule interview', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Schedule conflict detected') {
      return NextResponse.json(
        { error: 'Schedule conflict detected. Please choose a different time.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const correlationId = `get-slots-${Date.now()}`
  
  try {
    logRequest(request, correlationId)

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const talentId = searchParams.get('talentId')
    const date = searchParams.get('date')
    const timezone = searchParams.get('timezone') || 'UTC'

    if (!talentId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters: talentId and date' },
        { status: 400 }
      )
    }

    // Get available slots
    const slots = await calendarService.getAvailableSlots(
      talentId,
      new Date(date),
      timezone
    )

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      slots,
      metadata: {
        correlationId,
        talentId,
        date,
        timezone,
        slotCount: slots.length,
        availableCount: slots.filter(s => s.isAvailable).length
      }
    })

  } catch (error) {
    logError('Failed to get available slots', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
