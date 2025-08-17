import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notifications/notification-service'
import { logRequest, logError, logInfo } from '@/lib/logger'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  type: z.string(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])),
  enabled: z.boolean(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
  frequency: z.enum(['immediate', 'daily', 'weekly']).optional()
})

const bulkUpdateSchema = z.object({
  preferences: z.array(updatePreferencesSchema)
})

export async function GET(request: NextRequest) {
  const correlationId = `preferences-get-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Getting notification preferences', { correlationId })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    const preferences = await notificationService.getNotificationPreferences(
      userId,
      companyId || undefined,
      type || undefined
    )

    return NextResponse.json({
      preferences
    })

  } catch (error) {
    logError('Failed to get notification preferences', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = `preferences-post-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Updating notification preferences', { correlationId })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    
    const body = await request.json()
    const validatedBody = updatePreferencesSchema.parse(body)
    
    const preferences = await notificationService.updateNotificationPreferences({
      userId,
      companyId: companyId || undefined,
      ...validatedBody
    })

    return NextResponse.json({
      message: 'Notification preferences updated successfully',
      preferences
    })

  } catch (error) {
    logError('Failed to update notification preferences', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = `preferences-bulk-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Bulk updating notification preferences', { correlationId })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    
    const body = await request.json()
    const validatedBody = bulkUpdateSchema.parse(body)
    
    const results = await Promise.all(
      validatedBody.preferences.map(pref =>
        notificationService.updateNotificationPreferences({
          userId,
          companyId: companyId || undefined,
          ...pref
        })
      )
    )

    return NextResponse.json({
      message: 'Notification preferences updated successfully',
      preferences: results
    })

  } catch (error) {
    logError('Failed to bulk update notification preferences', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
