'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter,
  Eye,
  MessageCircle,
  Calendar,
  Users,
  Briefcase
} from 'lucide-react'
import ActivityFeed, { ActivityItem } from './shared/activity-feed'
import EngagementStats from './shared/engagement-stats'
import ExecutiveKPIs from './shared/executive-kpis'
import AnalyticsChart from './shared/analytics-chart'

interface SeekerDashboardProps {
  companyId: string
}

interface ProjectSummary {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'completed'
  talentCount: number
  stagedCount: number
  interviewingCount: number
  acceptedCount: number
  createdAt: Date
  budget?: number
}

export default function SeekerDashboard({ companyId }: SeekerDashboardProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
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
    hiringTrend: [] as { label: string; value: number; trend?: number }[],
    conversionFunnel: [] as { label: string; value: number }[],
    costAnalysis: [] as { label: string; value: number }[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [companyId])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load projects and engagements
      const [projectsRes, engagementsRes] = await Promise.all([
        fetch(`/api/talent-requests?companyId=${companyId}`),
        fetch(`/api/engagements?companyId=${companyId}`)
      ])

      if (projectsRes.ok) {
        const { requests } = await projectsRes.json()
        setProjects(requests.map((req: any) => ({
          id: req.id,
          title: req.title,
          status: req.status,
          talentCount: req._count?.engagements || 0,
          stagedCount: req.engagements?.filter((e: any) => e.status === 'staged').length || 0,
          interviewingCount: req.engagements?.filter((e: any) => e.status === 'interviewing').length || 0,
          acceptedCount: req.engagements?.filter((e: any) => e.status === 'accepted').length || 0,
          createdAt: new Date(req.createdAt),
          budget: req.budget
        })))
      }

      if (engagementsRes.ok) {
        const { engagements } = await engagementsRes.json()
        
        // Calculate stats
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

        // Calculate executive KPIs
        const avgTimeToHire = engagements
          .filter((e: any) => e.status === 'completed')
          .reduce((sum: number, e: any) => {
            const days = Math.ceil((new Date(e.updatedAt).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            return sum + days
          }, 0) / Math.max(1, engagements.filter((e: any) => e.status === 'completed').length)

        const avgCostPerHire = newStats.totalValue / Math.max(1, newStats.completed)
        const conversionRate = (newStats.accepted / Math.max(1, newStats.total)) * 100
        
        setKpis({
          timeToHire: { current: avgTimeToHire || 0, previous: avgTimeToHire * 1.1 || 0, unit: 'days' },
          costPerHire: { current: avgCostPerHire || 0, previous: avgCostPerHire * 1.05 || 0, unit: 'ZAR' },
          conversionRate: { current: conversionRate || 0, previous: conversionRate * 0.9 || 0, unit: '%' },
          qualityScore: { current: 4.2, previous: 4.0, unit: '/5' },
          pipelineVelocity: { current: avgTimeToHire * 0.7 || 0, previous: avgTimeToHire * 0.8 || 0, unit: 'days' },
          roi: { current: 85, previous: 78, unit: '%' }
        })

        // Generate chart data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - i))
          return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: Math.floor(Math.random() * 10) + 1,
            trend: (Math.random() - 0.5) * 20
          }
        })

        setChartData({
          hiringTrend: last7Days,
          conversionFunnel: [
            { label: 'Applications', value: newStats.total },
            { label: 'Shortlisted', value: newStats.staged },
            { label: 'Interviewing', value: newStats.interviewing },
            { label: 'Hired', value: newStats.accepted }
          ],
          costAnalysis: [
            { label: 'Platform Fee', value: newStats.totalValue * 0.05 },
            { label: 'Talent Cost', value: newStats.totalValue * 0.95 },
            { label: 'Internal Cost', value: newStats.totalValue * 0.15 }
          ]
        })

        // Generate activity items
        const activityItems: ActivityItem[] = engagements
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10)
          .map((engagement: any) => ({
            id: engagement.id,
            type: 'engagement_status_changed' as const,
            title: `Talent ${engagement.status === 'staged' ? 'shortlisted' : 
                              engagement.status === 'interviewing' ? 'interviewing' : 
                              engagement.status === 'accepted' ? 'signed' : engagement.status}`,
            description: `${engagement.offer?.talentProfile?.user?.name || 'Talent'} for "${engagement.offer?.talentRequest?.title || 'Project'}"`,
            timestamp: new Date(engagement.updatedAt),
            status: engagement.status,
            metadata: {
              requestTitle: engagement.offer?.talentRequest?.title,
              talentName: engagement.offer?.talentProfile?.user?.name,
              engagementId: engagement.id,
              amount: engagement.totalAmount
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
        // Navigate to engagement details
        window.location.href = `/dashboard/projects/${activity.metadata?.engagementId}`
        break
      default:
        console.log('Action:', action, activity)
    }
  }

  const getProjectStatusBadge = (status: string) => {
    const config = {
      open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
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
          <h1 className="text-2xl font-bold">Project Dashboard</h1>
          <p className="text-gray-600">Manage your talent acquisition projects</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Find Talent
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Post New Project
          </Button>
        </div>
      </div>

      {/* Executive KPIs */}
      <ExecutiveKPIs userType="seeker" kpis={kpis} />

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnalyticsChart
          title="Hiring Trend"
          subtitle="Daily hiring activity"
          data={chartData.hiringTrend}
          chartType="line"
          timeframe="7d"
        />
        <AnalyticsChart
          title="Conversion Funnel"
          subtitle="Application to hire pipeline"
          data={chartData.conversionFunnel}
          chartType="funnel"
          timeframe="30d"
        />
        <AnalyticsChart
          title="Cost Breakdown"
          subtitle="Hiring cost analysis"
          data={chartData.costAnalysis}
          chartType="bar"
          timeframe="30d"
          valuePrefix="R"
        />
      </div>

      {/* Traditional Stats */}
      <EngagementStats userType="seeker" stats={stats} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Your Projects
                </span>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="p-6 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900 mb-2">No Projects Yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Start by posting your first talent acquisition project
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Project
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {projects.map((project: any) => (
                    <div key={project.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{project.title}</h3>
                            {getProjectStatusBadge(project.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.talentCount} talent applications
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {project.createdAt.toLocaleDateString()}
                            </span>
                            {project.budget && (
                              <span>Budget: R{project.budget.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </div>
                      
                      {/* Engagement Pipeline */}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-blue-600">
                          {project.stagedCount} Shortlisted
                        </span>
                        <span className="text-yellow-600">
                          {project.interviewingCount} Interviewing
                        </span>
                        <span className="text-green-600">
                          {project.acceptedCount} Signed
                        </span>
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
            userType="seeker"
            onActionClick={handleActivityAction}
          />
        </div>
      </div>
    </div>
  )
}
