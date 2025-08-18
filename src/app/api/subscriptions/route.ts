import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/payments/subscription-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createSubscriptionSchema = z.object({
  planType: z.enum(['monthly', 'yearly']),
  startDate: z.string().optional()
})

// POST /api/subscriptions - Create subscription
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = createSubscriptionSchema.parse(body)

    const subscription = await subscriptionService.createSubscription({
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      planType: validatedBody.planType,
      startDate: validatedBody.startDate ? new Date(validatedBody.startDate) : undefined
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        amount: subscription.amount,
        currency: subscription.currency,
        status: subscription.status,
        nextBillingDate: subscription.nextBillingDate
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

// GET /api/subscriptions - Get subscription status
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const status = await subscriptionService.getSubscriptionStatus(user.id)

    return NextResponse.json({
      success: true,
      subscription: status
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}
