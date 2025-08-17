import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// GET /api/engagements - Get engagements with filtering
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const talentId = searchParams.get('talentId')
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (talentId) {
      where.offer = {
        match: {
          profileId: talentId
        }
      }
    }

    if (companyId) {
      where.offer = {
        ...where.offer,
        OR: [
          { seekerCompanyId: companyId },
          { providerCompanyId: companyId }
        ]
      }
    }

    if (status) {
      where.status = status
    }

    // Get engagements with pagination
    const [engagements, total] = await Promise.all([
      prisma.engagement.findMany({
        where,
        include: {
          offer: {
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
              },
              payments: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  createdAt: true
                },
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.engagement.count({ where })
    ])

    logInfo('Engagements retrieved successfully', {
      correlationId,
      count: engagements.length,
      total,
      page,
      limit,
      filters: { talentId, companyId, status }
    })

    return NextResponse.json({
      success: true,
      data: engagements,
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
    logError(appError, { correlationId, operation: 'get_engagements' })
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve engagements',
        correlationId 
      },
      { status: 500 }
    )
  }
}

// Validation schemas
const updateEngagementSchema = z.object({
  action: z.enum(['complete', 'terminate', 'dispute']),
  totalHours: z.number().positive().optional(),
  completionNotes: z.string().optional(),
  disputeReason: z.string().optional()
})

// POST /api/engagements - Update engagement status
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Updating engagement status', {
      correlationId,
      requestBody: body
    })

    // Validate request data
    const validatedData = updateEngagementSchema.parse(body)
    const { engagementId } = body

    if (!engagementId) {
      return NextResponse.json({
        success: false,
        error: 'Engagement ID is required',
        correlationId
      }, { status: 400 })
    }

    // Validate engagement exists
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        offer: {
          include: {
            match: {
              include: {
                profile: true,
                request: true
              }
            }
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json({
        success: false,
        error: 'Engagement not found',
        correlationId
      }, { status: 404 })
    }

    let updatedEngagement

    switch (validatedData.action) {
      case 'complete':
        if (engagement.status !== 'active') {
          return NextResponse.json({
            success: false,
            error: 'Engagement must be active to complete',
            correlationId
          }, { status: 400 })
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'completed',
            endDate: new Date(),
            totalHours: validatedData.totalHours,
            completionVerified: false,
            updatedAt: new Date()
          },
          include: {
            offer: {
              include: {
                match: {
                  include: {
                    profile: true,
                    request: true
                  }
                }
              }
            }
          }
        })

        // TODO: Trigger payment release process
        // await initiatePaymentRelease(updatedEngagement)

        logInfo('Engagement completed', {
          correlationId,
          engagementId,
          totalHours: validatedData.totalHours
        })
        break

      case 'terminate':
        if (!['active'].includes(engagement.status)) {
          return NextResponse.json({
            success: false,
            error: 'Engagement cannot be terminated in current status',
            correlationId
          }, { status: 400 })
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'terminated',
            endDate: new Date(),
            updatedAt: new Date()
          },
          include: {
            offer: {
              include: {
                match: {
                  include: {
                    profile: true,
                    request: true
                  }
                }
              }
            }
          }
        })

        logInfo('Engagement terminated', {
          correlationId,
          engagementId
        })
        break

      case 'dispute':
        if (!['active', 'completed'].includes(engagement.status)) {
          return NextResponse.json({
            success: false,
            error: 'Engagement cannot be disputed in current status',
            correlationId
          }, { status: 400 })
        }

        updatedEngagement = await prisma.engagement.update({
          where: { id: engagementId },
          data: {
            status: 'disputed',
            updatedAt: new Date()
          },
          include: {
            offer: {
              include: {
                match: {
                  include: {
                    profile: true,
                    request: true
                  }
                }
              }
            }
          }
        })

        // TODO: Trigger dispute resolution process
        // await initiateDisputeResolution(updatedEngagement, validatedData.disputeReason)

        logInfo('Engagement disputed', {
          correlationId,
          engagementId,
          reason: validatedData.disputeReason
        })
        break
    }

    return NextResponse.json({
      success: true,
      data: updatedEngagement,
      message: `Engagement ${validatedData.action}d successfully`,
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'ENGAGEMENT_UPDATE_VALIDATION_ERROR',
        'Validation error updating engagement',
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
    logError(appError, { correlationId, operation: 'update_engagement' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update engagement',
      correlationId
    }, { status: 500 })
  }
}
