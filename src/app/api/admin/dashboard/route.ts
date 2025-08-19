import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check authentication and admin role
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all statistics in parallel for better performance
    const [
      userStats,
      companyStats,
      engagementStats,
      paymentStats,
      subscriptionStats,
      matchStats,
      recentActivity
    ] = await Promise.all([
      // User statistics
      prisma.user.groupBy({
        by: ['isActive'],
        _count: true
      }),
      
      // Company statistics
      prisma.company.groupBy({
        by: ['type', 'status'],
        _count: true
      }),
      
      // Engagement statistics
      prisma.engagement.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          totalAmount: true,
          platformFee: true
        }
      }),
      
      // Payment statistics
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          amount: true,
          platform_fee_amount: true
        }
      }),
      
      // Subscription statistics
      prisma.subscription.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          amount: true
        }
      }),
      
      // Match statistics
      prisma.match.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Recent activity (last 10 activities)
      prisma.notification.findMany({
        where: {
          type: {
            in: [
              'engagement_started',
              'payment_released',
              'user_registered',
              'company_verified',
              'interview_scheduled',
              'subscription_cancelled'
            ]
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          company: {
            select: {
              name: true
            }
          }
        }
      })
    ])

    // Process user statistics
    const users = {
      total: userStats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      active: userStats.find((stat: any) => stat.isActive)?._count || 0,
      pending: userStats.find((stat: any) => !stat.isActive)?._count || 0,
      verified: 0 // Would need additional field for verification status
    }

    // Process company statistics
    const companies = {
      total: companyStats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      providers: companyStats.find((stat: any) => stat.type === 'provider')?._count || 0,
      seekers: companyStats.find((stat: any) => stat.type === 'seeker')?._count || 0,
      pending: companyStats.find((stat: any) => stat.status === 'pending')?._count || 0,
      verified: companyStats.find((stat: any) => stat.status === 'active')?._count || 0
    }

    // Process engagement statistics
    const engagements = {
      total: engagementStats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      staged: engagementStats.find((stat: any) => stat.status === 'staged')?._count || 0,
      interviewing: engagementStats.find((stat: any) => stat.status === 'interviewing')?._count || 0,
      accepted: engagementStats.find((stat: any) => stat.status === 'accepted')?._count || 0,
      active: engagementStats.find((stat: any) => stat.status === 'active')?._count || 0,
      completed: engagementStats.find((stat: any) => stat.status === 'completed')?._count || 0,
      rejected: engagementStats.find((stat: any) => stat.status === 'rejected')?._count || 0,
      terminated: engagementStats.find((stat: any) => stat.status === 'terminated')?._count || 0,
      disputed: engagementStats.find((stat: any) => stat.status === 'disputed')?._count || 0
    }

    // Process payment statistics
    const payments = {
      total: paymentStats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      pending: paymentStats.find((stat: any) => stat.status === 'pending')?._count || 0,
      completed: paymentStats.find((stat: any) => stat.status === 'released')?._count || 0,
      failed: paymentStats.find((stat: any) => stat.status === 'refunded')?._count || 0,
      revenue: paymentStats.reduce((sum: number, stat: any) => sum + (stat._sum.amount || 0), 0),
      facilitationFees: paymentStats.reduce((sum: number, stat: any) => sum + (stat._sum.platform_fee_amount || 0), 0)
    }

    // Process subscription statistics
    const subscriptions = {
      total: subscriptionStats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      active: subscriptionStats.find((stat: any) => stat.status === 'active')?._count || 0,
      cancelled: subscriptionStats.find((stat: any) => stat.status === 'cancelled')?._count || 0,
      revenue: subscriptionStats.reduce((sum: number, stat: any) => sum + (stat._sum.amount || 0), 0)
    }

    // Process match statistics
    const totalMatches = matchStats.reduce((sum: number, stat: any) => sum + stat._count, 0)
    const acceptedMatches = matchStats.find((stat: any) => stat.status === 'interested')?._count || 0
    const matches = {
      total: totalMatches,
      pending: matchStats.find((stat: any) => stat.status === 'pending')?._count || 0,
      accepted: acceptedMatches,
      rejected: matchStats.find((stat: any) => stat.status === 'not_interested')?._count || 0,
      successRate: totalMatches > 0 ? Math.round((acceptedMatches / totalMatches) * 100) : 0
    }

    // Mock system health data (in production, this would come from monitoring systems)
    const system = {
      uptime: 99.9,
      errorRate: 0.1,
      responseTime: 150,
      activeUsers: Math.floor(Math.random() * 50) + 10 // Mock data
    }

    // Process recent activity
    const processedActivity = recentActivity.map((notification: any) => ({
      id: notification.id,
      type: notification.type as any,
      title: getActivityTitle(notification.type, notification.user?.name, notification.company?.name),
      description: getActivityDescription(notification.type, notification.user?.name, notification.company?.name),
      timestamp: notification.createdAt.toISOString(),
      severity: getActivitySeverity(notification.type)
    }))

    const stats = {
      users,
      companies,
      engagements,
      payments,
      subscriptions,
      matches,
      system
    }

    logger.info('Admin dashboard data retrieved successfully', {
      userId: user.id,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      stats,
      recentActivity: processedActivity
    })

  } catch (error) {
    logger.error('Failed to load admin dashboard data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    )
  }
}

function getActivityTitle(type: string, userName?: string, companyName?: string): string {
  switch (type) {
    case 'engagement_started':
      return 'New Engagement Started'
    case 'payment_released':
      return 'Payment Released'
    case 'user_registered':
      return `New User Registered: ${userName || 'Unknown'}`
    case 'company_verified':
      return `Company Verified: ${companyName || 'Unknown'}`
    case 'interview_scheduled':
      return 'Interview Scheduled'
    case 'subscription_cancelled':
      return 'Subscription Cancelled'
    default:
      return 'System Activity'
  }
}

function getActivityDescription(type: string, userName?: string, companyName?: string): string {
  switch (type) {
    case 'engagement_started':
      return 'A new engagement has been created and is now active'
    case 'payment_released':
      return 'Payment has been successfully released to the provider'
    case 'user_registered':
      return `${userName || 'A new user'} has registered on the platform`
    case 'company_verified':
      return `${companyName || 'A company'} has been verified and activated`
    case 'interview_scheduled':
      return 'An interview has been scheduled between a seeker and talent'
    case 'subscription_cancelled':
      return 'A user has cancelled their subscription'
    default:
      return 'System activity occurred'
  }
}

function getActivitySeverity(type: string): 'info' | 'warning' | 'error' | 'success' {
  switch (type) {
    case 'engagement_started':
    case 'payment_released':
    case 'company_verified':
      return 'success'
    case 'interview_scheduled':
      return 'info'
    case 'subscription_cancelled':
      return 'warning'
    default:
      return 'info'
  }
}
