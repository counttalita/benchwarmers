import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createDisputeSchema = z.object({
  engagementId: z.string(),
  reason: z.enum(['payment', 'quality', 'communication', 'timeline', 'other']),
  description: z.string().min(10).max(1000),
  evidence: z.array(z.string()).optional()
})

const updateDisputeSchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved', 'closed']),
  resolution: z.string().optional(),
  adminNotes: z.string().optional()
})

export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const where: any = {}
    if (status) {
      where.status = status
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          engagement: {
            include: {
              talentRequest: true,
              profile: true,
              company: true
            }
          },
          reporter: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.dispute.count({ where })
    ])

    return NextResponse.json({
      success: true,
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error(error as Error, 'Failed to list disputes')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const body = await request.json()
    const validatedBody = createDisputeSchema.parse(body)

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the engagement
    const engagement = await prisma.engagement.findUnique({
      where: { id: validatedBody.engagementId },
      include: {
        profile: true,
        company: true
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Check if user is part of the engagement
    const companyId = request.headers.get('x-company-id')
    if (engagement.companyId !== companyId && engagement.profile.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if dispute already exists
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        engagementId: validatedBody.engagementId,
        status: { in: ['open', 'under_review'] }
      }
    })

    if (existingDispute) {
      return NextResponse.json(
        { error: 'Dispute already exists for this engagement' },
        { status: 400 }
      )
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        engagementId: validatedBody.engagementId,
        reporterId: userId,
        reason: validatedBody.reason,
        description: validatedBody.description,
        evidence: validatedBody.evidence || [],
        status: 'open'
      },
      include: {
        engagement: {
          include: {
            talentRequest: true,
            profile: true,
            company: true
          }
        },
        reporter: true
      }
    })

    return NextResponse.json({
      success: true,
      dispute
    }, { status: 201 })

  } catch (error) {
    requestLogger.error(error as Error, 'Failed to create dispute')
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
  const requestLogger = logger

  try {
    const body = await request.json()
    const validatedBody = updateDisputeSchema.parse(body)

    const disputeId = request.headers.get('x-dispute-id')
    if (!disputeId) {
      return NextResponse.json(
        { error: 'Dispute ID required' },
        { status: 400 }
      )
    }

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Update dispute
    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: validatedBody.status,
        resolution: validatedBody.resolution,
        adminNotes: validatedBody.adminNotes,
        resolvedAt: validatedBody.status === 'resolved' ? new Date() : null,
        resolvedBy: validatedBody.status === 'resolved' ? userId : null
      },
      include: {
        engagement: {
          include: {
            talentRequest: true,
            profile: true,
            company: true
          }
        },
        reporter: true
      }
    })

    return NextResponse.json({
      success: true,
      dispute
    })

  } catch (error) {
    requestLogger.error(error as Error, 'Failed to update dispute')
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
