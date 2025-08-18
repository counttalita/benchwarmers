import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/payments/subscription-service'
import { getCurrentUser } from '@/lib/auth'

// POST /api/subscriptions/cancel - Cancel subscription
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await subscriptionService.cancelSubscription(user.id)

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
