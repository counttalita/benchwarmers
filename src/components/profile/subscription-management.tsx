'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionStatus {
  isActive: boolean
  currentPlan?: string
  nextBillingDate?: Date
  amount?: number
  currency?: string
}

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscriptions')
      const data = await response.json()

      if (data.success) {
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error)
      toast.error('Failed to load subscription status')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubscription = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planType: 'monthly'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Subscription created successfully!')
        await fetchSubscriptionStatus() // Refresh status
      } else {
        toast.error(data.error || 'Failed to create subscription')
      }
    } catch (error) {
      console.error('Failed to create subscription:', error)
      toast.error('Failed to create subscription')
    } finally {
      setCreating(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Subscription cancelled successfully')
        await fetchSubscriptionStatus() // Refresh status
      } else {
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      toast.error('Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount || !currency) return 'N/A'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading subscription status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription?.isActive ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="default" className="mb-2">
                  Active
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {subscription.currentPlan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Next billing: {formatDate(subscription.nextBillingDate?.toString())}
              </span>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cancelling your subscription will stop automatic renewals. You'll continue to have access until the end of your current billing period.
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="w-full"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Subscribe to unlock premium features and connect with top talent
            </p>
            
            <div className="bg-muted p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Monthly Subscription</span>
                <span className="font-semibold">R850/month</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Access to premium talent pool
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Advanced matching algorithms
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Priority customer support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Analytics and insights
                </li>
              </ul>
            </div>

            <Button
              onClick={handleCreateSubscription}
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Subscription...
                </>
              ) : (
                'Subscribe Now - R850/month'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
