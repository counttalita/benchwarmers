'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, 
  RefreshCw, Download, Filter, Calendar, BarChart3,
  Users, Building2, Activity, AlertTriangle, CheckCircle
} from 'lucide-react'

interface PaymentStats {
  total: number
  pending: number
  completed: number
  failed: number
  revenue: number
  facilitationFees: number
  averageTransaction: number
  successRate: number
}

interface SubscriptionStats {
  total: number
  active: number
  cancelled: number
  revenue: number
  averageRevenue: number
  churnRate: number
}

interface Transaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  type: 'subscription' | 'transaction' | 'transfer' | 'escrow'
  reason: string
  paystackPaymentId: string
  processedAt: string
  createdAt: string
  user: {
    name: string
    email: string
  }
  company: {
    name: string
    type: string
  }
}

interface RevenueData {
  date: string
  revenue: number
  transactions: number
  fees: number
}

export default function AdminPaymentsPage() {
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadPaymentData()
  }, [timeRange])

  const loadPaymentData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/payments?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentStats(data.paymentStats || null)
        setSubscriptionStats(data.subscriptionStats || null)
        setTransactions(data.transactions || [])
        setRevenueData(data.revenueData || [])
      }
    } catch (error) {
      console.error('Failed to load payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/payments/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payments-${timeRange}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return <CreditCard className="h-4 w-4" />
      case 'transaction': return <DollarSign className="h-4 w-4" />
      case 'transfer': return <TrendingUp className="h-4 w-4" />
      case 'escrow': return <Activity className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Analytics</h1>
          <p className="text-gray-600 mt-2">Monitor financial performance and transactions</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadPaymentData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{paymentStats?.revenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              R{paymentStats?.facilitationFees?.toLocaleString() || 0} in fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {paymentStats?.successRate || 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              R{paymentStats?.averageTransaction?.toLocaleString() || 0} avg transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              R{subscriptionStats?.revenue?.toLocaleString() || 0} monthly revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Payment Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Completed</span>
              <div className="flex items-center gap-2">
                <Progress value={paymentStats ? (paymentStats.completed / paymentStats.total) * 100 : 0} className="w-20" />
                <Badge variant="default">{paymentStats?.completed || 0}</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Pending</span>
              <div className="flex items-center gap-2">
                <Progress value={paymentStats ? (paymentStats.pending / paymentStats.total) * 100 : 0} className="w-20" />
                <Badge variant="outline">{paymentStats?.pending || 0}</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Failed</span>
              <div className="flex items-center gap-2">
                <Progress value={paymentStats ? (paymentStats.failed / paymentStats.total) * 100 : 0} className="w-20" />
                <Badge variant="destructive">{paymentStats?.failed || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Subscription Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Active Subscriptions</span>
              <Badge variant="default">{subscriptionStats?.active || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Cancelled</span>
              <Badge variant="secondary">{subscriptionStats?.cancelled || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Churn Rate</span>
              <span className="text-sm">{subscriptionStats?.churnRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Average Revenue</span>
              <span className="text-sm">R{subscriptionStats?.averageRevenue?.toLocaleString() || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {revenueData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-primary rounded-t w-full"
                  style={{ 
                    height: `${Math.max(10, (data.revenue / Math.max(...revenueData.map(d => d.revenue))) * 200)}px` 
                  }}
                ></div>
                <div className="text-xs text-gray-600 mt-2">
                  {new Date(data.date).toLocaleDateString()}
                </div>
                <div className="text-xs font-medium">
                  R{data.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Transaction</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <div>
                          <div className="font-medium">{transaction.type}</div>
                          <div className="text-sm text-gray-600">{transaction.reason}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{transaction.user.name}</div>
                        <div className="text-sm text-gray-600">{transaction.user.email}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{transaction.company.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {transaction.company.type}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="font-medium">
                        R{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transaction.currency}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="text-sm text-gray-600">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
