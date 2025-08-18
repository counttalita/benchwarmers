import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createDisputeSchema = z.object({
  engagementId: z.string().min(1),
  reason: z.enum(['payment', 'quality', 'communication', 'timeline', 'other']),
  description: z.string().min(1).max(2000),
  evidence: z.array(z.string()).optional()
})

const updateDisputeSchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved', 'closed']).optional(),
  resolution: z.string().max(2000).optional(),
  adminNotes: z.string().max(2000).optional(),
  refundAmount: z.number().min(0).optional()
})

// POST /api/admin/disputes - Create a new dispute
export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = createDisputeSchema.parse(body)

    // Check if engagement exists
    const engagement = await prisma.engagement.findUnique({
      where: { id: validatedBody.engagementId },
      include: {
        talentProfile: {
          include: { user: true }
        },
        company: true
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Check if user is involved in the engagement
    const isCompanyOwner = engagement.companyId === user.companyId
    const isTalent = engagement.talentProfile.userId === user.id

    if (!isCompanyOwner && !isTalent) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if dispute already exists
    const existingDispute = await prisma.dispute.findFirst({
      where: { engagementId: validatedBody.engagementId }
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
        reason: validatedBody.reason,
        description: validatedBody.description,
        evidence: validatedBody.evidence,
        status: 'open',
        filedBy: user.id,
        filedByType: isCompanyOwner ? 'company' : 'talent'
      },
      include: {
        engagement: {
          include: {
            talentProfile: {
              include: { user: true }
            },
            company: true
          }
        }
      }
    })

    logger.info('Dispute created successfully', {
      disputeId: dispute.id,
      engagementId: validatedBody.engagementId,
      filedBy: user.id
    })

    return NextResponse.json({
      success: true,
      dispute
    })

  } catch (error) {
    logger.error('Failed to create dispute', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

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

// GET /api/admin/disputes - Get disputes (admin only)
export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status
    }

    // Get disputes
    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        engagement: {
          include: {
            talentProfile: {
              include: { user: true }
            },
            company: true
          }
        },
        filedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // Get total count
    const totalCount = await prisma.dispute.count({ where })

    logger.info('Disputes retrieved successfully', {
      adminId: user.id,
      count: disputes.length,
      totalCount
    })

    return NextResponse.json({
      success: true,
      disputes,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    logger.error('Failed to get disputes', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/disputes - Update dispute (admin only)
export async function PUT(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Dispute ID is required' },
        { status: 400 }
      )
    }

    const validatedBody = updateDisputeSchema.parse(updateData)

    // Check if dispute exists
    const existingDispute = await prisma.dispute.findUnique({
      where: { id }
    })

    if (!existingDispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      )
    }

    // Update dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id },
      data: {
        ...validatedBody,
        resolvedBy: validatedBody.status === 'resolved' ? user.id : undefined,
        resolvedAt: validatedBody.status === 'resolved' ? new Date() : undefined
      },
      include: {
        engagement: {
          include: {
            talentProfile: {
              include: { user: true }
            },
            company: true
          }
        },
        filedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    logger.info('Dispute updated successfully', {
      disputeId: id,
      adminId: user.id,
      status: validatedBody.status
    })

    return NextResponse.json({
      success: true,
      dispute: updatedDispute
    })

  } catch (error) {
    logger.error('Failed to update dispute', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

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
