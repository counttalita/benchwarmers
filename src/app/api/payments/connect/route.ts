import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { paymentManager } from '@/lib/payments/payment-manager'
import logger from '@/lib/logger'

// POST /api/payments/connect - Create Paystack subaccount for company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, businessType = 'company' } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { take: 1 } },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if company already has a Connect account
    if (company.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Company already has a payment account' },
        { status: 409 }
      )
    }

    // Create Paystack subaccount (mock implementation)
    const account = {
      id: `ACCT_${Date.now()}`,
      subaccount_code: `ACCT_${companyId}_${Date.now()}`,
      business_name: company.name,
      settlement_bank: 'test-bank',
      account_number: '0123456789',
      percentage_charge: 5.0
    }

    // Update company with Connect account ID
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeConnectAccountId: account.subaccount_code,
        updatedAt: new Date(),
      },
    })

    // Generate onboarding link (mock)
    const onboardingLink = {
      url: `https://paystack.com/onboard/${account.subaccount_code}`,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }

    logger.info('Paystack subaccount created for company', {
      companyId,
      accountId: account.subaccount_code,
      businessType,
    })

    return NextResponse.json({
      success: true,
      account: account,
      onboarding: onboardingLink,
      message: 'Payment account created successfully',
    })

  } catch (error) {
    logger.error('Failed to create Stripe Connect account', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create payment account' },
      { status: 500 }
    )
  }
}

// GET /api/payments/connect - Get Connect account status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Get company with Connect account
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (!company.stripeConnectAccountId) {
      return NextResponse.json({
        success: true,
        hasAccount: false,
        status: 'not_setup',
      })
    }

    // Mock account status for Paystack
    const accountStatus = {
      id: company.stripeConnectAccountId,
      charges_enabled: true,
      details_submitted: true,
      payouts_enabled: true
    }

    return NextResponse.json({
      success: true,
      hasAccount: true,
      account: accountStatus,
      status: 'active',
    })

  } catch (error) {
    logger.error('Failed to get Connect account status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    )
  }
}
