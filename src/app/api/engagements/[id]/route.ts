import { v4 as uuidv4 } from 'uuid'
import { NextRequest, NextResponse } from 'next/server'
const resolvedParams = await params
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const updateEngagementSchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled', 'disputed']).optional(),
  endDate: z.string().datetime().optional(),
  totalHours: z.number().min(0).optional(),
  completionNotes: z.string().max(1000).optional(),
  timeEntries: z.array(z.object({
    date: z.string().datetime(),
    hours: z.number().min(0.1).max(24),
    description: z.string().max(500)
  })).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = uuidv4()

  try {
    const resolvedParams = await params
    const engagementId = resolvedParams.id
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = resolvedParams

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid engagement ID' }, { status: 400 })
    }

    // Get engagement with related data
    const engagement = await prisma.engagement.findUnique({
      where: { id },
      include: {
        offer: {
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
        },
        milestones: {
          orderBy: { dueDate: 'asc' }
        },
        timeEntries: {
          orderBy: { date: 'desc' }
        },
        reviews: {
          include: {
            user: true
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Check if user has access to this engagement
    const hasAccess = 
      user.role === 'admin' ||
      (user.role === 'company' && engagement.companyId === user.companyId) ||
      (user.role === 'talent' && engagement.talentProfileId === engagement.offer.talentProfileId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

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
        totalHours: engagement.totalHours,
        completionNotes: engagement.completionNotes,
        createdAt: engagement.createdAt,
        updatedAt: engagement.updatedAt,
        offer: {
          id: engagement.offer.id,
          amount: engagement.offer.amount,
          message: engagement.offer.message,
          status: engagement.offer.status,
          talentRequest: {
            id: engagement.offer.talentRequest.id,
            title: engagement.offer.talentRequest.title,
            description: engagement.offer.talentRequest.description,
            company: {
              id: engagement.offer.talentRequest.company.id,
              name: engagement.offer.talentRequest.company.name
            }
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
        },
        milestones: engagement.milestones,
        timeEntries: engagement.timeEntries,
        reviews: engagement.reviews
      }
    })

  } catch (error) {
    logger.error(error as Error, 'Failed to get engagement')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid engagement ID' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateEngagementSchema.parse(body)

    // Get the engagement
    const engagement = await prisma.engagement.findUnique({
      where: { id },
      include: {
        offer: true
      }
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Check if user can update this engagement
    const canUpdate = 
      user.role === 'admin' ||
      (user.role === 'company' && engagement.companyId === user.companyId) ||
      (user.role === 'talent' && engagement.talentProfileId === engagement.offer.talentProfileId)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.endDate !== undefined) updateData.endDate = new Date(validatedData.endDate)
    if (validatedData.totalHours !== undefined) updateData.totalHours = validatedData.totalHours
    if (validatedData.completionNotes !== undefined) updateData.completionNotes = validatedData.completionNotes

    // Update the engagement
    const updatedEngagement = await prisma.engagement.update({
      where: { id },
      data: updateData,
      include: {
        offer: {
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
        },
        milestones: {
          orderBy: { dueDate: 'asc' }
        },
        timeEntries: {
          orderBy: { date: 'desc' }
        }
      }
    })

    // Add time entries if provided
    if (validatedData.timeEntries && validatedData.timeEntries.length > 0) {
      await Promise.all(
        validatedData.timeEntries.map(timeEntry =>
          prisma.timeEntry.create({
            data: {
              engagementId: id,
              date: new Date(timeEntry.date),
              hours: timeEntry.hours,
              description: timeEntry.description,
              userId: user.id
            }
          })
        )
      )
    }

    logger.info('Engagement updated', { engagementId: id, userId: user.id })

    return NextResponse.json({
      success: true,
      engagement: {
        id: updatedEngagement.id,
        status: updatedEngagement.status,
        startDate: updatedEngagement.startDate,
        endDate: updatedEngagement.endDate,
        totalAmount: updatedEngagement.totalAmount,
        platformFee: updatedEngagement.platformFee,
        providerAmount: updatedEngagement.providerAmount,
        totalHours: updatedEngagement.totalHours,
        completionNotes: updatedEngagement.completionNotes,
        createdAt: updatedEngagement.createdAt,
        updatedAt: updatedEngagement.updatedAt,
        offer: updatedEngagement.offer,
        milestones: updatedEngagement.milestones,
        timeEntries: updatedEngagement.timeEntries
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to update engagement')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid engagement ID' }, { status: 400 })
    }

    // Get the engagement
    const engagement = await prisma.engagement.findUnique({
      where: { id }
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Only admins can delete engagements
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow deletion if engagement is not completed
    if (engagement.status === 'completed') {
      return NextResponse.json({ error: 'Cannot delete completed engagement' }, { status: 400 })
    }

    // Delete the engagement (this will cascade to related records)
    await prisma.engagement.delete({
      where: { id }
    })

    logger.info('Engagement deleted', { engagementId: id, userId: user.id })

    return NextResponse.json({ success: true }, { status: 204 })

  } catch (error) {
    logger.error(error as Error, 'Failed to delete engagement')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
