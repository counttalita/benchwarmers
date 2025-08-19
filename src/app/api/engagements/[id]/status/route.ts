import { v4 as uuidv4 } from 'uuid'
import { v4 as uuidv4 } from 'uuid'
import { NextRequest, NextResponse } from 'next/server'
const resolvedParams = await params
import { prisma } from '@/lib/prisma'
import { engagementNotifications } from '@/lib/notifications/engagement-notifications'
import { logInfo, logError } from '@/lib/logger'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['staged', 'interviewing', 'accepted', 'rejected', 'active', 'completed', 'terminated', 'disputed']),
  notes: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const engagementId = resolvedParams.id
    const body = await request.json()
    const { status, notes } = updateStatusSchema.parse(body)

    // Get current engagement
    const currentEngagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      select: { status: true }
    })

    if (!currentEngagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    const oldStatus = currentEngagement.status

    // Update engagement status
    const updatedEngagement = await prisma.engagement.update({
      where: { id: engagementId },
      data: {
        status,
        updatedAt: new Date(),
        ...(notes && { notes })
      },
      include: {
        offer: {
          include: {
            request: {
              include: {
                seekerCompany: true
              }
            },
            providerCompany: true,
            talentProfile: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    // Log status change
    logInfo('Engagement status updated', {
      engagementId,
      oldStatus,
      newStatus: status,
      seekerCompany: updatedEngagement.offer.request.seekerCompany.name,
      provider: updatedEngagement.offer.talentProfile.user.name
    })

    // Send notifications if status changed to "accepted"
    if (status === 'accepted' && oldStatus !== 'accepted') {
      try {
        await engagementNotifications.notifyStatusChange({
          engagementId,
          oldStatus,
          newStatus: status,
          changedBy: 'system' // TODO: Get actual user ID from auth
        })
      } catch (notificationError) {
        logError('Failed to send engagement notifications', {
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          engagementId
        })
        // Don't fail the status update if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      engagement: {
        id: updatedEngagement.id,
        status: updatedEngagement.status,
        updatedAt: updatedEngagement.updatedAt,
        offer: {
          request: {
            title: updatedEngagement.offer.request.title,
            seekerCompany: updatedEngagement.offer.request.seekerCompany.name
          },
          talentProfile: {
            user: {
              name: updatedEngagement.offer.talentProfile.user.name
            }
          }
        }
      }
    })

  } catch (error) {
    logError('Failed to update engagement status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      engagementId: resolvedParams.id
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update engagement status' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const engagement = await prisma.engagement.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        offer: {
          select: {
            request: {
              select: {
                title: true,
                description: true,
                seekerCompany: {
                  select: {
                    name: true,
                    domain: true
                  }
                }
              }
            },
            providerCompany: {
              select: {
                name: true,
                domain: true
              }
            },
            talentProfile: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ engagement })

  } catch (error) {
    logError('Failed to get engagement status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      engagementId: resolvedParams.id
    })

    return NextResponse.json(
      { error: 'Failed to get engagement status' },
      { status: 500 }
    )
  }
}
