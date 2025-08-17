import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { escrowPaymentService } from '@/lib/payments/escrow'
import { logger } from '@/lib/logger'

// POST /api/payments/process - Process payment and hold in escrow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { escrowPaymentId, paymentMethodId } = body

    if (!escrowPaymentId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Escrow payment ID and payment method ID are required' },
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

    if (escrowPayment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }

    // Process payment and hold in escrow
    const processedPayment = await escrowPaymentService.processPayment(
      escrowPaymentId,
      escrowPayment.engagement.seekerCompanyId,
      escrowPayment.engagement.providerCompanyId,
      paymentMethodId
    )

    logger.info('Payment processed and held in escrow', {
      escrowPaymentId,
      engagementId: escrowPayment.engagementId,
      amount: escrowPayment.amount,
    })

    return NextResponse.json({
      success: true,
      escrowPayment: processedPayment,
      message: 'Payment processed successfully',
    })

  } catch (error) {
    logger.error('Failed to process payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
