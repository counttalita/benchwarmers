import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    // Get engagements with related data
    const [engagements, totalCount] = await Promise.all([
      prisma.engagement.findMany({
        where,
        include: {
          talentRequest: {
            include: {
              seekerCompany: true
            }
          },
          talentProfile: {
            include: {
              user: true,
              company: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.engagement.count({ where })
    ])

    // Get statistics
    const stats = await prisma.engagement.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Transform stats into expected format
    const statsMap = {
      total: totalCount,
      staged: 0,
      interviewing: 0,
      accepted: 0,
      active: 0,
      completed: 0,
      rejected: 0,
      terminated: 0,
      disputed: 0,
      needsInvoice: 0
    }

    stats.forEach(stat => {
      if (stat.status in statsMap) {
        statsMap[stat.status as keyof typeof statsMap] = stat._count.status
      }
    })

    // Count engagements that need invoice processing (accepted status)
    statsMap.needsInvoice = statsMap.accepted

    // Transform engagements to match expected interface
    const transformedEngagements = engagements.map(engagement => ({
      id: engagement.id,
      status: engagement.status,
      createdAt: engagement.createdAt.toISOString(),
      updatedAt: engagement.updatedAt.toISOString(),
      talentRequest: {
        id: engagement.talentRequest.id,
        title: engagement.talentRequest.title,
        company: {
          id: engagement.talentRequest.seekerCompany.id,
          name: engagement.talentRequest.seekerCompany.name
        }
      },
      talentProfile: {
        id: engagement.talentProfile.id,
        name: engagement.talentProfile.user.name,
        title: engagement.talentProfile.title,
        company: {
          id: engagement.talentProfile.company.id,
          name: engagement.talentProfile.company.name
        }
      },
      // Add interview details if available (you might need to add this to your schema)
      interviewDetails: engagement.interviewDetails || undefined,
      // Add financial details if available
      totalAmount: engagement.totalAmount ? Number(engagement.totalAmount) : undefined,
      facilitationFee: engagement.totalAmount ? Number(engagement.totalAmount) * 0.05 : undefined,
      netAmount: engagement.totalAmount ? Number(engagement.totalAmount) * 0.95 : undefined
    }))

    logger.info('Admin engagements retrieved successfully', {
      count: engagements.length,
      totalCount,
      status,
      page,
      limit
    })

    return NextResponse.json({
      engagements: transformedEngagements,
      stats: statsMap,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    logger.error('Failed to retrieve admin engagements', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to retrieve engagements' },
      { status: 500 }
    )
  }
}
