import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { escrowPaymentService } from '@/lib/payments/escrow'
import logger from '@/lib/logger'

// POST /api/payments/escrow - Create escrow payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { engagementId, amount, currency = 'USD' } = body

    if (!engagementId || !amount) {
      return NextResponse.json(
        { error: 'Engagement ID and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get engagement details
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        seekerCompany: true,
        providerCompany: true,
      },
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    if (engagement.status !== 'active') {
      return NextResponse.json(
        { error: 'Engagement is not in active status' },
        { status: 400 }
      )
    }

    // Check if provider has Connect account set up
    if (!engagement.providerCompany.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Provider not set up for payments' },
        { status: 400 }
      )
    }

    // Calculate payment breakdown
    const breakdown = escrowPaymentService.calculatePaymentBreakdown(amount, currency)

    // Create escrow payment
    const escrowPayment = await escrowPaymentService.createEscrowPayment(engagementId, amount, currency)

    logger.info('Escrow payment created', {
      escrowPaymentId: escrowPayment.id,
      engagementId,
      amount,
      platformFee: breakdown.platformFee,
      providerAmount: breakdown.providerAmount,
    })

    return NextResponse.json({
      success: true,
      escrowPayment,
      breakdown,
      message: 'Escrow payment created successfully',
    })

  } catch (error) {
    logger.error('Failed to create escrow payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create escrow payment' },
      { status: 500 }
    )
  }
}

// GET /api/payments/escrow - Get escrow payments for engagement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const engagementId = searchParams.get('engagementId')

    if (!engagementId) {
      return NextResponse.json(
        { error: 'Engagement ID is required' },
        { status: 400 }
      )
    }

    // Get escrow payments for engagement
    const escrowPayments = await escrowPaymentService.getEscrowPaymentsByEngagement(engagementId)

    return NextResponse.json({
      success: true,
      escrowPayments,
    })

  } catch (error) {
    logger.error('Failed to get escrow payments', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to get escrow payments' },
      { status: 500 }
    )
  }
}
