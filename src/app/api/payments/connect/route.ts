import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripeConnectService } from '@/lib/stripe/connect'
import { logger } from '@/lib/logger'

// POST /api/payments/connect - Create Stripe Connect account
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

    // Create Stripe Connect account
    const connectAccount = await stripeConnectService.createConnectAccount(companyId, {
      name: company.name,
      email: company.users[0]?.email || company.email,
      country: company.country || 'US',
      business_type: businessType as 'individual' | 'company',
    })

    // Update company with Connect account ID
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeConnectAccountId: connectAccount.id,
        stripeConnectStatus: 'pending',
        updatedAt: new Date(),
      },
    })

    // Create onboarding link
    const onboarding = await stripeConnectService.createOnboardingLink(connectAccount.id, companyId)

    logger.info('Stripe Connect account created for company', {
      companyId,
      accountId: connectAccount.id,
      businessType,
    })

    return NextResponse.json({
      success: true,
      account: connectAccount,
      onboarding,
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

    // Get account status from Stripe
    const accountStatus = await stripeConnectService.getAccountStatus(company.stripeConnectAccountId)

    return NextResponse.json({
      success: true,
      hasAccount: true,
      account: accountStatus,
      status: company.stripeConnectStatus,
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
