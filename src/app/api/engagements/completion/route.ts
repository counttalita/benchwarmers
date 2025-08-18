import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const completeEngagementSchema = z.object({
  engagementId: z.string().min(1),
  completionNotes: z.string().max(1000).optional(),
  deliverables: z.array(z.string()).optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().max(1000).optional()
})

// POST /api/engagements/completion - Mark engagement as completed
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
    const validatedBody = completeEngagementSchema.parse(body)

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

    // Check if user is authorized (company owner or talent)
    const isCompanyOwner = engagement.companyId === user.companyId
    const isTalent = engagement.talentProfile.userId === user.id

    if (!isCompanyOwner && !isTalent) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if engagement is active
    if (engagement.status !== 'active') {
      return NextResponse.json(
        { error: 'Engagement is not active' },
        { status: 400 }
      )
    }

    // Update engagement status
    const updatedEngagement = await prisma.engagement.update({
      where: { id: validatedBody.engagementId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: validatedBody.completionNotes,
        deliverables: validatedBody.deliverables
      },
      include: {
        talentProfile: {
          include: { user: true }
        },
        company: true
      }
    })

    // Create review if rating and feedback provided
    if (validatedBody.rating && validatedBody.feedback) {
      const reviewerId = isCompanyOwner ? user.id : user.id
      const revieweeId = isCompanyOwner ? engagement.talentProfile.userId : engagement.company.userId

      await prisma.review.create({
        data: {
          reviewerId,
          revieweeId,
          rating: validatedBody.rating,
          comment: validatedBody.feedback,
          category: 'professional',
          engagementId: validatedBody.engagementId
        }
      })
    }

    logger.info('Engagement completed successfully', {
      engagementId: validatedBody.engagementId,
      userId: user.id,
      isCompanyOwner
    })

    return NextResponse.json({
      success: true,
      engagement: updatedEngagement,
      reviewCreated: !!(validatedBody.rating && validatedBody.feedback)
    })

  } catch (error) {
    logger.error('Failed to complete engagement', {
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

// GET /api/engagements/completion - Get completion status
export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    const { searchParams } = new URL(request.url)
    const engagementId = searchParams.get('engagementId')

    if (!engagementId) {
      return NextResponse.json(
        { error: 'Engagement ID is required' },
        { status: 400 }
      )
    }

    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get engagement
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        talentProfile: {
          include: { user: true }
        },
        company: true,
        reviews: {
          where: { engagementId },
          include: {
            reviewer: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Check if user is authorized
    const isCompanyOwner = engagement.companyId === user.companyId
    const isTalent = engagement.talentProfile.userId === user.id

    if (!isCompanyOwner && !isTalent) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    logger.info('Engagement completion status retrieved', {
      engagementId,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      engagement,
      canComplete: engagement.status === 'active',
      hasReview: engagement.reviews.length > 0
    })

  } catch (error) {
    logger.error('Failed to get engagement completion status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
