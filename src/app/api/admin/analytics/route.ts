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
        _sum: { totalAmount: true }
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
          updatedAt: { gte: startDate }
        },
        _sum: { totalAmount: true }
      })
    ])

    const categories = ['category1', 'category2', 'category3', 'category4', 'category5']
    const categoryStats = await Promise.all(
      categories.map(async (cat: any) => {
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
            _sum: { totalAmount: true }
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
              updatedAt: { gte: startDate }
            },
            _sum: { totalAmount: true }
          })
        ])

        return {
          category: cat,
          totalUsers,
          totalCompanies,
          totalTalentProfiles,
          totalTalentRequests,
          totalOffers,
          totalEngagements,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          activeEngagements,
          completedEngagements,
          pendingDisputes,
          averageRating: averageRating._avg.rating || 0,
          userGrowth,
          engagementGrowth,
          revenueGrowth: revenueGrowth._sum.totalAmount || 0,
        }
      })
    )

    // Calculate growth percentages (simplified - in real app, compare with previous period)
    const userGrowthPercent = userGrowth > 0 ? Math.round((userGrowth / totalUsers) * 100) : 0
    const engagementGrowthPercent = engagementGrowth > 0 ? Math.round((engagementGrowth / totalEngagements) * 100) : 0
    const revenueGrowthPercent = revenueGrowth._sum.totalAmount && totalRevenue._sum.totalAmount 
      ? Math.round((Number(revenueGrowth._sum.totalAmount) / Number(totalRevenue._sum.totalAmount)) * 100) 
      : 0

    const engagements = await prisma.engagement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        offer: {
          include: {
            match: {
              include: {
                profile: {
                  include: { 
                    company: true
                  }
                },
                request: {
                  include: { 
                    company: true 
                  }
                }
              }
            },
            seekerCompany: true,
            providerCompany: true
          }
        }
      }
    })

    const engagementsByMonth = engagements.reduce((acc: any, engagement: any) => {
      const month = new Date(engagement.createdAt).toLocaleString('default', { month: 'long' })
      if (!acc[month]) {
        acc[month] = 0
      }
      acc[month]++
      return acc
    }, {})

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
          totalRevenue: totalRevenue._sum.totalAmount || 0,
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
        categoryStats,
        engagementsByMonth,
        recentActivity: engagements.map((engagement: any) => ({
          id: engagement.id,
          status: engagement.status,
          totalAmount: engagement.totalAmount,
          talent: engagement.offer.match.profile.company.name,
          company: engagement.offer.match.request.company.name,
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
