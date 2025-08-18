import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/analytics - Get platform analytics (admin only)
export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get analytics data
    const [
      totalUsers,
      totalCompanies,
      totalTalentProfiles,
      totalTalentRequests,
      totalOffers,
      totalEngagements,
      totalRevenue,
      activeEngagements,
      completedEngagements,
      pendingDisputes,
      averageRating,
      userGrowth,
      engagementGrowth,
      revenueGrowth
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.company.count(),
      prisma.talentProfile.count(),
      prisma.talentRequest.count(),
      prisma.offer.count(),
      prisma.engagement.count(),
      
      // Revenue calculation
      prisma.engagement.aggregate({
        where: { status: 'completed' },
        _sum: { budget: true }
      }),
      
      // Engagement status counts
      prisma.engagement.count({
        where: { status: 'active' }
      }),
      prisma.engagement.count({
        where: { status: 'completed' }
      }),
      
      // Disputes
      prisma.dispute.count({
        where: { status: 'open' }
      }),
      
      // Average rating
      prisma.review.aggregate({
        _avg: { rating: true }
      }),
      
      // Growth metrics (current period vs previous period)
      prisma.user.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.engagement.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.engagement.aggregate({
        where: { 
          status: 'completed',
          completedAt: { gte: startDate }
        },
        _sum: { budget: true }
      })
    ])

    // Calculate growth percentages (simplified - in real app, compare with previous period)
    const userGrowthPercent = userGrowth > 0 ? Math.round((userGrowth / totalUsers) * 100) : 0
    const engagementGrowthPercent = engagementGrowth > 0 ? Math.round((engagementGrowth / totalEngagements) * 100) : 0
    const revenueGrowthPercent = revenueGrowth._sum.budget && totalRevenue._sum.budget 
      ? Math.round((Number(revenueGrowth._sum.budget) / Number(totalRevenue._sum.budget)) * 100) 
      : 0

    // Get top performing categories
    const topCategories = await prisma.talentRequest.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 5
    })

    // Get recent activity
    const recentActivity = await prisma.engagement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        talentProfile: {
          include: { user: true }
        },
        company: true
      }
    })

    logger.info('Analytics retrieved successfully', {
      adminId: user.id,
      period
    })

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalUsers,
          totalCompanies,
          totalTalentProfiles,
          totalTalentRequests,
          totalOffers,
          totalEngagements,
          totalRevenue: totalRevenue._sum.budget || 0,
          activeEngagements,
          completedEngagements,
          pendingDisputes,
          averageRating: averageRating._avg.rating || 0
        },
        growth: {
          userGrowth: userGrowthPercent,
          engagementGrowth: engagementGrowthPercent,
          revenueGrowth: revenueGrowthPercent
        },
        topCategories: topCategories.map(cat => ({
          category: cat.category,
          count: cat._count.category
        })),
        recentActivity: recentActivity.map(engagement => ({
          id: engagement.id,
          title: engagement.title,
          status: engagement.status,
          budget: engagement.budget,
          talent: engagement.talentProfile.user.name,
          company: engagement.company.name,
          createdAt: engagement.createdAt
        }))
      }
    })

  } catch (error) {
    logger.error('Failed to get analytics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
