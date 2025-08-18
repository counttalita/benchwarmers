import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import logger from '@/lib/logger'
import { notificationService } from '@/lib/notifications/notification-service'
import { z } from 'zod'

const initiateInterviewSchema = z.object({
  talentProfileId: z.string().min(1, 'Talent profile ID is required'),
  message: z.string().max(1000, 'Message cannot exceed 1000 characters').optional(),
  interviewDate: z.string().datetime().optional(),
  interviewType: z.enum(['phone', 'video', 'in_person']).default('video'),
  interviewDuration: z.number().min(15).max(480).default(60), // minutes
  interviewerName: z.string().min(1).max(100).optional(),
  interviewLocation: z.string().max(200).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = resolvedParams.id
    const body = await request.json()
    const validatedData = initiateInterviewSchema.parse(body)

    // Get the talent request
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: requestId },
      include: {
        company: {
          include: {
            users: true
          }
        }
      }
    })

    if (!talentRequest) {
      return NextResponse.json({ error: 'Talent request not found' }, { status: 404 })
    }

    // Verify user belongs to seeker company
    if (talentRequest.companyId !== user.companyId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify company is a seeker
    if (talentRequest.company.type !== 'seeker' && talentRequest.company.type !== 'both') {
      return NextResponse.json({ 
        error: 'Only seeker companies can initiate interviews' 
      }, { status: 403 })
    }

    // Get the talent profile
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: validatedData.talentProfileId },
      include: {
        company: {
          include: {
            users: true
          }
        }
      }
    })

    if (!talentProfile) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
    }

    // Verify talent profile belongs to a provider company
    if (talentProfile.company.type !== 'provider' && talentProfile.company.type !== 'both') {
      return NextResponse.json({ 
        error: 'Can only interview talent from provider companies' 
      }, { status: 400 })
    }

    // Check if there's already an active engagement for this combination
    const existingEngagement = await prisma.engagement.findFirst({
      where: {
        offer: {
          talentRequestId: requestId,
          talentProfileId: validatedData.talentProfileId
        },
        status: {
          in: ['staged', 'interviewing', 'accepted', 'active']
        }
      }
    })

    if (existingEngagement) {
      return NextResponse.json({ 
        error: 'An active engagement already exists for this talent and request' 
      }, { status: 400 })
    }

    // Create an offer first
    const offer = await prisma.offer.create({
      data: {
        talentRequestId: requestId,
        talentProfileId: validatedData.talentProfileId,
        companyId: talentRequest.companyId,
        amount: talentProfile.rateMax, // Use max rate as initial offer
        currency: talentProfile.currency,
        message: validatedData.message || `Interview request for ${talentRequest.title}`,
        status: 'pending'
      }
    })

    // Create engagement in 'staged' status
    const engagement = await prisma.engagement.create({
      data: {
        offerId: offer.id,
        status: 'staged',
        startDate: talentRequest.startDate,
        endDate: new Date(talentRequest.startDate.getTime() + (talentRequest.durationWeeks * 7 * 24 * 60 * 60 * 1000)),
        totalAmount: offer.amount,
        currency: offer.currency
      },
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
            }
          }
        }
      }
    })

    // Create notifications for talent provider company
    const interviewNotificationData = {
      type: 'interview_request' as const,
      title: 'Interview Request Received',
      message: `${talentRequest.company.name} has requested an interview for "${talentRequest.title}" with ${talentProfile.name}`,
      priority: 'high' as const,
      metadata: {
        engagementId: engagement.id,
        talentRequestId: requestId,
        talentProfileId: validatedData.talentProfileId,
        seekerCompany: talentRequest.company.name,
        projectTitle: talentRequest.title,
        interviewDate: validatedData.interviewDate,
        interviewType: validatedData.interviewType,
        interviewDuration: validatedData.interviewDuration,
        interviewerName: validatedData.interviewerName,
        interviewLocation: validatedData.interviewLocation
      }
    }

    // Notify all users in the talent provider company
    await notificationService.bulkCreateNotifications(
      talentProfile.company.users.map((user: any) => ({
        userId: user.id,
        ...interviewNotificationData
      }))
    )

    // Also notify seeker company users about the initiated interview
    const seekerNotificationData = {
      type: 'interview_initiated' as const,
      title: 'Interview Request Sent',
      message: `Interview request sent to ${talentProfile.company.name} for ${talentProfile.name} on project "${talentRequest.title}"`,
      priority: 'medium' as const,
      metadata: {
        engagementId: engagement.id,
        talentRequestId: requestId,
        talentProfileId: validatedData.talentProfileId,
        providerCompany: talentProfile.company.name,
        talentName: talentProfile.name,
        projectTitle: talentRequest.title
      }
    }

    await notificationService.bulkCreateNotifications(
      talentRequest.company.users.map((user: any) => ({
        userId: user.id,
        ...seekerNotificationData
      }))
    )

    logger.info('Interview initiated by seeker company', {
      engagementId: engagement.id,
      talentRequestId: requestId,
      talentProfileId: validatedData.talentProfileId,
      seekerCompanyId: talentRequest.companyId,
      providerCompanyId: talentProfile.companyId,
      initiatedBy: user.id
    })

    return NextResponse.json({
      success: true,
      engagement: {
        id: engagement.id,
        status: engagement.status,
        offer: {
          id: offer.id,
          amount: offer.amount,
          currency: offer.currency,
          message: offer.message
        },
        talentRequest: {
          id: talentRequest.id,
          title: talentRequest.title,
          company: {
            id: talentRequest.company.id,
            name: talentRequest.company.name
          }
        },
        talentProfile: {
          id: talentProfile.id,
          name: talentProfile.name,
          title: talentProfile.title,
          company: {
            id: talentProfile.company.id,
            name: talentProfile.company.name
          }
        }
      },
      message: 'Interview request sent successfully. The talent provider will be notified.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }

    logger.error('Failed to initiate interview', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
