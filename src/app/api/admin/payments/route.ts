import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check authentication and admin role
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
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

    // Get payment statistics
    const [
      paymentStats,
      subscriptionStats,
      transactions,
      revenueData
    ] = await Promise.all([
      // Payment statistics
      prisma.payment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: true,
        _sum: {
          amount: true,
          platform_fee_amount: true
        }
      }),

      // Subscription statistics
      prisma.subscription.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: true,
        _sum: {
          amount: true
        }
      }),

      // Recent transactions
      prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          company: {
            select: {
              name: true,
              type: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      }),

      // Revenue data for chart
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions,
          SUM(platform_fee_amount) as fees
        FROM payments 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
    ])

    // Process payment statistics
    const totalPayments = paymentStats.reduce((sum: number, stat: any) => sum + stat._count, 0)
    const completedPayments = paymentStats.find((stat: any) => stat.status === 'released')?._count || 0
    const pendingPayments = paymentStats.find((stat: any) => stat.status === 'pending')?._count || 0
    const failedPayments = paymentStats.find((stat: any) => stat.status === 'refunded')?._count || 0
    const totalRevenue = paymentStats.reduce((sum: number, stat: any) => sum + (stat._sum.amount || 0), 0)
    const totalFees = paymentStats.reduce((sum: number, stat: any) => sum + (stat._sum.platform_fee_amount || 0), 0)

    const processedPaymentStats = {
      total: totalPayments,
      pending: pendingPayments,
      completed: completedPayments,
      failed: failedPayments,
      revenue: totalRevenue,
      facilitationFees: totalFees,
      averageTransaction: totalPayments > 0 ? totalRevenue / totalPayments : 0,
      successRate: totalPayments > 0 ? Math.round((completedPayments / totalPayments) * 100) : 0
    }

    // Process subscription statistics
    const totalSubscriptions = subscriptionStats.reduce((sum: number, stat: any) => sum + stat._count, 0)
    const activeSubscriptions = subscriptionStats.find((stat: any) => stat.status === 'active')?._count || 0
    const cancelledSubscriptions = subscriptionStats.find((stat: any) => stat.status === 'cancelled')?._count || 0
    const subscriptionRevenue = subscriptionStats.reduce((sum: number, stat: any) => sum + (stat._sum.amount || 0), 0)

    const processedSubscriptionStats = {
      total: totalSubscriptions,
      active: activeSubscriptions,
      cancelled: cancelledSubscriptions,
      revenue: subscriptionRevenue,
      averageRevenue: activeSubscriptions > 0 ? subscriptionRevenue / activeSubscriptions : 0,
      churnRate: totalSubscriptions > 0 ? Math.round((cancelledSubscriptions / totalSubscriptions) * 100) : 0
    }

    // Process transactions
    const processedTransactions = transactions.map((transaction: any) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      type: transaction.type,
      reason: transaction.reason || 'Payment',
      paystackPaymentId: transaction.paystackPaymentId || '',
      processedAt: transaction.processedAt?.toISOString() || null,
      createdAt: transaction.createdAt.toISOString(),
      user: transaction.user,
      company: transaction.company
    }))

    // Process revenue data
    const processedRevenueData = (revenueData as any[]).map((data: any) => ({
      date: data.date.toISOString().split('T')[0],
      revenue: Number(data.revenue) || 0,
      transactions: Number(data.transactions) || 0,
      fees: Number(data.fees) || 0
    }))

    logger.info('Payment analytics data retrieved successfully', {
      userId: user.id,
      timeRange,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      paymentStats: processedPaymentStats,
      subscriptionStats: processedSubscriptionStats,
      transactions: processedTransactions,
      revenueData: processedRevenueData
    })

  } catch (error) {
    logger.error('Failed to load payment analytics data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to load payment data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { timeRange } = body

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
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

    // Get all transactions for export
    const transactions = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        company: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Generate CSV content
    const csvHeaders = [
      'Transaction ID',
      'User Name',
      'User Email',
      'Company Name',
      'Company Type',
      'Amount',
      'Currency',
      'Status',
      'Type',
      'Reason',
      'Paystack Payment ID',
      'Created At',
      'Processed At'
    ]

    const csvRows = transactions.map((transaction: any) => [
      transaction.id,
      transaction.user?.name || '',
      transaction.user?.email || '',
      transaction.company?.name || '',
      transaction.company?.type || '',
      transaction.amount,
      transaction.currency,
      transaction.status,
      transaction.type,
      transaction.reason || '',
      transaction.paystackPaymentId || '',
      transaction.createdAt.toISOString(),
      transaction.processedAt?.toISOString() || ''
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    logger.info('Payment data exported successfully', {
      userId: user.id,
      timeRange,
      transactionCount: transactions.length
    })

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-${timeRange}.csv"`
      }
    })

  } catch (error) {
    logger.error('Failed to export payment data', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
