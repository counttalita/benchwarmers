import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/payments/transactions'
import logger from '@/lib/logger'

// GET /api/payments/transactions - Get transactions for company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const engagementId = searchParams.get('engagementId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!companyId && !engagementId) {
      return NextResponse.json(
        { error: 'Company ID or Engagement ID is required' },
        { status: 400 }
      )
    }

    let transactions

    if (engagementId) {
      transactions = await transactionService.getTransactionsByEngagement(engagementId)
    } else {
      transactions = await transactionService.getTransactionsByCompany(companyId!)
    }

    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type)
    }

    if (status) {
      transactions = transactions.filter(t => t.status === status)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    const paginatedTransactions = transactions.slice(offset, offset + limit)
    const totalCount = transactions.length
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

  } catch (error) {
    logger.error('Failed to get transactions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}

// POST /api/payments/transactions - Create transaction record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, currency, description, metadata } = body

    if (!type || !amount || !currency || !description) {
      return NextResponse.json(
        { error: 'Type, amount, currency, and description are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const transaction = await transactionService.createTransaction(
      type,
      amount,
      currency,
      description,
      metadata
    )

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction created successfully',
    })

  } catch (error) {
    logger.error('Failed to create transaction', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
