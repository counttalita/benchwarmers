import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/reviews - Get reviews with filtering
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/reviews',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const talentId = searchParams.get('talentId')
    const companyId = searchParams.get('companyId')
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined
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

    if (rating) {
      where.rating = rating
    }

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          talent: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          },
          engagement: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              rate: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.review.count({ where })
    ])

    requestLogger.info('Reviews retrieved successfully', {
      count: reviews.length,
      total,
      page,
      limit,
      filters: { talentId, companyId, rating }
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve reviews', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Submit a review
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/reviews',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      engagementId,
      reviewerId,
      rating,
      comment,
      categories
    } = body

    if (!engagementId || !reviewerId || !rating || rating < 1 || rating > 5) {
      requestLogger.warn('Invalid review data submitted')
      return NextResponse.json(
        { error: 'Engagement ID, reviewer ID, and valid rating (1-5) are required' },
        { status: 400 }
      )
    }

    // Validate engagement exists and is completed
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        talent: true,
        company: true
      }
    })

    if (!engagement) {
      requestLogger.warn('Engagement not found for review submission', { engagementId })
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    if (engagement.status !== 'completed') {
      requestLogger.warn('Engagement not completed for review', { engagementId, status: engagement.status })
      return NextResponse.json(
        { error: 'Engagement must be completed to submit a review' },
        { status: 400 }
      )
    }

    // Determine if reviewer is talent or company
    const isTalentReview = reviewerId === engagement.talentId
    const isCompanyReview = reviewerId === engagement.companyId

    if (!isTalentReview && !isCompanyReview) {
      requestLogger.warn('Reviewer not associated with engagement', { reviewerId, engagementId })
      return NextResponse.json(
        { error: 'Reviewer must be associated with the engagement' },
        { status: 403 }
      )
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        engagementId,
        reviewerId
      }
    })

    if (existingReview) {
      requestLogger.warn('Review already exists for this engagement and reviewer', { engagementId, reviewerId })
      return NextResponse.json(
        { error: 'Review already exists for this engagement' },
        { status: 409 }
      )
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        engagementId,
        talentId: engagement.talentId,
        companyId: engagement.companyId,
        reviewerId,
        rating,
        comment,
        categories: categories || [],
        isTalentReview
      },
      include: {
        talent: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        engagement: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            rate: true
          }
        }
      }
    })

    // Update user rating statistics
    const userToUpdate = isTalentReview ? engagement.companyId : engagement.talentId
    const userReviews = await prisma.review.findMany({
      where: {
        OR: [
          { talentId: userToUpdate },
          { companyId: userToUpdate }
        ]
      }
    })

    const averageRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length

    await prisma.user.update({
      where: { id: userToUpdate },
      data: {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        totalReviews: userReviews.length
      }
    })

    requestLogger.info('Review submitted successfully', {
      reviewId: review.id,
      engagementId,
      reviewerId,
      rating,
      isTalentReview
    })

    return NextResponse.json({
      message: 'Review submitted successfully',
      review
    })

  } catch (error) {
    requestLogger.error('Failed to submit review', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
