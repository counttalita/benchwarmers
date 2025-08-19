import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const resolveDisputeSchema = z.object({
  disputeId: z.string().min(1),
  resolution: z.enum(['refund_full', 'refund_partial', 'no_refund', 'continue_work']),
  adminNotes: z.string().min(1).max(2000),
  refundAmount: z.number().min(0).optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedBody = resolveDisputeSchema.parse(body)

    const dispute = await prisma.dispute.findUnique({
      where: { id: validatedBody.disputeId },
      include: { engagement: true }
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id: validatedBody.disputeId },
      data: {
        status: 'resolved',
        resolution: validatedBody.resolution,
        adminNotes: validatedBody.adminNotes,
        refundAmount: validatedBody.refundAmount,
        resolvedBy: user.id,
        resolvedAt: new Date()
      }
    })

    logger.info('Dispute resolved', { disputeId: dispute.id, adminId: user.id })

    return NextResponse.json({
      success: true,
      dispute: updatedDispute
    })

  } catch (error) {
    logger.error('Failed to resolve dispute', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
