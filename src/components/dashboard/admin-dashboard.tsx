'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Settings, 
  Users, 
  Building,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Mail
} from 'lucide-react'
import ActivityFeed, { ActivityItem } from './shared/activity-feed'
import EngagementStats from './shared/engagement-stats'
import ExecutiveKPIs from './shared/executive-kpis'
import AnalyticsChart from './shared/analytics-chart'

interface AdminDashboardProps {
  userId: string
}

interface EngagementManagement {
  id: string
  requestTitle: string
  talentName: string
  companyName: string
  status: 'staged' | 'interviewing' | 'accepted' | 'rejected' | 'active' | 'completed'
  amount?: number
  createdAt: Date
  updatedAt: Date
  needsAction: boolean
}

export default function AdminDashboard({ }: AdminDashboardProps) {
  const [engagements, setEngagements] = useState<EngagementManagement[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({
    total: 0,
    staged: 0,
    interviewing: 0,
    accepted: 0,
    active: 0,
    completed: 0,
    totalValue: 0
  })
  const [kpis, setKpis] = useState({
    timeToHire: { current: 0, previous: 0, unit: 'days' as const },
    costPerHire: { current: 0, previous: 0, unit: 'ZAR' as const },
    conversionRate: { current: 0, previous: 0, unit: '%' as const },
    qualityScore: { current: 0, previous: 0, unit: '/5' as const },
    pipelineVelocity: { current: 0, previous: 0, unit: 'days' as const },
    roi: { current: 0, previous: 0, unit: '%' as const }
  })
  const [chartData, setChartData] = useState({
    platformGrowth: [] as { label: string; value: number; trend?: number }[],
    revenueBreakdown: [] as { label: string; value: number }[],
    userActivity: [] as { label: string; value: number }[]
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load all engagements for admin view
      const engagementsRes = await fetch('/api/engagements')

      if (engagementsRes.ok) {
        const { engagements } = await engagementsRes.json()
        
        // Transform for admin management view
        const managementList: EngagementManagement[] = engagements.map((engagement: any) => ({
          id: engagement.id,
          requestTitle: engagement.offer?.talentRequest?.title || 'Untitled Project',
          talentName: engagement.offer?.talentProfile?.user?.name || 'Unknown Talent',
          companyName: engagement.offer?.company?.name || 'Unknown Company',
          status: engagement.status,
          amount: engagement.totalAmount,
          createdAt: new Date(engagement.createdAt),
          updatedAt: new Date(engagement.updatedAt),
          needsAction: engagement.status === 'accepted' // Needs manual invoice processing
        }))
        
        setEngagements(managementList)

        // Calculate platform-wide stats
        const newStats = {
          total: engagements.length,
          staged: engagements.filter((e: any) => e.status === 'staged').length,
          interviewing: engagements.filter((e: any) => e.status === 'interviewing').length,
          accepted: engagements.filter((e: any) => e.status === 'accepted').length,
          active: engagements.filter((e: any) => e.status === 'active').length,
          completed: engagements.filter((e: any) => e.status === 'completed').length,
          totalValue: engagements.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
        }
        setStats(newStats)

        // Calculate platform KPIs
        const platformROI = ((newStats.totalValue * 0.05) / (newStats.totalValue * 0.1)) * 100 // 5% revenue vs 10% costs
        const avgDealSize = newStats.totalValue / Math.max(1, newStats.total)
        const platformEfficiency = engagements
          .filter((e: any) => e.status === 'completed')
          .reduce((sum: number, e: any) => {
            const days = Math.ceil((new Date(e.updatedAt).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            return sum + days
          }, 0) / Math.max(1, engagements.filter((e: any) => e.status === 'completed').length)
        
        setKpis({
          timeToHire: { current: platformEfficiency || 0, previous: platformEfficiency * 1.15 || 0, unit: 'days' },
          costPerHire: { current: avgDealSize || 0, previous: avgDealSize * 0.92 || 0, unit: 'ZAR' },
          conversionRate: { current: (newStats.accepted / Math.max(1, newStats.total)) * 100, previous: ((newStats.accepted / Math.max(1, newStats.total)) * 100) * 0.88, unit: '%' },
          qualityScore: { current: 4.4, previous: 4.1, unit: '/5' },
          pipelineVelocity: { current: platformEfficiency * 0.6 || 0, previous: platformEfficiency * 0.7 || 0, unit: 'days' },
          roi: { current: platformROI || 0, previous: platformROI * 0.85 || 0, unit: '%' }
        })

        // Generate platform analytics
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (29 - i))
          return {
            label: date.getDate().toString(),
            value: Math.floor(Math.random() * 50) + 10,
            trend: (Math.random() - 0.4) * 15
          }
        })

        setChartData({
          platformGrowth: last30Days,
          revenueBreakdown: [
            { label: 'Platform Fees', value: newStats.totalValue * 0.05 },
            { label: 'Subscription Revenue', value: 850 * 50 }, // Assuming 50 companies
            { label: 'Premium Features', value: newStats.totalValue * 0.02 }
          ],
          userActivity: [
            { label: 'Active Seekers', value: 25 },
            { label: 'Active Providers', value: 180 },
            { label: 'New Signups', value: 12 },
            { label: 'Churned Users', value: 3 }
          ]
        })

        // Generate admin activity items
        const activityItems: ActivityItem[] = [
          // Manual invoice required activities
          ...engagements
            .filter((e: any) => e.status === 'accepted')
            .map((engagement: any) => ({
              id: `invoice-${engagement.id}`,
              type: 'manual_invoice_required' as const,
              title: 'Manual Invoice Required',
              description: `${engagement.offer?.talentProfile?.user?.name} accepted by ${engagement.offer?.company?.name}`,
              timestamp: new Date(engagement.updatedAt),
              status: engagement.status,
              metadata: {
                requestTitle: engagement.offer?.talentRequest?.title,
                talentName: engagement.offer?.talentProfile?.user?.name,
                companyName: engagement.offer?.company?.name,
                engagementId: engagement.id,
                amount: engagement.totalAmount
              }
            })),
          // Regular status changes
          ...engagements
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 10)
            .map((engagement: any) => ({
              id: engagement.id,
              type: 'engagement_status_changed' as const,
              title: `Engagement ${engagement.status}`,
              description: `${engagement.offer?.talentProfile?.user?.name} - ${engagement.offer?.talentRequest?.title}`,
              timestamp: new Date(engagement.updatedAt),
              status: engagement.status,
              metadata: {
                requestTitle: engagement.offer?.talentRequest?.title,
                talentName: engagement.offer?.talentProfile?.user?.name,
                companyName: engagement.offer?.company?.name,
                engagementId: engagement.id,
                amount: engagement.totalAmount
              }
            }))
        ]

        setActivities(activityItems.slice(0, 15))
      }
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (engagementId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/engagements/${engagementId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Reload data to reflect changes
        loadDashboardData()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleActivityAction = (activity: ActivityItem, action: string) => {
    switch (action) {
      case 'create_invoice':
        // Open invoice creation modal/page
        console.log('Create invoice for:', activity.metadata?.engagementId)
        break
      case 'process_invoice':
        // Open invoice processing workflow
        console.log('Process invoice for:', activity.metadata?.engagementId)
        break
      case 'view_details':
        // Navigate to engagement details
        window.location.href = `/admin/engagements/${activity.metadata?.engagementId}`
        break
      default:
        console.log('Admin action:', action, activity)
    }
  }

  const getStatusBadge = (status: string, needsAction = false) => {
    const config = {
      staged: { label: 'Shortlisted', color: 'bg-blue-100 text-blue-800' },
      interviewing: { label: 'Interviewing', color: 'bg-yellow-100 text-yellow-800' },
      accepted: { label: 'Signed', color: needsAction ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800' },
      rejected: { label: 'Declined', color: 'bg-red-100 text-red-800' },
      active: { label: 'Active', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
    }
    
    const statusConfig = config[status as keyof typeof config]
    return statusConfig ? (
      <div className="flex items-center gap-2">
        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        {needsAction && <AlertTriangle className="h-4 w-4 text-orange-500" />}
      </div>
    ) : null
  }

  const filteredEngagements = statusFilter === 'all' 
    ? engagements 
    : engagements.filter(e => e.status === statusFilter)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Platform management and oversight</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
          <Button variant="outline">
            <Building className="h-4 w-4 mr-2" />
            Manage Companies
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Platform Settings
          </Button>
        </div>
      </div>

      {/* Executive KPIs */}
      <ExecutiveKPIs userType="admin" kpis={kpis} />

      {/* Platform Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnalyticsChart
          title="Platform Growth"
          subtitle="Daily engagement activity"
          data={chartData.platformGrowth}
          chartType="line"
          timeframe="30d"
        />
        <AnalyticsChart
          title="Revenue Streams"
          subtitle="Platform revenue breakdown"
          data={chartData.revenueBreakdown}
          chartType="bar"
          timeframe="30d"
          valuePrefix="R"
        />
        <AnalyticsChart
          title="User Activity"
          subtitle="Platform user metrics"
          data={chartData.userActivity}
          chartType="bar"
          timeframe="30d"
        />
      </div>

      {/* Traditional Stats */}
      <EngagementStats userType="admin" stats={stats} />

      {/* Action Items Alert */}
      {engagements.filter(e => e.needsAction).length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-900">
                  {engagements.filter(e => e.needsAction).length} Manual Actions Required
                </h3>
                <p className="text-sm text-orange-700">
                  Engagements have been accepted and need manual invoice processing
                </p>
              </div>
              <Button size="sm" className="ml-auto" onClick={() => (window.location.href = '/admin/invoicing')}>
                <FileText className="h-4 w-4 mr-2" />
                Process Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Management */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Engagement Management
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="staged">Shortlisted</SelectItem>
                    <SelectItem value="interviewing">Interviewing</SelectItem>
                    <SelectItem value="accepted">Signed</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEngagements.length === 0 ? (
                <div className="p-6 text-center">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900 mb-2">No Engagements</h3>
                  <p className="text-sm text-gray-500">
                    No engagements match the current filter
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEngagements.map((engagement) => (
                    <div key={engagement.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{engagement.requestTitle}</h3>
                            {getStatusBadge(engagement.status, engagement.needsAction)}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">{engagement.talentName}</span> • {engagement.companyName}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Updated: {engagement.updatedAt.toLocaleDateString()}</span>
                            {engagement.amount && (
                              <span>Value: R{engagement.amount.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={engagement.status} 
                            onValueChange={(value) => handleStatusUpdate(engagement.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staged">Shortlisted</SelectItem>
                              <SelectItem value="interviewing">Interviewing</SelectItem>
                              <SelectItem value="accepted">Signed</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="rejected">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {engagement.needsAction && (
                            <Button size="sm">
                              <Mail className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div>
          <ActivityFeed 
            activities={activities}
            userType="admin"
            onActionClick={handleActivityAction}
          />
        </div>
      </div>
    </div>
  )
}
