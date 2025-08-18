import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createReviewSchema = z.object({
  revieweeId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1).max(1000),
  category: z.enum(['professional', 'communication', 'quality', 'timeliness']),
  engagementId: z.string().optional()
})

// POST /api/reviews/profile - Create a new review
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
    const validatedBody = createReviewSchema.parse(body)

    // Check if reviewee exists
    const reviewee = await prisma.user.findUnique({
      where: { id: validatedBody.revieweeId }
    })

    if (!reviewee) {
      return NextResponse.json(
        { error: 'Reviewee not found' },
        { status: 404 }
      )
    }

    // Check if user is reviewing themselves
    if (user.id === validatedBody.revieweeId) {
      return NextResponse.json(
        { error: 'Cannot review yourself' },
        { status: 400 }
      )
    }

    // Check if engagement exists if provided
    if (validatedBody.engagementId) {
      const engagement = await prisma.engagement.findUnique({
        where: { id: validatedBody.engagementId }
      })

      if (!engagement) {
        return NextResponse.json(
          { error: 'Engagement not found' },
          { status: 404 }
        )
      }
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        reviewerId: user.id,
        revieweeId: validatedBody.revieweeId,
        rating: validatedBody.rating,
        comment: validatedBody.comment,
        category: validatedBody.category,
        engagementId: validatedBody.engagementId
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true }
        },
        reviewee: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    logger.info('Review created successfully', {
      reviewerId: user.id,
      revieweeId: validatedBody.revieweeId,
      rating: validatedBody.rating
    })

    return NextResponse.json({
      success: true,
      review
    })

  } catch (error) {
    logger.error('Failed to create review', {
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

// GET /api/reviews/profile - Get reviews for a user
export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Build where clause
    const where: any = { revieweeId: userId }
    if (category) {
      where.category = category
    }

    // Get reviews
    const reviews = await prisma.review.findMany({
      where,
      include: {
        reviewer: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // Get total count
    const totalCount = await prisma.review.count({ where })

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true }
    })

    logger.info('Reviews retrieved successfully', {
      userId,
      count: reviews.length,
      totalCount
    })

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      stats: {
        averageRating: avgRating._avg.rating || 0,
        totalReviews: totalCount
      }
    })

  } catch (error) {
    logger.error('Failed to get reviews', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
