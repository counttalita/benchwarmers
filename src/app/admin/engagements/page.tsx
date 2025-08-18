'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, TrendingUp, CheckCircle, AlertTriangle, FileText,
  Download, Filter, RefreshCw
} from 'lucide-react'
import EngagementList from '@/components/engagements/engagement-list'

interface EngagementStats {
  total: number
  staged: number
  interviewing: number
  accepted: number
  active: number
  completed: number
  rejected: number
  terminated: number
  disputed: number
  needsInvoice: number
}

interface Engagement {
  id: string
  status: 'staged' | 'interviewing' | 'accepted' | 'rejected' | 'active' | 'completed' | 'terminated' | 'disputed'
  createdAt: string
  updatedAt: string
  talentRequest: {
    id: string
    title: string
    company: {
      id: string
      name: string
    }
  }
  talentProfile: {
    id: string
    name: string
    title: string
    company: {
      id: string
      name: string
    }
  }
  interviewDetails?: {
    interviewDate?: string
    interviewDuration?: number
    interviewerName?: string
    interviewType?: 'phone' | 'video' | 'in_person'
    interviewLocation?: string
    interviewNotes?: string
  }
  totalAmount?: number
  facilitationFee?: number
  netAmount?: number
}

export default function AdminEngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [stats, setStats] = useState<EngagementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadEngagements()
  }, [])

  const loadEngagements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/engagements')
      if (response.ok) {
        const data = await response.json()
        setEngagements(data.engagements || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load engagements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEngagements()
    setRefreshing(false)
  }

  const handleStatusUpdate = async (engagementId: string, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/engagements/${engagementId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      })
      
      if (response.ok) {
        await loadEngagements() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update engagement status:', error)
    }
  }

  const handleViewDetails = (engagementId: string) => {
    window.location.href = `/admin/engagements/${engagementId}`
  }

  const handleBulkAction = async (engagementIds: string[], action: string) => {
    try {
      switch (action) {
        case 'export':
          // Export functionality
          console.log('Exporting engagements:', engagementIds)
          break
        case 'process_invoices':
          // Redirect to invoicing page
          window.location.href = '/admin/invoicing'
          break
        default:
          console.log('Unknown bulk action:', action)
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading engagements...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Engagement Management</h1>
          <p className="text-gray-600">Monitor and manage all platform engagements</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/admin/invoicing'}
          >
            <FileText className="h-4 w-4 mr-2" />
            Manual Invoicing
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Across all statuses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Pipeline</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.staged + stats.interviewing}</div>
              <p className="text-xs text-muted-foreground">
                {stats.staged} shortlisted, {stats.interviewing} interviewing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted + stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.accepted} accepted, {stats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Invoice</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.needsInvoice}</div>
              <p className="text-xs text-muted-foreground">
                Require manual processing
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.staged}</div>
                <div className="text-xs text-gray-600">Shortlisted</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{stats.interviewing}</div>
                <div className="text-xs text-gray-600">Interviewing</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.accepted}</div>
                <div className="text-xs text-gray-600">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{stats.active}</div>
                <div className="text-xs text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">{stats.completed}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{stats.rejected}</div>
                <div className="text-xs text-gray-600">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{stats.terminated}</div>
                <div className="text-xs text-gray-600">Terminated</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{stats.disputed}</div>
                <div className="text-xs text-gray-600">Disputed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagements List */}
      <EngagementList
        engagements={engagements}
        userType="admin"
        onStatusUpdate={handleStatusUpdate}
        onViewDetails={handleViewDetails}
        showFilters={true}
        showBulkActions={true}
        onBulkAction={handleBulkAction}
      />
    </div>
  )
}
