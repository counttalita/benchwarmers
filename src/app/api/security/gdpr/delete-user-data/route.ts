import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const deleteUserDataSchema = z.object({
  userId: z.string().min(1),
  immediate: z.boolean().default(false)
})

// DELETE /api/security/gdpr/delete-user-data - Delete user data for GDPR compliance
export async function DELETE(request: NextRequest) {
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
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedBody = deleteUserDataSchema.parse(body)

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedBody.userId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (validatedBody.immediate) {
      // Immediate deletion
      await prisma.$transaction([
        // Delete related data
        prisma.notification.deleteMany({
          where: { userId: validatedBody.userId }
        }),
        prisma.notificationPreference.deleteMany({
          where: { userId: validatedBody.userId }
        }),
        prisma.review.deleteMany({
          where: { 
            OR: [
              { reviewerId: validatedBody.userId },
              { revieweeId: validatedBody.userId }
            ]
          }
        }),
        prisma.offer.deleteMany({
          where: { 
            OR: [
              { companyId: targetUser.companyId },
              { talentProfileId: { in: { userId: validatedBody.userId } } }
            ]
          }
        }),
        prisma.engagement.deleteMany({
          where: { 
            OR: [
              { companyId: targetUser.companyId },
              { talentProfileId: { in: { userId: validatedBody.userId } } }
            ]
          }
        }),
        prisma.talentProfile.deleteMany({
          where: { userId: validatedBody.userId }
        }),
        prisma.talentRequest.deleteMany({
          where: { companyId: targetUser.companyId }
        }),
        // Delete user
        prisma.user.delete({
          where: { id: validatedBody.userId }
        })
      ])

      logger.info('User data deleted immediately', {
        adminId: user.id,
        deletedUserId: validatedBody.userId
      })

      return NextResponse.json({
        success: true,
        message: 'User data deleted successfully',
        deletedAt: new Date().toISOString()
      })
    } else {
      // Schedule deletion for 30 days
      const scheduledDeletionDate = new Date()
      scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30)

      await prisma.user.update({
        where: { id: validatedBody.userId },
        data: {
          scheduledDeletion: scheduledDeletionDate,
          status: 'pending_deletion'
        }
      })

      logger.info('User data scheduled for deletion', {
        adminId: user.id,
        deletedUserId: validatedBody.userId,
        scheduledDeletion: scheduledDeletionDate
      })

      return NextResponse.json({
        success: true,
        message: 'User data scheduled for deletion',
        scheduledDeletion: scheduledDeletionDate.toISOString()
      })
    }

  } catch (error) {
    logger.error('Failed to delete user data', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
