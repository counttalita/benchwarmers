import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/payments/transactions'
import { logger } from '@/lib/logger'

// GET /api/payments/receipts - Generate payment receipt
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const escrowPaymentId = searchParams.get('escrowPaymentId')

    if (!escrowPaymentId) {
      return NextResponse.json(
        { error: 'Escrow payment ID is required' },
        { status: 400 }
      )
    }

    const receipt = await transactionService.generateReceipt(escrowPaymentId)

    return NextResponse.json({
      success: true,
      receipt,
    })

  } catch (error) {
    logger.error('Failed to generate receipt', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    )
  }
}
