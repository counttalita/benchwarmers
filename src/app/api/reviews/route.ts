import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'

const createReviewSchema = z.object({
  engagementId: z.string(),
  profileId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1).max(1000),
  isPublic: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  const correlationId = `create-review-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId } })

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
    const validatedBody = createReviewSchema.parse(body)
    
    // Verify engagement exists and user participated in it
    const engagement = await prisma.engagement.findUnique({
      where: { id: validatedBody.engagementId },
      include: {
        request: {
          include: { company: true }
        },
        offer: {
          include: { profile: { include: { company: true } } }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Check if user participated in this engagement
    const userParticipated = 
      engagement.request.companyId === companyId || 
      engagement.offer.profile.companyId === companyId

    if (!userParticipated) {
      return NextResponse.json(
        { error: 'You can only review engagements you participated in' },
        { status: 403 }
      )
    }

    // Check if user already reviewed this engagement
    const existingReview = await prisma.review.findFirst({
      where: {
        engagementId: validatedBody.engagementId,
        reviewerCompanyId: companyId
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this engagement' },
        { status: 409 }
      )
    }

    const review = await prisma.review.create({
      data: {
        engagementId: validatedBody.engagementId,
        profileId: validatedBody.profileId,
        reviewerCompanyId: companyId,
        rating: validatedBody.rating,
        comment: validatedBody.comment,
        isPublic: validatedBody.isPublic
      },
      include: {
        engagement: {
          include: {
            request: { include: { company: true } },
            offer: { include: { profile: { include: { company: true } } } }
          }
        },
        profile: {
          include: { company: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      review
    }, { status: 201 })

  } catch (error) {
    logError('Failed to create review', {
      correlationId,
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

export async function GET(request: NextRequest) {
  const correlationId = `list-reviews-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId } })

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const rating = searchParams.get('rating')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const where: any = {
      isPublic: true
    }

    if (profileId) {
      where.profileId = profileId
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.review.count({ where })
    ])

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        profileId,
        rating
      }
    })

  } catch (error) {
    logError('Failed to list reviews', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
