import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const createEngagementSchema = z.object({
  offerId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  milestones: z.array(z.object({
    title: z.string().min(1, 'Milestone title is required'),
    description: z.string().optional(),
    dueDate: z.string().datetime(),
    amount: z.number().min(1, 'Milestone amount must be at least $1')
  })).optional()
})

const listEngagementsSchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled', 'disputed']).optional(),
  companyId: z.string().uuid().optional(),
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

    const body = await request.json()
    const validatedData = createEngagementSchema.parse(body)

    // Verify offer exists and is accepted
    const offer = await prisma.offer.findUnique({
      where: { id: validatedData.offerId },
      include: {
        talentRequest: {
          include: {
            company: true
          }
        },
        talentProfile: {
          include: {
            user: true
          }
        },
        company: true
      }
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.status !== 'accepted') {
      return NextResponse.json({ error: 'Offer must be accepted to create engagement' }, { status: 400 })
    }

    // Verify user belongs to the company that created the offer
    if (user.role !== 'admin' && (user.role !== 'company' || offer.companyId !== user.companyId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if engagement already exists for this offer
    const existingEngagement = await prisma.engagement.findFirst({
      where: { offerId: validatedData.offerId }
    })

    if (existingEngagement) {
      return NextResponse.json({ error: 'Engagement already exists for this offer' }, { status: 400 })
    }

    // Create engagement
    const engagement = await prisma.engagement.create({
      data: {
        offerId: validatedData.offerId,
        companyId: offer.companyId,
        talentProfileId: offer.talentProfileId,
        talentRequestId: offer.talentRequestId,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: 'active',
        totalAmount: offer.amount,
        platformFee: offer.amount * 0.15, // 15% platform fee
        providerAmount: offer.amount * 0.85 // 85% to provider
      },
      include: {
        offer: {
          include: {
            talentRequest: true,
            talentProfile: {
              include: {
                user: true
              }
            },
            company: true
          }
        }
      }
    })

    // Create milestones if provided
    if (validatedData.milestones && validatedData.milestones.length > 0) {
      const milestones = await Promise.all(
        validatedData.milestones.map(milestone =>
          prisma.milestone.create({
            data: {
              engagementId: engagement.id,
              title: milestone.title,
              description: milestone.description,
              dueDate: new Date(milestone.dueDate),
              amount: milestone.amount,
              status: 'pending'
            }
          })
        )
      )

      logger.info('Engagement created with milestones', { 
        engagementId: engagement.id, 
        milestoneCount: milestones.length 
      })
    }

    logger.info('Engagement created', { engagementId: engagement.id, companyId: user.companyId })

    return NextResponse.json({
      success: true,
      engagement: {
        id: engagement.id,
        status: engagement.status,
        startDate: engagement.startDate,
        endDate: engagement.endDate,
        totalAmount: engagement.totalAmount,
        platformFee: engagement.platformFee,
        providerAmount: engagement.providerAmount,
        createdAt: engagement.createdAt,
        offer: {
          id: engagement.offer.id,
          amount: engagement.offer.amount,
          message: engagement.offer.message,
          talentRequest: {
            id: engagement.offer.talentRequest.id,
            title: engagement.offer.talentRequest.title
          },
          talentProfile: {
            id: engagement.offer.talentProfile.id,
            title: engagement.offer.talentProfile.title,
            user: {
              id: engagement.offer.talentProfile.user.id,
              name: engagement.offer.talentProfile.user.name
            }
          },
          company: {
            id: engagement.offer.company.id,
            name: engagement.offer.company.name
          }
        }
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to create engagement')
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

    const validatedQuery = listEngagementsSchema.parse(parsedQuery)

    // Build where clause based on user role
    let whereClause: any = {}

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

    if (validatedQuery.companyId) {
      whereClause.companyId = validatedQuery.companyId
    }

    if (validatedQuery.talentProfileId) {
      whereClause.talentProfileId = validatedQuery.talentProfileId
    }

    // Get engagements with pagination
    const [engagements, total] = await Promise.all([
      prisma.engagement.findMany({
        where: whereClause,
        include: {
          offer: {
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
            }
          },
          milestones: {
            select: {
              id: true,
              title: true,
              status: true,
              amount: true,
              dueDate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit
      }),
      prisma.engagement.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(total / validatedQuery.limit)

    return NextResponse.json({
      success: true,
      engagements: engagements.map(engagement => ({
        id: engagement.id,
        status: engagement.status,
        startDate: engagement.startDate,
        endDate: engagement.endDate,
        totalAmount: engagement.totalAmount,
        platformFee: engagement.platformFee,
        providerAmount: engagement.providerAmount,
        createdAt: engagement.createdAt,
        updatedAt: engagement.updatedAt,
        offer: engagement.offer,
        milestones: engagement.milestones
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

    logger.error(error as Error, 'Failed to list engagements')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
