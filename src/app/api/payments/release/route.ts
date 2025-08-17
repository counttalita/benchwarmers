import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { escrowPaymentService } from '@/lib/payments/escrow'
import { logger } from '@/lib/logger'

// POST /api/payments/release - Release payment to provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { escrowPaymentId, userId } = body

    if (!escrowPaymentId || !userId) {
      return NextResponse.json(
        { error: 'Escrow payment ID and user ID are required' },
        { status: 400 }
      )
    }

    // Get escrow payment with engagement details
    const escrowPayment = await prisma.escrowPayment.findUnique({
      where: { id: escrowPaymentId },
      include: {
        engagement: {
          include: {
            seekerCompany: true,
            providerCompany: true,
            participants: true,
          },
        },
      },
    })

    if (!escrowPayment) {
      return NextResponse.json(
        { error: 'Escrow payment not found' },
        { status: 404 }
      )
    }

    if (escrowPayment.status !== 'held') {
      return NextResponse.json(
        { error: 'Payment not held in escrow' },
        { status: 400 }
      )
    }

    // Check if user is authorized to release payment
    const isSeekerParticipant = escrowPayment.engagement.participants.some(
      p => p.userId === userId && p.role === 'seeker'
    )

    if (!isSeekerParticipant) {
      return NextResponse.json(
        { error: 'Only the seeker can release payment' },
        { status: 403 }
      )
    }

    // Check if engagement is completed
    if (escrowPayment.engagement.status !== 'completed') {
      return NextResponse.json(
        { error: 'Engagement must be completed to release payment' },
        { status: 400 }
      )
    }

    // Release payment to provider
    const releasedPayment = await escrowPaymentService.releasePayment(escrowPaymentId)

    // Update engagement payment status
    await prisma.engagement.update({
      where: { id: escrowPayment.engagementId },
      data: {
        paymentStatus: 'released',
        updatedAt: new Date(),
      },
    })

    logger.info('Payment released to provider', {
      escrowPaymentId,
      engagementId: escrowPayment.engagementId,
      providerAmount: escrowPayment.providerAmount,
      platformFee: escrowPayment.platformFee,
      releasedBy: userId,
    })

    return NextResponse.json({
      success: true,
      escrowPayment: releasedPayment,
      message: 'Payment released successfully',
    })

  } catch (error) {
    logger.error('Failed to release payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to release payment' },
      { status: 500 }
    )
  }
}
