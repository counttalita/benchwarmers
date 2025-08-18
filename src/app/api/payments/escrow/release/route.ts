import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { escrowPaymentService } from '@/lib/payments/escrow'
import logger from '@/lib/logger'

// POST /api/payments/escrow/release - Release payment to provider
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const companyId = request.headers.get('x-company-id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { escrowPaymentId } = body

    if (!escrowPaymentId) {
      return NextResponse.json(
        { error: 'Escrow payment ID is required' },
        { status: 400 }
      )
    }

    // Get escrow payment
    const escrowPayment = await prisma.escrowPayment.findUnique({
      where: { id: escrowPaymentId },
      include: {
        engagement: {
          include: {
            seekerCompany: true,
            providerCompany: true
          }
        }
      }
    })

    if (!escrowPayment) {
      return NextResponse.json(
        { error: 'Escrow payment not found' },
        { status: 404 }
      )
    }

    // Check authorization - only seeker can release payment
    if (!companyId || escrowPayment.engagement.seekerCompanyId !== companyId) {
      return NextResponse.json(
        { error: 'Only the seeker can release payment' },
        { status: 403 }
      )
    }

    // Check engagement is completed
    if (escrowPayment.engagement.status !== 'completed') {
      return NextResponse.json(
        { error: 'Engagement must be completed to release payment' },
        { status: 400 }
      )
    }

    if (escrowPayment.status !== 'held') {
      return NextResponse.json(
        { error: 'Payment is not in held status' },
        { status: 400 }
      )
    }

    // Release payment through escrow service
    const releasedPayment = await escrowPaymentService.releasePayment(
      escrowPaymentId,
      escrowPayment.engagement.providerCompany.stripeConnectAccountId!
    )

    logger.info('Escrow payment released successfully', {
      escrowPaymentId,
      transferId: releasedPayment.transferId,
      amount: releasedPayment.amount
    })

    return NextResponse.json({
      success: true,
      escrowPayment: releasedPayment,
      message: 'Payment released successfully'
    })

  } catch (error) {
    logger.error('Failed to release escrow payment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to release payment' },
      { status: 500 }
    )
  }
}
