import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notifications/notification-service'
import { logRequest, logError, logInfo } from '@/lib/logger'
import { z } from 'zod'

const createNotificationSchema = z.object({
  userId: z.string(),
  companyId: z.string().optional(),
  type: z.enum([
    'match_created',
    'offer_received',
    'offer_accepted',
    'offer_declined',
    'payment_released',
    'payment_held',
    'engagement_started',
    'engagement_completed',
    'milestone_reached',
    'dispute_created',
    'dispute_resolved',
    'system_alert'
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  const correlationId = `create-notification-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Creating notification', { correlationId })

    const body = await request.json()
    const validatedBody = createNotificationSchema.parse(body)
    
    // Convert datetime strings to Date objects
    const notificationData = {
      ...validatedBody,
      scheduledFor: validatedBody.scheduledFor ? new Date(validatedBody.scheduledFor) : undefined,
      expiresAt: validatedBody.expiresAt ? new Date(validatedBody.expiresAt) : undefined
    }
    
    const notification = await notificationService.createNotification(notificationData)

    if (!notification) {
      return NextResponse.json({
        message: 'Notification skipped due to user preferences or quiet hours',
        skipped: true
      })
    }

    return NextResponse.json({
      message: 'Notification created and sent successfully',
      notification
    })

  } catch (error) {
    logError('Failed to create notification', {
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
  const correlationId = `bulk-create-notifications-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Bulk creating notifications', { correlationId })

    const body = await request.json()
    const notificationsData = z.array(createNotificationSchema).parse(body)
    
    const results = await Promise.allSettled(
      notificationsData.map(data => {
        const notificationData = {
          ...data,
          scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
        }
        return notificationService.createNotification(notificationData)
      })
    )

    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length
    const failed = results.filter(result => result.status === 'rejected').length
    const skipped = results.filter(result => result.status === 'fulfilled' && !result.value).length

    return NextResponse.json({
      message: 'Bulk notifications processed',
      summary: {
        total: notificationsData.length,
        successful,
        failed,
        skipped
      },
      results: results.map((result, index) => ({
        index,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : result.reason
      }))
    })

  } catch (error) {
    logError('Failed to create bulk notifications', {
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
