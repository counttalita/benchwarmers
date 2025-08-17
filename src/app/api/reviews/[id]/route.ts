import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(1).max(1000).optional(),
  isPublic: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `get-review-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId, reviewId: params.id } })

    const review = await prisma.review.findUnique({
      where: { id: params.id },
      include: {
        engagement: {
          include: {
            request: { include: { company: true } },
            offer: { include: { profile: { include: { company: true } } } }
          }
        },
        profile: {
          include: { company: true }
        },
        reviewer: {
          include: { company: true }
        }
      }
    })

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      review
    })

  } catch (error) {
    logError('Failed to get review', {
      correlationId,
      reviewId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `update-review-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId, reviewId: params.id } })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedBody = updateReviewSchema.parse(body)
    
    // Get the existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: params.id },
      include: { engagement: true }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user can update this review
    if (existingReview.reviewerCompanyId !== companyId) {
      return NextResponse.json(
        { error: 'You can only update your own reviews' },
        { status: 403 }
      )
    }

    // Check if review is older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    if (existingReview.createdAt < sevenDaysAgo) {
      return NextResponse.json(
        { error: 'Reviews can only be updated within 7 days of creation' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedBody.rating) updateData.rating = validatedBody.rating
    if (validatedBody.comment) updateData.comment = validatedBody.comment
    if (validatedBody.isPublic !== undefined) updateData.isPublic = validatedBody.isPublic

    const updatedReview = await prisma.review.update({
      where: { id: params.id },
      data: updateData,
      include: {
        engagement: {
          include: {
            request: { include: { company: true } },
            offer: { include: { profile: { include: { company: true } } } }
          }
        },
        profile: {
          include: { company: true }
        },
        reviewer: {
          include: { company: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      review: updatedReview
    })

  } catch (error) {
    logError('Failed to update review', {
      correlationId,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `delete-review-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId, reviewId: params.id } })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    const isAdmin = request.headers.get('x-is-admin') === 'true'
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Get the existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: params.id }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user can delete this review
    if (!isAdmin && existingReview.reviewerCompanyId !== companyId) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      )
    }

    // Soft delete by setting isPublic to false
    const deletedReview = await prisma.review.update({
      where: { id: params.id },
      data: { isPublic: false }
    })

    return NextResponse.json({
      success: true,
      message: isAdmin ? 'Review removed by admin' : 'Review deleted successfully'
    })

  } catch (error) {
    logError('Failed to delete review', {
      correlationId,
      reviewId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
