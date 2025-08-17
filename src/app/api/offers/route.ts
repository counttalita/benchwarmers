import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const createOfferSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  rate: z.number().positive('Rate must be positive'),
  currency: z.string().default('USD'),
  startDate: z.string().transform(str => new Date(str)),
  durationWeeks: z.number().positive('Duration must be positive'),
  terms: z.string().optional(),
  totalAmount: z.number().positive('Total amount must be positive'),
  platformFee: z.number().min(0, 'Platform fee cannot be negative'),
  providerAmount: z.number().positive('Provider amount must be positive')
})

// GET /api/offers - Get all offers with filtering
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    const seekerCompanyId = searchParams.get('seekerCompanyId')
    const providerCompanyId = searchParams.get('providerCompanyId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (matchId) {
      where.matchId = matchId
    }

    if (seekerCompanyId) {
      where.seekerCompanyId = seekerCompanyId
    }

    if (providerCompanyId) {
      where.providerCompanyId = providerCompanyId
    }

    if (status) {
      where.status = status
    }

    // Get offers with pagination
    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: {
          match: {
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  title: true,
                  rating: true,
                  reviewCount: true,
                  location: true
                }
              },
              request: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  budgetMin: true,
                  budgetMax: true,
                  durationWeeks: true
                }
              }
            }
          },
          seekerCompany: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          },
          providerCompany: {
            select: {
              id: true,
              name: true,
              domain: true
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

    logInfo('Offers retrieved successfully', {
      correlationId,
      count: offers.length,
      total,
      page,
      limit,
      filters: { matchId, seekerCompanyId, providerCompanyId, status }
    })

    return NextResponse.json({
      success: true,
      data: offers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_offers' })
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve offers', 
        correlationId 
      },
      { status: 500 }
    )
  }
}

// POST /api/offers - Create new offer
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Creating new offer', {
      correlationId,
      requestBody: body
    })

    // Validate request data
    const validatedData = createOfferSchema.parse(body)

    // Validate match exists and get related data
    const match = await prisma.match.findUnique({
      where: { id: validatedData.matchId },
      include: {
        profile: {
          select: {
            id: true,
            companyId: true,
            name: true
          }
        },
        request: {
          select: {
            id: true,
            companyId: true,
            title: true,
            budgetMin: true,
            budgetMax: true
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Match not found',
          correlationId 
        },
        { status: 404 }
      )
    }

    // Check if offer already exists for this match
    const existingOffer = await prisma.offer.findFirst({
      where: {
        matchId: validatedData.matchId
      }
    })

    if (existingOffer) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Offer already exists for this match',
          correlationId 
        },
        { status: 409 }
      )
    }

    // Calculate platform fee (15% as per requirements)
    const platformFeeRate = 0.15
    const calculatedPlatformFee = validatedData.totalAmount * platformFeeRate
    const calculatedProviderAmount = validatedData.totalAmount - calculatedPlatformFee

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        matchId: validatedData.matchId,
        seekerCompanyId: match.request.companyId,
        providerCompanyId: match.profile.companyId,
        rate: validatedData.rate,
        currency: validatedData.currency,
        startDate: validatedData.startDate,
        durationWeeks: validatedData.durationWeeks,
        terms: validatedData.terms,
        totalAmount: validatedData.totalAmount,
        platformFee: calculatedPlatformFee,
        providerAmount: calculatedProviderAmount,
        status: 'pending'
      },
      include: {
        match: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
                title: true,
                rating: true,
                reviewCount: true
              }
            },
            request: {
              select: {
                id: true,
                title: true,
                description: true,
                budgetMin: true,
                budgetMax: true
              }
            }
          }
        },
        seekerCompany: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        providerCompany: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    })

    logInfo('Offer created successfully', {
      correlationId,
      offerId: offer.id,
      matchId: validatedData.matchId,
      totalAmount: validatedData.totalAmount,
      platformFee: calculatedPlatformFee
    })

    return NextResponse.json({
      success: true,
      data: offer,
      message: 'Offer created successfully',
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'OFFER_VALIDATION_ERROR',
        'Validation error creating offer',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'create_offer' })
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create offer',
        correlationId 
      },
      { status: 500 }
    )
  }
}
