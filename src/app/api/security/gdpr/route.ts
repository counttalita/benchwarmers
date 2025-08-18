import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

// POST /api/security/gdpr - Delete user data for GDPR compliance
export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const body = await request.json()
    const { userId, reason } = body

    if (!userId) {
      logger.warn('Missing userId in GDPR deletion request')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      logger.warn('User not found for GDPR deletion', { userId })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete reviews
      await tx.review.deleteMany({
        where: { reviewerId: userId }
      })

      // Delete offers
      await tx.offer.deleteMany({
        where: { talentId: userId }
      })

      // Delete talent profile
      await tx.talentProfile.deleteMany({
        where: { userId }
      })

      // Delete talent requests
      await tx.talentRequest.deleteMany({
        where: { companyId: user.companyId }
      })

      // Delete engagements
      await tx.engagement.deleteMany({
        where: {
          OR: [
            { talentId: userId },
            { companyId: user.companyId }
          ]
        }
      })

      // Delete payments
      await tx.payment.deleteMany({
        where: {
          OR: [
            { talentId: userId },
            { companyId: user.companyId }
          ]
        }
      })

      // Delete notifications
      await tx.notification.deleteMany({
        where: { userId }
      })

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      })
    })

    logger.info('User data deleted successfully for GDPR compliance', {
      userId,
      reason: reason || 'GDPR request'
    })

    return NextResponse.json({
      message: 'User data deleted successfully',
      userId,
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to delete user data for GDPR', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export the function for use in other modules
export async function deleteUserData(userId: string, reason?: string) {
  const logger = require('@/lib/logger').logger
  
  try {
    // Same deletion logic as above
    await prisma.$transaction(async (tx) => {
      await tx.review.deleteMany({ where: { reviewerId: userId } })
      await tx.offer.deleteMany({ where: { talentId: userId } })
      await tx.talentProfile.deleteMany({ where: { userId } })
      await tx.notification.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    logger.info('User data deleted successfully', { userId, reason })
    return true
  } catch (error) {
    logger.error('Failed to delete user data', error)
    return false
  }
}
