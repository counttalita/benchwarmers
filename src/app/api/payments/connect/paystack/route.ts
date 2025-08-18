import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { paymentManager } from '@/lib/payments/payment-manager'
import logger from '@/lib/logger'

// POST /api/payments/connect/paystack - Create Paystack subaccount for company
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const companyId = request.headers.get('x-company-id')

    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (company.stripeAccountId) {
      return NextResponse.json(
        { error: 'Company already has payment account setup' },
        { status: 400 }
      )
    }

    // Create Paystack subaccount (mock implementation)
    const subaccount = {
      id: `ACCT_${Date.now()}`,
      subaccount_code: `ACCT_${companyId}_${Date.now()}`,
      business_name: company.name,
      settlement_bank: 'test-bank',
      account_number: '0123456789',
      percentage_charge: 5.0
    }

    // Update company with Paystack account ID
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeAccountId: subaccount.subaccount_code // Reusing field for Paystack
      }
    })

    logger.info('Paystack subaccount created', {
      companyId,
      subaccountCode: subaccount.subaccount_code
    })

    return NextResponse.json({
      success: true,
      account: {
        id: subaccount.subaccount_code,
        business_name: subaccount.business_name,
        charges_enabled: true,
        details_submitted: true
      },
      onboarding: {
        onboardingUrl: `https://paystack.com/onboard/${subaccount.subaccount_code}`,
        completed: true
      }
    })

  } catch (error) {
    logger.error('Failed to create Paystack subaccount', error as Error)
    return NextResponse.json(
      { error: 'Failed to create payment account' },
      { status: 500 }
    )
  }
}

// GET /api/payments/connect/paystack - Get Paystack account status
export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (!company.stripeAccountId) {
      return NextResponse.json({
        hasAccount: false,
        status: 'not_setup'
      })
    }

    // Mock Paystack account status
    return NextResponse.json({
      hasAccount: true,
      account: {
        id: company.stripeAccountId,
        charges_enabled: true,
        details_submitted: true,
        payouts_enabled: true
      },
      status: 'active'
    })

  } catch (error) {
    logger.error('Failed to get Paystack account status', error as Error)
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    )
  }
}
