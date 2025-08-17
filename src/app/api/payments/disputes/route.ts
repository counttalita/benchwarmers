import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/payments/transactions'
import { logger } from '@/lib/logger'

// POST /api/payments/disputes - Create dispute
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { escrowPaymentId, reason, description, evidence, raisedBy } = body

    if (!escrowPaymentId || !reason || !description || !raisedBy) {
      return NextResponse.json(
        { error: 'Escrow payment ID, reason, description, and raised by are required' },
        { status: 400 }
      )
    }

    const dispute = await transactionService.createDispute(
      escrowPaymentId,
      reason,
      description,
      evidence || [],
      raisedBy
    )

    return NextResponse.json({
      success: true,
      dispute,
      message: 'Dispute created successfully',
    })

  } catch (error) {
    logger.error('Failed to create dispute', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    )
  }
}

// PUT /api/payments/disputes - Resolve dispute
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { disputeId, resolution, amount, reason } = body

    if (!disputeId || !resolution || !reason) {
      return NextResponse.json(
        { error: 'Dispute ID, resolution, and reason are required' },
        { status: 400 }
      )
    }

    const result = await transactionService.resolveDispute(
      disputeId,
      resolution,
      amount,
      reason
    )

    return NextResponse.json({
      success: true,
      result,
      message: 'Dispute resolved successfully',
    })

  } catch (error) {
    logger.error('Failed to resolve dispute', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to resolve dispute' },
      { status: 500 }
    )
  }
}
