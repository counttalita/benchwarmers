import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError, logInfo } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = `get-profile-reviews-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    const resolvedParams = await params
    logInfo('Getting profile reviews', { correlationId, profileId: resolvedParams.id })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Verify profile exists
    const profile = await prisma.talentProfile.findUnique({
      where: { id: resolvedParams.id },
      include: { company: true }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get reviews for this profile
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          profileId: resolvedParams.id,
          isPublic: true
        },
        include: {
          engagement: {
            include: {
              request: { include: { company: true } },
              offer: { include: { profile: { include: { company: true } } } }
            }
          },
          reviewer: {
            include: { company: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.review.count({
        where: {
          profileId: resolvedParams.id,
          isPublic: true
        }
      })
    ])

    // Calculate profile statistics
    const stats = await prisma.review.aggregate({
      where: {
        profileId: resolvedParams.id,
        isPublic: true
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      },
      _min: {
        rating: true
      },
      _max: {
        rating: true
      }
    })

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        profileId: resolvedParams.id,
        isPublic: true
      },
      _count: {
        rating: true
      }
    })

    const profileStats = {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.rating || 0,
      minRating: stats._min.rating || 0,
      maxRating: stats._max.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc: any, item: any) => {
        acc[item.rating] = item._count.rating
        return acc
      }, {} as Record<number, number>)
    }

    return NextResponse.json({
      success: true,
      reviews,
      profileStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    const resolvedParams = await params
    logError('Failed to get profile reviews', {
      correlationId,
      profileId: resolvedParams.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
