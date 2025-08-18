import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const createEngagementSchema = z.object({
  requestId: z.string().uuid(),
  talentProfileId: z.string().uuid(),
  status: z.enum(['staged', 'interviewing', 'accepted', 'rejected']).optional().default('staged')
})

const listEngagementsSchema = z.object({
  status: z.enum(['staged', 'interviewing', 'accepted', 'rejected', 'active', 'completed', 'terminated', 'disputed']).optional(),
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

    // Verify request exists
    const request_data = await prisma.talentRequest.findUnique({
      where: { id: validatedData.requestId },
      include: {
        seekerCompany: true
      }
    })

    if (!request_data) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Verify talent profile exists
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: validatedData.talentProfileId },
      include: {
        user: true
      }
    })

    if (!talentProfile) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
    }

    // Check if engagement already exists for this request + talent combination
    const existingEngagement = await prisma.engagement.findFirst({
      where: {
        AND: [
          { talentRequestId: validatedData.requestId },
          { talentProfileId: validatedData.talentProfileId }
        ]
      }
    })

    if (existingEngagement) {
      return NextResponse.json({ 
        error: 'Engagement already exists',
        engagement: { id: existingEngagement.id, status: existingEngagement.status }
      }, { status: 400 })
    }

    // Create engagement
    const engagement = await prisma.engagement.create({
      data: {
        talentRequestId: validatedData.requestId,
        talentProfileId: validatedData.talentProfileId,
        status: validatedData.status
      },
      include: {
        talentRequest: {
          include: {
            seekerCompany: true
          }
        },
        talentProfile: {
          include: {
            user: true
          }
        }
      }
    })

    logger.info('Engagement created', { 
      engagementId: engagement.id, 
      status: engagement.status,
      requestId: validatedData.requestId,
      talentProfileId: validatedData.talentProfileId
    })

    return NextResponse.json({
      success: true,
      engagement: {
        id: engagement.id,
        status: engagement.status,
        createdAt: engagement.createdAt,
        updatedAt: engagement.updatedAt,
        talentRequest: {
          id: engagement.talentRequest.id,
          title: engagement.talentRequest.title,
          seekerCompany: {
            id: engagement.talentRequest.seekerCompany.id,
            name: engagement.talentRequest.seekerCompany.name
          }
        },
        talentProfile: {
          id: engagement.talentProfile.id,
          user: {
            id: engagement.talentProfile.user.id,
            name: engagement.talentProfile.user.name
          }
        }
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error('Failed to create engagement', {
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

    const validatedQuery = listEngagementsSchema.parse(parsedQuery)

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
      engagements: engagements.map((engagement: any) => ({
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

    logger.error('Failed to list engagements', {
      correlationId: 'GET_engagements',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
