import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notifications/notification-service'
import logger from '@/lib/logger'
import { z } from 'zod'

const getNotificationsSchema = z.object({
  status: z.enum(['unread', 'read', 'archived']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
  type: z.string().optional()
})

const updatePreferencesSchema = z.object({
  type: z.string(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])),
  enabled: z.boolean(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
  frequency: z.enum(['immediate', 'daily', 'weekly']).optional()
})

export async function GET(request: NextRequest) {
  const correlationId = `notifications-get-${Date.now()}`
  
  try {
    logger.info('Getting notifications', { correlationId })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = getNotificationsSchema.parse(query)
    
    const notifications = await notificationService.getUserNotifications(
      userId,
      validatedQuery
    )

    const stats = await notificationService.getNotificationStats(userId)

    return NextResponse.json({
      notifications,
      stats,
      pagination: {
        limit: validatedQuery.limit || 50,
        offset: validatedQuery.offset || 0,
        total: stats.total
      }
    })

  } catch (error) {
    logger.error('Failed to get notifications', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = `notifications-post-${Date.now()}`
  
  try {
    logger.info('Creating notification via POST', { correlationId })

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
    logger.error('Failed to update notification preferences', {
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
