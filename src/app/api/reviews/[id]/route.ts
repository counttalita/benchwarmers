import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(1).max(1000).optional(),
  category: z.enum(['professional', 'communication', 'quality', 'timeliness']).optional()
})

// GET /api/reviews/[id] - Get a specific review
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestLogger = logger

  try {
    const review = await prisma.review.findUnique({
      where: { id: params.id },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true }
        },
        reviewee: {
          select: { id: true, name: true, email: true }
        },
        engagement: {
          select: { id: true, title: true, status: true }
        }
      }
    })

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    logger.info('Review retrieved successfully', {
      reviewId: params.id
    })

    return NextResponse.json({
      success: true,
      review
    })

  } catch (error) {
    logger.error('Failed to get review', {
      reviewId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/reviews/[id] - Update a review
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id: params.id }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user is the reviewer
    if (existingReview.reviewerId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedBody = updateReviewSchema.parse(body)

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: params.id },
      data: validatedBody,
      include: {
        reviewer: {
          select: { id: true, name: true, email: true }
        },
        reviewee: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    logger.info('Review updated successfully', {
      reviewId: params.id,
      reviewerId: user.id
    })

    return NextResponse.json({
      success: true,
      review: updatedReview
    })

  } catch (error) {
    logger.error('Failed to update review', {
      reviewId: params.id,
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

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id: params.id }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user is the reviewer or an admin
    if (existingReview.reviewerId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete review
    await prisma.review.delete({
      where: { id: params.id }
    })

    logger.info('Review deleted successfully', {
      reviewId: params.id,
      deletedBy: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })

  } catch (error) {
    logger.error('Failed to delete review', {
      reviewId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
