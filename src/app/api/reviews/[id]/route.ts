import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// PUT /api/reviews/[id] - Update a review
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id
    const body = await request.json()
    const { rating, review, userId, isAdmin = false } = body

    // Validate required fields
    if (!rating || !review || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: rating, review, userId' },
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

    // Get the existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        engagement: true
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!isAdmin && existingReview.reviewerId !== userId) {
      return NextResponse.json(
        { error: 'You can only update your own reviews' },
        { status: 403 }
      )
    }

    // Check if review is older than 7 days (unless admin)
    const reviewAge = Date.now() - existingReview.createdAt.getTime()
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000

    if (!isAdmin && reviewAge > sevenDaysInMs) {
      return NextResponse.json(
        { error: 'Reviews can only be updated within 7 days of creation' },
        { status: 400 }
      )
    }

    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating,
        review,
        updatedAt: new Date()
      },
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
      }
    })

    logger.info('Review updated successfully', { 
      reviewId, 
      userId, 
      isAdmin,
      oldRating: existingReview.rating,
      newRating: rating
    })

    return NextResponse.json({
      success: true,
      review: updatedReview,
      message: 'Review updated successfully'
    })

  } catch (error) {
    logger.error('Failed to update review', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
