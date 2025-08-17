import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/reviews/profile - Get reviews for a specific profile
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/reviews/profile',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!profileId) {
      requestLogger.warn('Missing profileId in reviews request')
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { talentProfileId: profileId },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              company: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({
        where: { talentProfileId: profileId }
      })
    ])

    const averageRating = await prisma.review.aggregate({
      where: { talentProfileId: profileId },
      _avg: { rating: true }
    })

    requestLogger.info('Profile reviews retrieved successfully', {
      profileId,
      count: reviews.length,
      total,
      averageRating: averageRating._avg.rating
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: {
        averageRating: averageRating._avg.rating || 0,
        totalReviews: total
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve profile reviews', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
