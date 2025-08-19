'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Receipt, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BillingRecord {
  id: string
  date: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  description: string
  invoiceUrl?: string
}

export default function BillingHistory() {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBillingHistory()
  }, [])

  const fetchBillingHistory = async () => {
    try {
      // This would fetch from /api/subscriptions/billing-history
      // For now, we'll use mock data
      const mockData: BillingRecord[] = [
        {
          id: '1',
          date: '2024-01-15',
          amount: 850,
          currency: 'ZAR',
          status: 'paid',
          description: 'Monthly Subscription - January 2024'
        },
        {
          id: '2',
          date: '2023-12-15',
          amount: 850,
          currency: 'ZAR',
          status: 'paid',
          description: 'Monthly Subscription - December 2023'
        },
        {
          id: '3',
          date: '2023-11-15',
          amount: 850,
          currency: 'ZAR',
          status: 'paid',
          description: 'Monthly Subscription - November 2023'
        }
      ]

      setBillingHistory(mockData)
    } catch (error) {
      console.error('Failed to fetch billing history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDownloadInvoice = (record: BillingRecord) => {
    // This would trigger invoice download
    console.log('Downloading invoice for:', record.id)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading billing history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>
          View your past subscription payments and invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {billingHistory.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No billing history available
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {billingHistory.map((record: any) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{record.description}</h4>
                    {getStatusBadge(record.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(record.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(record.amount, record.currency)}
                    </p>
                  </div>
                  {record.invoiceUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(record)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
