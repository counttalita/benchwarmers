'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, TrendingUp, CheckCircle, AlertTriangle, FileText,
  Download, Filter, RefreshCw, DollarSign, Building2,
  UserCheck, Clock, BarChart3, Settings, Shield,
  MessageSquare, Calendar, Zap, Target, Activity
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  users: {
    total: number
    active: number
    pending: number
    verified: number
  }
  companies: {
    total: number
    providers: number
    seekers: number
    pending: number
    verified: number
  }
  engagements: {
    total: number
    staged: number
    interviewing: number
    accepted: number
    active: number
    completed: number
    rejected: number
    terminated: number
    disputed: number
  }
  payments: {
    total: number
    pending: number
    completed: number
    failed: number
    revenue: number
    facilitationFees: number
  }
  subscriptions: {
    total: number
    active: number
    cancelled: number
    revenue: number
  }
  matches: {
    total: number
    pending: number
    accepted: number
    rejected: number
    successRate: number
  }
  system: {
    uptime: number
    errorRate: number
    responseTime: number
    activeUsers: number
  }
}

interface RecentActivity {
  id: string
  type: 'engagement_created' | 'payment_received' | 'user_registered' | 'company_verified' | 'interview_scheduled' | 'subscription_cancelled'
  title: string
  description: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || null)
        setRecentActivity(data.recentActivity || [])
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'engagement_created': return <FileText className="h-4 w-4" />
      case 'payment_received': return <DollarSign className="h-4 w-4" />
      case 'user_registered': return <UserCheck className="h-4 w-4" />
      case 'company_verified': return <Building2 className="h-4 w-4" />
      case 'interview_scheduled': return <Calendar className="h-4 w-4" />
      case 'subscription_cancelled': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage the Benchwarmers marketplace</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.users.active || 0} active, {stats?.users.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.companies.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.companies.providers || 0} providers, {stats?.companies.seekers || 0} seekers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Engagements</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.engagements.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.engagements.total || 0} total engagements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{stats?.payments.revenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              R{stats?.payments.facilitationFees?.toLocaleString() || 0} in fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Engagement Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Staged</span>
              <Badge variant="secondary">{stats?.engagements.staged || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Interviewing</span>
              <Badge variant="outline">{stats?.engagements.interviewing || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Accepted</span>
              <Badge variant="default">{stats?.engagements.accepted || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Active</span>
              <Badge variant="default">{stats?.engagements.active || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Completed</span>
              <Badge variant="secondary">{stats?.engagements.completed || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Disputed</span>
              <Badge variant="destructive">{stats?.engagements.disputed || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Uptime</span>
                <span>{stats?.system.uptime || 0}%</span>
              </div>
              <Progress value={stats?.system.uptime || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Error Rate</span>
                <span>{stats?.system.errorRate || 0}%</span>
              </div>
              <Progress value={100 - (stats?.system.errorRate || 0)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Response Time</span>
                <span>{stats?.system.responseTime || 0}ms</span>
              </div>
              <Progress value={Math.max(0, 100 - (stats?.system.responseTime || 0) / 10)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Active Users</span>
                <span>{stats?.system.activeUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/engagements">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <FileText className="h-6 w-6 mb-2" />
                Manage Engagements
              </Button>
            </Link>
            <Link href="/admin/companies">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Building2 className="h-6 w-6 mb-2" />
                Manage Companies
              </Button>
            </Link>
            <Link href="/admin/invoicing">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <DollarSign className="h-6 w-6 mb-2" />
                Invoicing
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Users className="h-6 w-6 mb-2" />
                User Management
              </Button>
            </Link>
            <Link href="/admin/payments">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                Payment Analytics
              </Button>
            </Link>
            <Link href="/admin/notifications">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <MessageSquare className="h-6 w-6 mb-2" />
                Notifications
              </Button>
            </Link>
            <Link href="/admin/security">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Shield className="h-6 w-6 mb-2" />
                Security
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Settings className="h-6 w-6 mb-2" />
                System Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{activity.title}</h4>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
