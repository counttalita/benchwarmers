import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access analytics
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
    const type = searchParams.get('type') || 'overview' // overview, financial, user-activity

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    let analytics: any = {}

    if (type === 'overview' || type === 'all') {
      // User activity metrics
      const [
        totalUsers,
        newUsers,
        activeUsers,
        totalCompanies,
        newCompanies,
        totalTalentProfiles,
        newTalentProfiles,
        totalTalentRequests,
        newTalentRequests,
        totalOffers,
        newOffers,
        totalEngagements,
        newEngagements,
        completedEngagements
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.user.count({
          where: { 
            lastLoginAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.company.count(),
        prisma.company.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.talentProfile.count(),
        prisma.talentProfile.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.talentRequest.count(),
        prisma.talentRequest.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.offer.count(),
        prisma.offer.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.engagement.count(),
        prisma.engagement.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.engagement.count({
          where: { 
            status: 'completed',
            updatedAt: { gte: startDate }
          }
        })
      ])

      analytics.userActivity = {
        totalUsers,
        newUsers,
        activeUsers,
        totalCompanies,
        newCompanies,
        totalTalentProfiles,
        newTalentProfiles,
        totalTalentRequests,
        newTalentRequests,
        totalOffers,
        newOffers,
        totalEngagements,
        newEngagements,
        completedEngagements
      }
    }

    if (type === 'financial' || type === 'all') {
      // Financial transaction metrics
      const [
        totalRevenue,
        periodRevenue,
        totalTransactions,
        periodTransactions,
        averageTransactionValue,
        platformFees,
        providerPayouts,
        pendingPayments,
        disputedAmount
      ] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: 'completed' }
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { 
            status: 'completed',
            createdAt: { gte: startDate }
          }
        }),
        prisma.transaction.count({
          where: { status: 'completed' }
        }),
        prisma.transaction.count({
          where: { 
            status: 'completed',
            createdAt: { gte: startDate }
          }
        }),
        prisma.transaction.aggregate({
          _avg: { amount: true },
          where: { status: 'completed' }
        }),
        prisma.transaction.aggregate({
          _sum: { platformFee: true },
          where: { status: 'completed' }
        }),
        prisma.transaction.aggregate({
          _sum: { providerAmount: true },
          where: { status: 'released' }
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: 'pending' }
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: 'disputed' }
        })
      ])

      analytics.financial = {
        totalRevenue: totalRevenue._sum.amount || 0,
        periodRevenue: periodRevenue._sum.amount || 0,
        totalTransactions,
        periodTransactions,
        averageTransactionValue: averageTransactionValue._avg.amount || 0,
        platformFees: platformFees._sum.platformFee || 0,
        providerPayouts: providerPayouts._sum.providerAmount || 0,
        pendingPayments: pendingPayments._sum.amount || 0,
        disputedAmount: disputedAmount._sum.amount || 0
      }
    }

    if (type === 'user-activity' || type === 'all') {
      // Detailed user activity metrics
      const [
        userRegistrationsByDay,
        companyRegistrationsByDay,
        talentRequestCreationByDay,
        offerCreationByDay,
        engagementCreationByDay,
        topSkills,
        topIndustries,
        userRetentionRate
      ] = await Promise.all([
        // User registrations by day
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "User"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `,
        // Company registrations by day
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "Company"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `,
        // Talent request creation by day
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "TalentRequest"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `,
        // Offer creation by day
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "Offer"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `,
        // Engagement creation by day
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "Engagement"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `,
        // Top skills
        prisma.talentProfile.findMany({
          select: { skills: true },
          where: { createdAt: { gte: startDate } }
        }),
        // Top industries
        prisma.company.groupBy({
          by: ['industry'],
          _count: { industry: true },
          where: { createdAt: { gte: startDate } },
          orderBy: { _count: { industry: 'desc' } },
          take: 10
        }),
        // User retention (simplified calculation)
        prisma.user.count({
          where: {
            lastLoginAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
          }
        })
      ])

      // Process skills data
      const skillCounts: Record<string, number> = {}
      topSkills.forEach(profile => {
        if (profile.skills) {
          profile.skills.forEach((skill: string) => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1
          })
        }
      })

      const topSkillsList = Object.entries(skillCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }))

      analytics.userActivityDetails = {
        userRegistrationsByDay,
        companyRegistrationsByDay,
        talentRequestCreationByDay,
        offerCreationByDay,
        engagementCreationByDay,
        topSkills: topSkillsList,
        topIndustries,
        userRetentionRate: (userRetentionRate / analytics.userActivity?.totalUsers) * 100 || 0
      }
    }

    // Add metadata
    analytics.metadata = {
      period,
      startDate,
      endDate: now,
      generatedAt: new Date().toISOString()
    }

    logger.info('Analytics generated', { 
      userId: user.id, 
      type, 
      period 
    })

    return NextResponse.json({
      success: true,
      analytics
    })

  } catch (error) {
    logger.error(error as Error, 'Failed to generate analytics')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
