import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// GET /api/admin/dashboard - Get admin dashboard metrics
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    logInfo('Fetching admin dashboard metrics', { correlationId })

    // Get current date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    // Company metrics
    const [
      totalCompanies,
      verifiedCompanies,
      pendingVerification,
      newCompaniesThisMonth,
      newCompaniesLastMonth
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { verified: true } }),
      prisma.company.count({ where: { verified: false, status: 'PENDING_VERIFICATION' } }),
      prisma.company.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      prisma.company.count({
        where: { 
          createdAt: { 
            gte: startOfLastMonth,
            lte: endOfLastMonth
          }
        }
      })
    ])

    // Engagement metrics
    const [
      activeEngagements,
      completedEngagements,
      disputedEngagements,
      totalEngagements
    ] = await Promise.all([
      prisma.engagement.count({ where: { status: 'ACTIVE' } }),
      prisma.engagement.count({ where: { status: 'COMPLETED' } }),
      prisma.engagement.count({ where: { status: 'DISPUTED' } }),
      prisma.engagement.count()
    ])

    // Financial metrics
    const [
      totalRevenue,
      monthlyRevenue,
      pendingPayments,
      totalPayments
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { 
          status: 'COMPLETED',
          type: 'RELEASE'
        },
        _sum: { platformFee: true }
      }),
      prisma.payment.aggregate({
        where: { 
          status: 'COMPLETED',
          type: 'RELEASE',
          completedAt: { gte: startOfMonth }
        },
        _sum: { platformFee: true }
      }),
      prisma.payment.count({ where: { status: 'PROCESSING' } }),
      prisma.payment.count()
    ])

    // Offer metrics
    const [
      pendingOffers,
      acceptedOffers,
      totalOffers
    ] = await Promise.all([
      prisma.offer.count({ where: { status: 'PENDING' } }),
      prisma.offer.count({ where: { status: 'ACCEPTED' } }),
      prisma.offer.count()
    ])

    // Contract metrics
    const [
      pendingContracts,
      signedContracts,
      totalContracts
    ] = await Promise.all([
      prisma.contract.count({ 
        where: { 
          status: { in: ['DRAFT', 'SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED'] }
        }
      }),
      prisma.contract.count({ where: { status: 'FULLY_SIGNED' } }),
      prisma.contract.count()
    ])

    // Recent activity (last 7 days)
    const recentActivity = await prisma.$queryRaw`
      SELECT 
        'company_registration' as type,
        c.name as description,
        c.created_at as timestamp,
        c.id as entity_id
      FROM companies c 
      WHERE c.created_at >= ${startOfWeek}
      
      UNION ALL
      
      SELECT 
        'offer_created' as type,
        CONCAT('Offer for ', tr.title) as description,
        o.created_at as timestamp,
        o.id as entity_id
      FROM offers o
      JOIN matches m ON o.match_id = m.id
      JOIN talent_requests tr ON m.request_id = tr.id
      WHERE o.created_at >= ${startOfWeek}
      
      UNION ALL
      
      SELECT 
        'engagement_completed' as type,
        CONCAT('Engagement completed for ', tr.title) as description,
        e.completed_at as timestamp,
        e.id as entity_id
      FROM engagements e
      JOIN contracts c ON e.contract_id = c.id
      JOIN offers o ON c.offer_id = o.id
      JOIN matches m ON o.match_id = m.id
      JOIN talent_requests tr ON m.request_id = tr.id
      WHERE e.completed_at >= ${startOfWeek}
      
      ORDER BY timestamp DESC
      LIMIT 20
    `

    // System health metrics
    const systemHealth = {
      databaseConnections: await prisma.$queryRaw`SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`,
      apiResponseTime: 245, // This would come from monitoring service
      errorRate: 0.12, // This would come from error tracking
      uptime: 99.8 // This would come from monitoring service
    }

    // Calculate growth rates
    const companyGrowthRate = newCompaniesLastMonth > 0 
      ? ((newCompaniesThisMonth - newCompaniesLastMonth) / newCompaniesLastMonth) * 100 
      : 0

    const engagementSuccessRate = totalEngagements > 0 
      ? (completedEngagements / totalEngagements) * 100 
      : 0

    const offerAcceptanceRate = totalOffers > 0 
      ? (acceptedOffers / totalOffers) * 100 
      : 0

    const dashboardData = {
      // Company metrics
      companies: {
        total: totalCompanies,
        verified: verifiedCompanies,
        pendingVerification,
        newThisMonth: newCompaniesThisMonth,
        growthRate: Math.round(companyGrowthRate * 100) / 100
      },

      // Engagement metrics
      engagements: {
        active: activeEngagements,
        completed: completedEngagements,
        disputed: disputedEngagements,
        total: totalEngagements,
        successRate: Math.round(engagementSuccessRate * 100) / 100
      },

      // Financial metrics
      revenue: {
        total: Number(totalRevenue._sum.platformFee || 0),
        monthly: Number(monthlyRevenue._sum.platformFee || 0),
        pendingPayments,
        totalPayments
      },

      // Offer metrics
      offers: {
        pending: pendingOffers,
        accepted: acceptedOffers,
        total: totalOffers,
        acceptanceRate: Math.round(offerAcceptanceRate * 100) / 100
      },

      // Contract metrics
      contracts: {
        pending: pendingContracts,
        signed: signedContracts,
        total: totalContracts
      },

      // Recent activity
      recentActivity,

      // System health
      systemHealth: {
        apiResponseTime: systemHealth.apiResponseTime,
        errorRate: systemHealth.errorRate,
        uptime: systemHealth.uptime,
        databaseConnections: Number(systemHealth.databaseConnections[0]?.active_connections || 0)
      }
    }

    logInfo('Admin dashboard metrics retrieved successfully', {
      correlationId,
      totalCompanies,
      activeEngagements,
      totalRevenue: dashboardData.revenue.total
    })

    return NextResponse.json({
      success: true,
      data: dashboardData,
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_admin_dashboard' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve dashboard metrics',
      correlationId
    }, { status: 500 })
  }
}
