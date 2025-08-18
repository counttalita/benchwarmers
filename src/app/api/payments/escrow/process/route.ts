import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { escrowPaymentService } from '@/lib/payments/escrow'
import logger from '@/lib/logger'

// POST /api/payments/escrow/process - Process payment and hold in escrow
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
    const { escrowPaymentId, paymentMethodId } = body

    if (!escrowPaymentId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Escrow payment ID and payment method ID are required' },
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

    if (escrowPayment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }

    // Process payment through escrow service
    const processedPayment = await escrowPaymentService.processPayment(
      escrowPaymentId,
      escrowPayment.engagement.seekerCompanyId,
      escrowPayment.engagement.providerCompanyId,
      paymentMethodId
    )

    logger.info('Escrow payment processed successfully', {
      escrowPaymentId,
      paymentIntentId: processedPayment.paymentIntentId,
      amount: processedPayment.amount
    })

    return NextResponse.json({
      success: true,
      escrowPayment: processedPayment,
      message: 'Payment processed successfully'
    })

  } catch (error) {
    logger.error('Failed to process escrow payment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
