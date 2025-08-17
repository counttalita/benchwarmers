import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { engagementId, rating, review, reviewerId } = body

    // Validate required fields
    if (!engagementId || !rating || !review || !reviewerId) {
      return NextResponse.json(
        { error: 'Missing required fields: engagementId, rating, review, reviewerId' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if engagement exists and is completed
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: { participants: true }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    if (engagement.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed engagements' },
        { status: 400 }
      )
    }

    // Check if user participated in the engagement
    const isParticipant = engagement.participants.some(p => p.userId === reviewerId)
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You can only review engagements you participated in' },
        { status: 403 }
      )
    }

    // Check for duplicate reviews
    const existingReview = await prisma.review.findFirst({
      where: {
        engagementId,
        reviewerId
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this engagement' },
        { status: 409 }
      )
    }

    // Create the review
    const newReview = await prisma.review.create({
      data: {
        engagementId,
        rating,
        review,
        reviewerId,
        status: 'active'
      }
    })

    logger.info('Review created successfully', { reviewId: newReview.id, engagementId })

    return NextResponse.json(
      { 
        success: true, 
        review: newReview,
        message: 'Review created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    logger.error('Failed to create review', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/reviews - List reviews with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const rating = searchParams.get('rating')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {
      status: 'active'
    }

    if (profileId) {
      where.engagement = {
        participants: {
          some: {
            user: {
              talentProfile: {
                id: profileId
              }
            }
          }
        }
      }
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          engagement: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.review.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    logger.error('Failed to list reviews', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
