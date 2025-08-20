import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { engagementNotifications } from '@/lib/notifications/engagement-notifications'
import { notificationService } from '@/lib/notifications/notification-service'
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
    const resolvedParams = await params
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
        updatedAt: new Date()
      },
      include: {
        offer: {
          include: {
            talent: {
              include: {
                user: true
              }
            }
          }
        },
        talentRequest: true,
        seekerCompany: true,
        providerCompany: true
      }
    })

    // Log status change
    logInfo('Engagement status updated', {
      engagementId,
      oldStatus,
      newStatus: status,
      seekerCompany: updatedEngagement.seekerCompany.name,
      provider: updatedEngagement.offer.talent.user.name
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

        // Send invoicing notifications for accepted engagements
        await sendAcceptedEngagementNotifications(updatedEngagement)
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
        title: updatedEngagement.title,
        seekerCompany: updatedEngagement.seekerCompany.name,
        providerCompany: updatedEngagement.providerCompany.name,
        talent: {
          user: {
            name: updatedEngagement.offer.talent.user.name
          }
        }
      }
    })

  } catch (error) {
    const resolvedParams = await params
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

/**
 * Send invoicing notifications when engagement is accepted
 */
async function sendAcceptedEngagementNotifications(engagement: any) {
  try {
    const { offer, talentRequest, seekerCompany, providerCompany } = engagement
    const { talent } = offer
    
    // Calculate payment amounts
    const totalAmount = engagement.totalAmount || 0
    const platformFee = totalAmount * 0.05 // 5% facilitation fee
    const providerAmount = totalAmount - platformFee

    // Notification data for manual invoicing process
    const notificationData = {
      engagementId: engagement.id,
      totalAmount,
      platformFee,
      providerAmount,
      engagementTitle: talentRequest?.title || engagement.title || 'Accepted Engagement',
      talentName: talent?.user?.name || 'Talent',
      companyName: seekerCompany?.name || 'Company'
    }

    // Notify talent seeker (company) - they need to pay the platform
    await notificationService.createNotification({
      userId: seekerCompany?.userId,
      companyId: seekerCompany?.id,
      type: 'manual_invoice_required',
      title: 'Payment Required - Engagement Accepted',
      message: `Your engagement "${talentRequest?.title || engagement.title || 'Project'}" has been accepted. Please pay ${totalAmount.toFixed(2)} ZAR to the platform.`,
      data: {
        ...notificationData,
        action: 'pay_platform',
        amount: totalAmount
      },
      priority: 'high',
      channels: ['in_app', 'email']
    })

    // Notify talent provider - they need to invoice the platform
    await notificationService.createNotification({
      userId: talent?.user?.id,
      companyId: talent?.companyId,
      type: 'manual_invoice_required',
      title: 'Invoice Required - Engagement Accepted',
      message: `Your engagement "${talentRequest?.title || engagement.title || 'Project'}" has been accepted. Please invoice the platform for ${providerAmount.toFixed(2)} ZAR.`,
      data: {
        ...notificationData,
        action: 'invoice_platform',
        amount: providerAmount
      },
      priority: 'high',
      channels: ['in_app', 'email']
    })

    // Notify platform admin (optional)
    await notificationService.createNotification({
      userId: 'admin', // This would be the admin user ID
      type: 'manual_invoice_required',
      title: 'Manual Invoicing Required - Engagement Accepted',
      message: `Engagement ${engagement.id} accepted. Manual invoicing process required.`,
      data: {
        ...notificationData,
        action: 'manual_process',
        seekerAmount: totalAmount,
        providerAmount
      },
      priority: 'medium',
      channels: ['in_app', 'email']
    })

    logInfo('Accepted engagement invoicing notifications sent successfully', {
      engagementId: engagement.id,
      totalAmount,
      platformFee,
      providerAmount
    })

  } catch (error) {
    logError('Failed to send accepted engagement invoicing notifications', {
      engagementId: engagement.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const engagement = await prisma.engagement.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        title: true,
        description: true,
        seekerCompany: {
          select: {
            name: true,
            website: true
          }
        },
        providerCompany: {
          select: {
            name: true,
            website: true
          }
        },
        offer: {
          select: {
            talent: {
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
    const resolvedParams = await params
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
