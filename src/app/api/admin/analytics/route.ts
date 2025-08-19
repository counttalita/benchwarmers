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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check admin role
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
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
      activeEngagements,
      completedEngagements,
      pendingDisputes
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.company.count(),
      prisma.talentProfile.count(),
      prisma.talentRequest.count(),
      prisma.offer.count(),
      prisma.engagement.count(),
      
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
      })
    ])



    logger.info('Analytics retrieved successfully', {
      adminId: user.id,
      period
    })

    return NextResponse.json({
      success: true,
      analytics: {
        totalUsers,
        totalCompanies,
        totalTalentProfiles,
        totalTalentRequests,
        totalOffers,
        totalEngagements,
        activeEngagements,
        completedEngagements,
        pendingDisputes
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
