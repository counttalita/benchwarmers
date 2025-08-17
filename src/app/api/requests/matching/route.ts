import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/requests/matching - Get matching talents for a request
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/requests/matching',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!requestId) {
      requestLogger.warn('Missing requestId in matching request')
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Get the talent request
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: requestId },
      include: {
        company: {
          select: {
            name: true,
            domain: true
          }
        }
      }
    })

    if (!talentRequest) {
      requestLogger.warn('Talent request not found', { requestId })
      return NextResponse.json(
        { error: 'Talent request not found' },
        { status: 404 }
      )
    }

    // Find matching talent profiles
    const matchingProfiles = await prisma.talentProfile.findMany({
      where: {
        skills: {
          hasSome: talentRequest.requiredSkills
        },
        rateMin: {
          lte: talentRequest.budget
        },
        rateMax: {
          gte: talentRequest.budget * 0.8 // Allow some flexibility
        },
        isAvailable: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rating: true,
            totalReviews: true
          }
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            rating: true,
            comment: true,
            createdAt: true
          }
        }
      },
      take: limit,
      orderBy: [
        { rating: 'desc' },
        { totalReviews: 'desc' }
      ]
    })

    requestLogger.info('Matching profiles found', {
      requestId,
      count: matchingProfiles.length,
      requiredSkills: talentRequest.requiredSkills,
      budget: talentRequest.budget
    })

    return NextResponse.json({
      request: talentRequest,
      matches: matchingProfiles,
      totalMatches: matchingProfiles.length
    })

  } catch (error) {
    requestLogger.error('Failed to find matching profiles', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
