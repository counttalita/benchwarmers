import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/engagements - Get engagements with filtering
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/engagements',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const talentId = searchParams.get('talentId')
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (talentId) {
      where.talentId = talentId
    }

    if (companyId) {
      where.companyId = companyId
    }

    if (status) {
      where.status = status
    }

    // Get engagements with pagination
    const [engagements, total] = await Promise.all([
      prisma.engagement.findMany({
        where,
        include: {
          talent: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              avatar: true,
              rating: true,
              totalReviews: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          },
          talentRequest: {
            select: {
              id: true,
              title: true,
              description: true,
              budget: true,
              duration: true
            }
          },
          offer: {
            select: {
              id: true,
              proposedRate: true,
              proposedDuration: true,
              message: true
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.engagement.count({ where })
    ])

    requestLogger.info('Engagements retrieved successfully', {
      count: engagements.length,
      total,
      page,
      limit,
      filters: { talentId, companyId, status }
    })

    return NextResponse.json({
      engagements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve engagements', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/engagements - Update engagement status
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/engagements',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      engagementId,
      action,
      completionNotes,
      hoursWorked
    } = body

    if (!engagementId || !action) {
      requestLogger.warn('Missing required fields in engagement update')
      return NextResponse.json(
        { error: 'Engagement ID and action are required' },
        { status: 400 }
      )
    }

    // Validate engagement exists
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        talent: true,
        company: true
      }
    })

    if (!engagement) {
      requestLogger.warn('Engagement not found for update', { engagementId })
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    let updatedEngagement

    switch (action) {
      case 'start':
        if (engagement.status !== 'active') {
          requestLogger.warn('Engagement not in active status for start', { engagementId, status: engagement.status })
          return NextResponse.json(
            { error: 'Engagement must be active to start' },
            { status: 400 }
          )
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'in_progress',
            startedAt: new Date()
          },
          include: {
            talent: true,
            company: true
          }
        })

        requestLogger.info('Engagement started', { engagementId })
        break

      case 'complete':
        if (engagement.status !== 'in_progress') {
          requestLogger.warn('Engagement not in progress for completion', { engagementId, status: engagement.status })
          return NextResponse.json(
            { error: 'Engagement must be in progress to complete' },
            { status: 400 }
          )
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            completionNotes,
            hoursWorked
          },
          include: {
            talent: true,
            company: true
          }
        })

        requestLogger.info('Engagement completed', { engagementId, hoursWorked })
        break

      case 'pause':
        if (engagement.status !== 'in_progress') {
          requestLogger.warn('Engagement not in progress for pause', { engagementId, status: engagement.status })
          return NextResponse.json(
            { error: 'Engagement must be in progress to pause' },
            { status: 400 }
          )
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'paused',
            pausedAt: new Date()
          },
          include: {
            talent: true,
            company: true
          }
        })

        requestLogger.info('Engagement paused', { engagementId })
        break

      case 'resume':
        if (engagement.status !== 'paused') {
          requestLogger.warn('Engagement not paused for resume', { engagementId, status: engagement.status })
          return NextResponse.json(
            { error: 'Engagement must be paused to resume' },
            { status: 400 }
          )
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'in_progress',
            resumedAt: new Date()
          },
          include: {
            talent: true,
            company: true
          }
        })

        requestLogger.info('Engagement resumed', { engagementId })
        break

      case 'cancel':
        if (!['active', 'in_progress', 'paused'].includes(engagement.status)) {
          requestLogger.warn('Engagement not in cancellable status', { engagementId, status: engagement.status })
          return NextResponse.json(
            { error: 'Engagement cannot be cancelled in current status' },
            { status: 400 }
          )
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationNotes: completionNotes
          },
          include: {
            talent: true,
            company: true
          }
        })

        requestLogger.info('Engagement cancelled', { engagementId })
        break

      default:
        requestLogger.warn('Invalid action for engagement update', { action })
        return NextResponse.json(
          { error: 'Invalid action. Must be start, complete, pause, resume, or cancel' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: `Engagement ${action}ed successfully`,
      engagement: updatedEngagement
    })

  } catch (error) {
    requestLogger.error('Failed to update engagement', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
