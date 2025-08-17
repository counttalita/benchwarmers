import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const deleteUserDataSchema = z.object({
  userId: z.string().uuid(),
  reason: z.enum(['user-request', 'legal-requirement', 'account-deletion']),
  deleteImmediately: z.boolean().optional().default(false)
})

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete user data
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = deleteUserDataSchema.parse(body)

    const { userId, reason, deleteImmediately } = validatedData

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        talentProfiles: true,
        company: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (deleteImmediately) {
      // Immediate deletion (for legal requirements)
      await prisma.$transaction(async (tx) => {
        // Delete all user-related data
        await tx.timeEntry.deleteMany({
          where: { userId }
        })

        await tx.review.deleteMany({
          where: { userId }
        })

        await tx.milestone.deleteMany({
          where: {
            engagement: {
              OR: [
                { companyId: targetUser.companyId },
                { talentProfileId: { in: targetUser.talentProfiles.map(p => p.id) } }
              ]
            }
          }
        })

        await tx.engagement.deleteMany({
          where: {
            OR: [
              { companyId: targetUser.companyId },
              { talentProfileId: { in: targetUser.talentProfiles.map(p => p.id) } }
            ]
          }
        })

        await tx.offer.deleteMany({
          where: {
            OR: [
              { companyId: targetUser.companyId },
              { talentProfileId: { in: targetUser.talentProfiles.map(p => p.id) } }
            ]
          }
        })

        await tx.talentRequest.deleteMany({
          where: { companyId: targetUser.companyId }
        })

        await tx.talentProfile.deleteMany({
          where: { userId }
        })

        await tx.transaction.deleteMany({
          where: {
            OR: [
              { companyId: targetUser.companyId },
              { talentProfileId: { in: targetUser.talentProfiles.map(p => p.id) } }
            ]
          }
        })

        await tx.dispute.deleteMany({
          where: {
            engagement: {
              OR: [
                { companyId: targetUser.companyId },
                { talentProfileId: { in: targetUser.talentProfiles.map(p => p.id) } }
              ]
            }
          }
        })

        // Delete company if user owns it
        if (targetUser.company) {
          await tx.company.delete({
            where: { id: targetUser.companyId! }
          })
        }

        // Finally delete the user
        await tx.user.delete({
          where: { id: userId }
        })
      })

      logger.info('User data deleted immediately', { 
        adminUserId: user.id, 
        targetUserId: userId, 
        reason 
      })

      return NextResponse.json({
        success: true,
        message: 'User data deleted immediately',
        deletedAt: new Date().toISOString()
      })

    } else {
      // Schedule deletion for 30 days (GDPR compliance)
      const deletionDate = new Date()
      deletionDate.setDate(deletionDate.getDate() + 30)

      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          scheduledDeletionAt: deletionDate,
          deletionReason: reason
        }
      })

      logger.info('User data deletion scheduled', { 
        adminUserId: user.id, 
        targetUserId: userId, 
        reason,
        deletionDate 
      })

      return NextResponse.json({
        success: true,
        message: 'User data deletion scheduled for 30 days',
        scheduledDeletionAt: deletionDate.toISOString()
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to delete user data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
