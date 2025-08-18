'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter,
  Eye,
  MessageCircle,
  Calendar,
  Star,
  Briefcase,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import ActivityFeed, { ActivityItem } from './shared/activity-feed'
import EngagementStats from './shared/engagement-stats'

interface ProviderDashboardProps {
  talentProfileId: string
}

interface OpportunitySummary {
  id: string
  title: string
  companyName: string
  status: 'staged' | 'interviewing' | 'accepted' | 'rejected' | 'active' | 'completed'
  budget?: number
  createdAt: Date
  updatedAt: Date
}

export default function ProviderDashboard({ talentProfileId }: ProviderDashboardProps) {
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({
    total: 0,
    staged: 0,
    interviewing: 0,
    accepted: 0,
    active: 0,
    completed: 0,
    totalValue: 0,
    averageRating: 4.8
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [talentProfileId])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load engagements for this talent profile
      const engagementsRes = await fetch(`/api/engagements?talentProfileId=${talentProfileId}`)

      if (engagementsRes.ok) {
        const { engagements } = await engagementsRes.json()
        
        // Transform engagements to opportunities
        const opportunityList: OpportunitySummary[] = engagements.map((engagement: any) => ({
          id: engagement.id,
          title: engagement.offer?.talentRequest?.title || 'Untitled Project',
          companyName: engagement.offer?.company?.name || 'Unknown Company',
          status: engagement.status,
          budget: engagement.totalAmount,
          createdAt: new Date(engagement.createdAt),
          updatedAt: new Date(engagement.updatedAt)
        }))
        
        setOpportunities(opportunityList)

        // Calculate stats
        const newStats = {
          total: engagements.length,
          staged: engagements.filter((e: any) => e.status === 'staged').length,
          interviewing: engagements.filter((e: any) => e.status === 'interviewing').length,
          accepted: engagements.filter((e: any) => e.status === 'accepted').length,
          active: engagements.filter((e: any) => e.status === 'active').length,
          completed: engagements.filter((e: any) => e.status === 'completed').length,
          totalValue: engagements
            .filter((e: any) => ['accepted', 'active', 'completed'].includes(e.status))
            .reduce((sum: number, e: any) => sum + (e.providerAmount || e.totalAmount * 0.95 || 0), 0),
          averageRating: 4.8 // TODO: Calculate from actual ratings
        }
        setStats(newStats)

        // Generate activity items
        const activityItems: ActivityItem[] = engagements
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10)
          .map((engagement: any) => ({
            id: engagement.id,
            type: 'engagement_status_changed' as const,
            title: `${engagement.status === 'staged' ? 'Shortlisted for project' : 
                      engagement.status === 'interviewing' ? 'Interview scheduled' : 
                      engagement.status === 'accepted' ? 'Project won!' : 
                      `Status: ${engagement.status}`}`,
            description: `"${engagement.offer?.talentRequest?.title || 'Project'}" by ${engagement.offer?.company?.name || 'Company'}`,
            timestamp: new Date(engagement.updatedAt),
            status: engagement.status,
            metadata: {
              requestTitle: engagement.offer?.talentRequest?.title,
              companyName: engagement.offer?.company?.name,
              engagementId: engagement.id,
              amount: engagement.providerAmount || engagement.totalAmount * 0.95
            }
          }))

        setActivities(activityItems)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivityAction = (activity: ActivityItem, action: string) => {
    switch (action) {
      case 'view_engagement':
        // Navigate to opportunity details
        window.location.href = `/dashboard/opportunities/${activity.metadata?.engagementId}`
        break
      default:
        console.log('Action:', action, activity)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      staged: { label: 'Shortlisted', color: 'bg-blue-100 text-blue-800' },
      interviewing: { label: 'Interviewing', color: 'bg-yellow-100 text-yellow-800' },
      accepted: { label: 'Won', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Not Selected', color: 'bg-red-100 text-red-800' },
      active: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
    }
    
    const statusConfig = config[status as keyof typeof config]
    return statusConfig ? (
      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
    ) : null
  }

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
          <h1 className="text-2xl font-bold">Opportunities Dashboard</h1>
          <p className="text-gray-600">Track your project applications and engagements</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Browse Projects
          </Button>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" />
            Update Profile
          </Button>
        </div>
      </div>

      {/* Stats */}
      <EngagementStats userType="provider" stats={stats} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunities List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Your Opportunities
                </span>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {opportunities.length === 0 ? (
                <div className="p-6 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900 mb-2">No Opportunities Yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Start browsing projects to find opportunities that match your skills
                  </p>
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Browse Available Projects
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{opportunity.title}</h3>
                            {getStatusBadge(opportunity.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span>{opportunity.companyName}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {opportunity.updatedAt.toLocaleDateString()}
                            </span>
                            {opportunity.budget && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                R{(opportunity.budget * 0.95).toLocaleString()} (your share)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {['staged', 'interviewing'].includes(opportunity.status) && (
                            <Button size="sm" variant="outline">
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Update
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Status-specific info */}
                      <div className="text-xs text-gray-500">
                        {opportunity.status === 'staged' && 'You\'ve been shortlisted! Waiting for interview invitation.'}
                        {opportunity.status === 'interviewing' && 'Interview process in progress. Good luck!'}
                        {opportunity.status === 'accepted' && 'Congratulations! Project awarded to you.'}
                        {opportunity.status === 'active' && 'Project in progress. Keep up the great work!'}
                        {opportunity.status === 'completed' && 'Project completed successfully.'}
                        {opportunity.status === 'rejected' && 'Not selected for this project. Keep applying!'}
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
            userType="provider"
            onActionClick={handleActivityAction}
          />
        </div>
      </div>
    </div>
  )
}
