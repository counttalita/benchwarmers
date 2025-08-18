import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const correlationId = `provider-dashboard-${Date.now()}`
  
  try {
    logRequest(request, correlationId)

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a provider
    const company = await prisma.company.findFirst({
      where: {
        users: { some: { id: user.id } },
        type: { in: ['provider', 'both'] }
      }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Access denied. Provider company required.' },
        { status: 403 }
      )
    }

    // Get provider's talent profiles
    const talentProfiles = await prisma.talentProfile.findMany({
      where: { companyId: company.id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    // Get engagements for all talent
    const talentIds = talentProfiles.map(t => t.id)
    const engagements = await prisma.engagement.findMany({
      where: {
        talentId: { in: talentIds }
      },
      include: {
        talent: {
          select: {
            name: true,
            title: true,
            company: {
              select: { name: true }
            }
          }
        },
        offer: {
          include: {
            talentRequest: {
              select: {
                title: true,
                company: {
                  select: { name: true }
                }
              }
            }
          }
        },
        payments: {
          where: { status: 'completed' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Get interview schedules
    const interviews = await prisma.interviewSchedule.findMany({
      where: {
        talentId: { in: talentIds }
      },
      include: {
        talent: {
          select: {
            name: true,
            title: true,
            company: {
              select: { name: true }
            }
          }
        },
        seeker: {
          select: {
            name: true,
            company: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    // Calculate statistics
    const stats = {
      totalTalent: talentProfiles.length,
      activeEngagements: engagements.filter(e => e.status === 'active').length,
      completedEngagements: engagements.filter(e => e.status === 'completed').length,
      totalEarnings: engagements
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + e.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0),
      averageRating: calculateAverageRating(engagements),
      upcomingInterviews: interviews.filter(i => 
        i.status === 'scheduled' && new Date(i.startTime) > new Date()
      ).length,
      pendingResponses: engagements.filter(e => 
        ['staged', 'interviewing'].includes(e.status)
      ).length
    }

    // Transform engagements data
    const transformedEngagements = engagements.map(engagement => ({
      id: engagement.id,
      talentName: engagement.talent?.name || 'Unknown',
      talentTitle: engagement.talent?.title || 'Unknown',
      requestTitle: engagement.offer?.talentRequest?.title || 'Unknown Project',
      seekerCompany: engagement.offer?.talentRequest?.company?.name || 'Unknown Company',
      status: engagement.status,
      interviewDate: engagement.interviewDate,
      engagementStartDate: engagement.startDate,
      engagementEndDate: engagement.endDate,
      hourlyRate: engagement.hourlyRate || 0,
      totalHours: engagement.totalHours || 0,
      totalEarnings: engagement.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      rating: engagement.rating || 0,
      feedback: engagement.feedback
    }))

    // Transform interviews data
    const transformedInterviews = interviews.map(interview => ({
      id: interview.id,
      talentName: interview.talent?.name || 'Unknown',
      talentTitle: interview.talent?.title || 'Unknown',
      seekerCompany: interview.seeker?.company?.name || 'Unknown Company',
      title: interview.title,
      startTime: interview.startTime,
      endTime: interview.endTime,
      meetingType: interview.meetingType,
      meetingUrl: interview.meetingUrl,
      status: interview.status
    }))

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      stats,
      engagements: transformedEngagements,
      interviews: transformedInterviews,
      metadata: {
        correlationId,
        talentCount: talentProfiles.length,
        engagementCount: engagements.length,
        interviewCount: interviews.length
      }
    })

  } catch (error) {
    logError('Failed to fetch provider dashboard data', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateAverageRating(engagements: any[]): number {
  const ratedEngagements = engagements.filter(e => e.rating && e.rating > 0)
  
  if (ratedEngagements.length === 0) return 0
  
  const totalRating = ratedEngagements.reduce((sum, e) => sum + e.rating, 0)
  return totalRating / ratedEngagements.length
}
