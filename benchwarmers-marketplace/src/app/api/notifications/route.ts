import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/notifications',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const read = searchParams.get('read') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    if (!userId) {
      requestLogger.warn('Missing userId in notifications request')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Build where clause for filtering
    const where: any = {
      userId
    }

    if (type) {
      where.type = type
    }

    if (searchParams.has('read')) {
      where.read = read
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.notification.count({ where })
    ])

    requestLogger.info('Notifications retrieved successfully', {
      count: notifications.length,
      total,
      page,
      limit,
      filters: { userId, type, read }
    })

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve notifications', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/notifications',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      userId,
      type,
      title,
      message,
      data,
      priority
    } = body

    if (!userId || !type || !title || !message) {
      requestLogger.warn('Missing required fields in notification creation')
      return NextResponse.json(
        { error: 'User ID, type, title, and message are required' },
        { status: 400 }
      )
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      requestLogger.warn('User not found for notification creation', { userId })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
        priority: priority || 'normal',
        read: false
      }
    })

    requestLogger.info('Notification created successfully', {
      notificationId: notification.id,
      userId,
      type,
      priority
    })

    return NextResponse.json({
      message: 'Notification created successfully',
      notification
    })

  } catch (error) {
    requestLogger.error('Failed to create notification', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'PUT', 
    path: '/api/notifications',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const { userId, notificationIds } = body

    if (!userId) {
      requestLogger.warn('Missing userId in notification update')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      requestLogger.warn('Missing or invalid notification IDs')
      return NextResponse.json(
        { error: 'Notification IDs array is required' },
        { status: 400 }
      )
    }

    // Mark notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds
        },
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    requestLogger.info('Notifications marked as read', {
      userId,
      count: result.count,
      notificationIds
    })

    return NextResponse.json({
      message: `${result.count} notifications marked as read`,
      updatedCount: result.count
    })

  } catch (error) {
    requestLogger.error('Failed to update notifications', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
