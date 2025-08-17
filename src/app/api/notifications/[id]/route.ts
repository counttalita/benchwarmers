import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notifications/notification-service'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'

const updateNotificationSchema = z.object({
  action: z.enum(['read', 'archive'])
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `notification-update-${Date.now()}`
  
  try {
    logRequest(request, { correlationId, notificationId: params.id })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    
    const body = await request.json()
    const validatedBody = updateNotificationSchema.parse(body)
    
    let notification
    
    switch (validatedBody.action) {
      case 'read':
        notification = await notificationService.markAsRead(params.id, userId)
        break
      case 'archive':
        notification = await notificationService.archiveNotification(params.id, userId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: `Notification ${validatedBody.action} successfully`,
      notification
    })

  } catch (error) {
    logError('Failed to update notification', {
      correlationId,
      notificationId: params.id,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `notification-delete-${Date.now()}`
  
  try {
    logRequest(request, { correlationId, notificationId: params.id })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    
    // For now, we'll archive instead of delete to maintain data integrity
    const notification = await notificationService.archiveNotification(params.id, userId)

    return NextResponse.json({
      message: 'Notification archived successfully',
      notification
    })

  } catch (error) {
    logError('Failed to delete notification', {
      correlationId,
      notificationId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
