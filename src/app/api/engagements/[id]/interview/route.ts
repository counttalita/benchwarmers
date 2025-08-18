import { NextRequest, NextResponse } from 'next/server'
const resolvedParams = await params
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import logger from '@/lib/logger'
import { notificationService } from '@/lib/notifications/notification-service'

const updateInterviewStatusSchema = z.object({
  status: z.enum(['staged', 'interviewing', 'accepted', 'rejected']),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  interviewDate: z.string().datetime().optional(),
  interviewDuration: z.number().min(1).max(480, 'Interview duration must be between 1 and 480 minutes').optional(), // in minutes
  interviewerName: z.string().min(1, 'Interviewer name is required when scheduling interview').max(100, 'Interviewer name cannot exceed 100 characters').optional(),
  interviewType: z.enum(['phone', 'video', 'in_person']).optional(),
  interviewLocation: z.string().max(200, 'Interview location cannot exceed 200 characters').optional(),
  interviewNotes: z.string().max(2000, 'Interview notes cannot exceed 2000 characters').optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const engagementId = resolvedParams.id
    const body = await request.json()
    const validatedData = updateInterviewStatusSchema.parse(body)

    // Get the engagement with related data
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        offer: {
          include: {
            talentRequest: {
              include: {
                company: {
                  include: {
                    users: true
                  }
                }
              }
            },
            talentProfile: {
              include: {
                company: {
                  include: {
                    users: true
                  }
                }
              }
            },
            company: {
              include: {
                users: true
              }
            }
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Verify user has permission to update this engagement
    const isSeekerCompany = engagement.offer.talentRequest.companyId === user.companyId
    const isProviderCompany = engagement.offer.talentProfile.companyId === user.companyId
    const isAdmin = user.role === 'admin'

    if (!isSeekerCompany && !isProviderCompany && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate status transitions
    const currentStatus = engagement.status
    const newStatus = validatedData.status

    const validTransitions: Record<string, string[]> = {
      'staged': ['interviewing', 'rejected'],
      'interviewing': ['accepted', 'rejected'],
      'accepted': ['active'], // Only admin can move to active
      'rejected': [] // Terminal state
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${currentStatus} to ${newStatus}` 
      }, { status: 400 })
    }

    // Update engagement status
    const updatedEngagement = await prisma.engagement.update({
      where: { id: engagementId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        offer: {
          include: {
            talentRequest: {
              include: {
                company: {
                  include: {
                    users: true
                  }
                }
              }
            },
            talentProfile: {
              include: {
                company: {
                  include: {
                    users: true
                  }
                }
              }
            },
            company: {
              include: {
                users: true
              }
            }
          }
        }
      }
    })

    // Create notification for status change
    const notificationData = {
      type: 'engagement_status_changed' as const,
      title: `Engagement Status Updated: ${newStatus}`,
      message: `The engagement for "${engagement.offer.talentRequest.title}" has been updated to ${newStatus}`,
      priority: 'medium' as const,
      metadata: {
        engagementId,
        previousStatus: currentStatus,
        newStatus,
        notes: validatedData.notes,
        interviewDate: validatedData.interviewDate,
        interviewerName: validatedData.interviewerName
      }
    }

    // Notify all stakeholders
    const allStakeholders = [
      ...engagement.offer.talentRequest.company.users,
      ...engagement.offer.talentProfile.company.users
    ]

    await notificationService.bulkCreateNotifications(
      allStakeholders.map(user => ({
        userId: user.id,
        ...notificationData
      }))
    )

    // Special handling for 'accepted' status - trigger manual invoicing notification
    if (newStatus === 'accepted') {
      const invoiceNotificationData = {
        type: 'manual_invoice_required' as const,
        title: 'Manual Invoice Required',
        message: `Engagement accepted! Manual invoicing required for ${engagement.offer.talentRequest.title}. Amount: R${engagement.totalAmount}`,
        priority: 'high' as const,
        metadata: {
          engagementId,
          amount: engagement.totalAmount,
          talentSeekerCompany: engagement.offer.talentRequest.company.name,
          talentProviderCompany: engagement.offer.talentProfile.company.name,
          facilitationFee: Number(engagement.totalAmount) * 0.05, // 5% fee
          netAmount: Number(engagement.totalAmount) * 0.95
        }
      }

      // Notify admin users for manual invoicing
      const adminUsers = allStakeholders.filter((user: any) => user.role === 'admin')
      if (adminUsers.length > 0) {
        await notificationService.bulkCreateNotifications(
          adminUsers.map((user: any) => ({
            userId: user.id,
            ...invoiceNotificationData
          }))
        )
      }

      // Also notify the talent seeker company about payment requirement
      const seekerUsers = engagement.offer.talentRequest.company.users
      await notificationService.bulkCreateNotifications(
        seekerUsers.map(user => ({
          userId: user.id,
          type: 'payment_required' as const,
          title: 'Payment Required',
          message: `Please prepare payment of R${engagement.totalAmount} for the accepted engagement "${engagement.offer.talentRequest.title}"`,
          priority: 'high' as const,
          metadata: {
            engagementId,
            amount: engagement.totalAmount,
            paymentInstructions: 'Manual invoicing - you will receive an invoice shortly'
          }
        }))
      )

      logger.info('Engagement accepted - manual invoicing triggered', {
        engagementId,
        amount: engagement.totalAmount,
        talentSeekerCompany: engagement.offer.talentRequest.company.name,
        talentProviderCompany: engagement.offer.talentProfile.company.name
      })
    }

    logger.info('Engagement interview status updated', {
      engagementId,
      previousStatus: currentStatus,
      newStatus,
      updatedBy: user.id
    })

    return NextResponse.json({
      success: true,
      engagement: {
        id: updatedEngagement.id,
        status: updatedEngagement.status,
        updatedAt: updatedEngagement.updatedAt,
        offer: {
          id: updatedEngagement.offer.id,
          talentRequest: {
            id: updatedEngagement.offer.talentRequest.id,
            title: updatedEngagement.offer.talentRequest.title,
            company: {
              id: updatedEngagement.offer.talentRequest.company.id,
              name: updatedEngagement.offer.talentRequest.company.name
            }
          },
          talentProfile: {
            id: updatedEngagement.offer.talentProfile.id,
            name: updatedEngagement.offer.talentProfile.name,
            company: {
              id: updatedEngagement.offer.talentProfile.company.id,
              name: updatedEngagement.offer.talentProfile.company.name
            }
          }
        }
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }

    logger.error('Failed to update engagement interview status', { error: (error as Error).message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const engagementId = resolvedParams.id

    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
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
                company: true
              }
            },
            company: true
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Verify user has permission to view this engagement
    const isSeekerCompany = engagement.offer.talentRequest.companyId === user.companyId
    const isProviderCompany = engagement.offer.talentProfile.companyId === user.companyId
    const isAdmin = user.role === 'admin'

    if (!isSeekerCompany && !isProviderCompany && !isAdmin) {
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
        createdAt: engagement.createdAt,
        updatedAt: engagement.updatedAt,
        offer: {
          id: engagement.offer.id,
          amount: engagement.offer.amount,
          message: engagement.offer.message,
          talentRequest: {
            id: engagement.offer.talentRequest.id,
            title: engagement.offer.talentRequest.title,
            company: {
              id: engagement.offer.talentRequest.company.id,
              name: engagement.offer.talentRequest.company.name
            }
          },
          talentProfile: {
            id: engagement.offer.talentProfile.id,
            name: engagement.offer.talentProfile.name,
            company: {
              id: engagement.offer.talentProfile.company.id,
              name: engagement.offer.talentProfile.company.name
            }
          }
        }
      }
    })

  } catch (error) {
    logger.error('Failed to get engagement interview details', { error: (error as Error).message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
