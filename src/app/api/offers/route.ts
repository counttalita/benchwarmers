import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const createOfferSchema = z.object({
  talentRequestId: z.string().min(1),
  talentProfileId: z.string().min(1),
  amount: z.number().min(10, 'Amount must be at least $10'),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  terms: z.string().max(2000, 'Terms must be less than 2000 characters').optional()
})

const listOffersSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
  talentRequestId: z.string().uuid().optional(),
  talentProfileId: z.string().uuid().optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20)
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only companies can create offers
    if (user.role !== 'company') {
      return NextResponse.json({ error: 'Only companies can create offers' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createOfferSchema.parse(body)

    // Verify talent request exists and belongs to user's company
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: validatedData.talentRequestId },
      include: { company: true }
    })

    if (!talentRequest) {
      return NextResponse.json({ error: 'Talent request not found' }, { status: 404 })
    }

    if (talentRequest.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify talent profile exists
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: validatedData.talentProfileId }
    })

    if (!talentProfile) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
    }

    // Check if offer already exists
    const existingOffer = await prisma.offer.findFirst({
      where: {
        talentRequestId: validatedData.talentRequestId,
        talentProfileId: validatedData.talentProfileId,
        status: { in: ['pending', 'accepted'] }
      }
    })

    if (existingOffer) {
      return NextResponse.json({ error: 'Offer already exists for this match' }, { status: 400 })
    }

    // Create the offer
    const offer = await prisma.offer.create({
      data: {
        talentRequestId: validatedData.talentRequestId,
        talentProfileId: validatedData.talentProfileId,
        companyId: user.companyId!,
        amount: validatedData.amount,
        message: validatedData.message,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        terms: validatedData.terms,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      include: {
        talentRequest: true,
        talentProfile: {
          include: {
            user: true
          }
        },
        company: true
      }
    })

    logger.info('Offer created', { offerId: offer.id, companyId: user.companyId })

    return NextResponse.json({
      success: true,
      offer: {
        id: offer.id,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
        talentRequest: {
          id: offer.talentRequest.id,
          title: offer.talentRequest.title
        },
        talentProfile: {
          id: offer.talentProfile.id,
          title: offer.talentProfile.title,
          user: {
            id: offer.talentProfile.user.id,
            name: offer.talentProfile.user.name
          }
        },
        company: {
          id: offer.company.id,
          name: offer.company.name
        }
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error('Failed to create offer', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    
    // Convert string values to appropriate types
    const parsedQuery = {
      ...query,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20
    }

    const validatedQuery = listOffersSchema.parse(parsedQuery)

    // Build where clause based on user role
    const whereClause: any = {}

    if (user.role === 'company') {
      whereClause.companyId = user.companyId
    } else if (user.role === 'talent') {
      whereClause.talentProfile = {
        userId: user.id
      }
    }

    if (validatedQuery.status) {
      whereClause.status = validatedQuery.status
    }

    if (validatedQuery.talentRequestId) {
      whereClause.talentRequestId = validatedQuery.talentRequestId
    }

    if (validatedQuery.talentProfileId) {
      whereClause.talentProfileId = validatedQuery.talentProfileId
    }

    // Get offers with pagination
    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where: whereClause,
        include: {
          talentRequest: {
            select: {
              id: true,
              title: true,
              description: true
            }
          },
          talentProfile: {
            select: {
              id: true,
              title: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit
      }),
      prisma.offer.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(total / validatedQuery.limit)

    return NextResponse.json({
      success: true,
      offers: offers.map(offer => ({
        id: offer.id,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
        talentRequest: offer.talentRequest,
        talentProfile: offer.talentProfile,
        company: offer.company
      })),
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 })
    }

    logger.error('Failed to list offers', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
