import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/offers - Get all offers with filtering
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/offers',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const talentId = searchParams.get('talentId')
    const requestId = searchParams.get('requestId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (talentId) {
      where.talentId = talentId
    }

    if (requestId) {
      where.talentRequestId = requestId
    }

    if (status) {
      where.status = status
    }

    // Get offers with pagination
    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: {
          talent: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              avatar: true,
              rating: true,
              totalReviews: true
            }
          },
          talentRequest: {
            select: {
              id: true,
              title: true,
              description: true,
              budget: true,
              duration: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  domain: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.offer.count({ where })
    ])

    requestLogger.info('Offers retrieved successfully', {
      count: offers.length,
      total,
      page,
      limit,
      filters: { talentId, requestId, status }
    })

    return NextResponse.json({
      offers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve offers', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/offers - Create new offer
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/offers',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      talentId,
      talentRequestId,
      proposedRate,
      proposedDuration,
      message,
      availability
    } = body

    if (!talentId || !talentRequestId || !proposedRate) {
      requestLogger.warn('Missing required fields in offer creation')
      return NextResponse.json(
        { error: 'Talent ID, request ID, and proposed rate are required' },
        { status: 400 }
      )
    }

    // Validate talent exists
    const talent = await prisma.user.findUnique({
      where: { id: talentId }
    })

    if (!talent) {
      requestLogger.warn('Talent not found for offer creation', { talentId })
      return NextResponse.json(
        { error: 'Talent not found' },
        { status: 404 }
      )
    }

    // Validate talent request exists
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: talentRequestId }
    })

    if (!talentRequest) {
      requestLogger.warn('Talent request not found for offer creation', { talentRequestId })
      return NextResponse.json(
        { error: 'Talent request not found' },
        { status: 404 }
      )
    }

    // Check if offer already exists
    const existingOffer = await prisma.offer.findFirst({
      where: {
        talentId,
        talentRequestId
      }
    })

    if (existingOffer) {
      requestLogger.warn('Offer already exists', { talentId, talentRequestId })
      return NextResponse.json(
        { error: 'Offer already exists for this talent and request' },
        { status: 409 }
      )
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        talentId,
        talentRequestId,
        proposedRate,
        proposedDuration,
        message,
        availability,
        status: 'pending'
      },
      include: {
        talent: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            avatar: true,
            rating: true,
            totalReviews: true
          }
        },
        talentRequest: {
          select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            duration: true,
            company: {
              select: {
                id: true,
                name: true,
                domain: true
              }
            }
          }
        }
      }
    })

    requestLogger.info('Offer created successfully', {
      offerId: offer.id,
      talentId,
      talentRequestId
    })

    return NextResponse.json({
      message: 'Offer created successfully',
      offer
    })

  } catch (error) {
    requestLogger.error('Failed to create offer', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
