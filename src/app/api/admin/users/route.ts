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

    // Get URL parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    // Build where clause for filtering
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search } }
      ]
    }
    
    if (role && role !== 'all') {
      where.role = role
    }
    
    if (status && status !== 'all') {
      where.isActive = status === 'active'
    }

    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          subscriptions: {
            where: {
              status: 'active'
            },
            select: {
              status: true,
              amount: true,
              next_billing_date: true
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ])

    // Get user statistics
    const [
      totalUsersCount,
      activeUsersCount,
      inactiveUsersCount,
      adminUsersCount,
      memberUsersCount,
      verifiedUsersCount,
      usersWithSubscriptionCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { role: 'member' } }),
      prisma.user.count({ where: { phone_verified: true } }),
      prisma.user.count({
        where: {
          subscriptions: {
            some: {
              status: 'active'
            }
          }
        }
      })
    ])

    // Transform users data
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone_number,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified || false,
      isPhoneVerified: user.phone_verified || false,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      company: user.company,
      subscription: user.subscriptions[0] || null
    }))

    const stats = {
      total: totalUsersCount,
      active: activeUsersCount,
      inactive: inactiveUsersCount,
      verified: verifiedUsersCount,
      pending: totalUsersCount - verifiedUsersCount,
      admins: adminUsersCount,
      members: memberUsersCount,
      withSubscription: usersWithSubscriptionCount
    }

    logger.info('User management data retrieved successfully', {
      userId: user.id,
      totalUsers: totalUsers,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      users: transformedUsers,
      stats,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      }
    })

  } catch (error) {
    logger.error('Failed to load user management data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to load user data' },
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
    const { action, userIds } = body

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        })
        break

      case 'deactivate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        })
        break

      case 'delete':
        result = await prisma.user.deleteMany({
          where: { id: { in: userIds } }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    logger.info('Bulk user action performed', {
      adminUserId: user.id,
      action,
      affectedUsers: userIds.length
    })

    return NextResponse.json({
      success: true,
      message: `${action} completed for ${result.count} users`,
      affectedCount: result.count
    })

  } catch (error) {
    logger.error('Failed to perform bulk user action', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
