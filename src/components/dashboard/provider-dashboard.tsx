'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, Users, TrendingUp, Award, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface TalentEngagement {
  id: string
  talentName: string
  talentTitle: string
  requestTitle: string
  seekerCompany: string
  status: 'staged' | 'interviewing' | 'accepted' | 'rejected' | 'active' | 'completed'
  interviewDate?: Date
  engagementStartDate?: Date
  engagementEndDate?: Date
  hourlyRate: number
  totalHours?: number
  totalEarnings?: number
  rating?: number
  feedback?: string
}

interface InterviewSchedule {
  id: string
  talentName: string
  talentTitle: string
  seekerCompany: string
  title: string
  startTime: Date
  endTime: Date
  meetingType: 'video' | 'audio' | 'in_person'
  meetingUrl?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

interface ProviderStats {
  totalTalent: number
  activeEngagements: number
  completedEngagements: number
  totalEarnings: number
  averageRating: number
  upcomingInterviews: number
  pendingResponses: number
}

export default function ProviderDashboard() {
  const [stats, setStats] = useState<ProviderStats>({
    totalTalent: 0,
    activeEngagements: 0,
    completedEngagements: 0,
    totalEarnings: 0,
    averageRating: 0,
    upcomingInterviews: 0,
    pendingResponses: 0
  })

  const [engagements, setEngagements] = useState<TalentEngagement[]>([])
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProviderData()
  }, [])

  const fetchProviderData = async () => {
    try {
      // Fetch provider dashboard data
      const response = await fetch('/api/provider/dashboard')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        setEngagements(data.engagements)
        setInterviews(data.interviews)
      }
    } catch (error) {
      console.error('Failed to fetch provider data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      staged: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      interviewing: { color: 'bg-yellow-100 text-yellow-800', icon: Calendar },
      accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      active: { color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
      completed: { color: 'bg-gray-100 text-gray-800', icon: Award }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.staged
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '📹'
      case 'audio':
        return '📞'
      case 'in_person':
        return '🤝'
      default:
        return '📅'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Provider Dashboard</h1>
          <p className="text-gray-600">Manage your talent and track engagements</p>
        </div>
        <Button onClick={fetchProviderData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Talent</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTalent}</div>
            <p className="text-xs text-muted-foreground">
              Active talent profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Engagements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEngagements}</div>
            <p className="text-xs text-muted-foreground">
              Ongoing projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              From completed projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
            <CardDescription>
              {stats.upcomingInterviews} scheduled interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Responses</CardTitle>
            <CardDescription>
              {stats.pendingResponses} awaiting action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Review Requests
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
            <CardDescription>
              {stats.completedEngagements} completed projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="engagements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagements">Engagements</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="engagements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Talent Engagements</CardTitle>
              <CardDescription>
                Track your talent's project engagements and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {engagements.map((engagement: any) => (
                  <div key={engagement.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{engagement.talentName}</h3>
                        <p className="text-sm text-gray-600">{engagement.talentTitle}</p>
                        <p className="text-sm text-gray-500">
                          Project: {engagement.requestTitle} at {engagement.seekerCompany}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(engagement.status)}
                        <p className="text-sm text-gray-600 mt-1">
                          R{engagement.hourlyRate}/hr
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {engagement.interviewDate && (
                        <div>
                          <p className="text-gray-500">Interview Date</p>
                          <p className="font-medium">
                            {format(new Date(engagement.interviewDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      )}
                      {engagement.engagementStartDate && (
                        <div>
                          <p className="text-gray-500">Start Date</p>
                          <p className="font-medium">
                            {format(new Date(engagement.engagementStartDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      )}
                      {engagement.totalHours && (
                        <div>
                          <p className="text-gray-500">Hours Worked</p>
                          <p className="font-medium">{engagement.totalHours}h</p>
                        </div>
                      )}
                      {engagement.totalEarnings && (
                        <div>
                          <p className="text-gray-500">Earnings</p>
                          <p className="font-medium">R{engagement.totalEarnings}</p>
                        </div>
                      )}
                    </div>

                    {engagement.rating && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Rating</p>
                            <div className="flex items-center">
                              <span className="font-medium">{engagement.rating}/5</span>
                              <div className="flex ml-2">
                                {[...Array(5)].map((_, i) => (
                                  <Award
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < engagement.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {engagement.feedback && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Feedback</p>
                              <p className="text-sm font-medium max-w-xs truncate">
                                {engagement.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        {engagement.status === 'interviewing' && (
                          <Button size="sm" variant="outline">
                            Schedule Interview
                          </Button>
                        )}
                        {engagement.status === 'active' && (
                          <Button size="sm" variant="outline">
                            Track Progress
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {engagements.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No engagements yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your talent will appear here once they get matched with projects.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interview Schedule</CardTitle>
              <CardDescription>
                Manage upcoming and past interviews for your talent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interviews.map((interview: any) => (
                  <div key={interview.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{interview.title}</h3>
                        <p className="text-sm text-gray-600">
                          {interview.talentName} - {interview.talentTitle}
                        </p>
                        <p className="text-sm text-gray-500">
                          {interview.seekerCompany}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            interview.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : interview.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {getMeetingTypeIcon(interview.meetingType)} {interview.meetingType}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium">
                          {format(new Date(interview.startTime), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Time</p>
                        <p className="font-medium">
                          {format(new Date(interview.startTime), 'HH:mm')} - {format(new Date(interview.endTime), 'HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium">
                          {Math.round((new Date(interview.endTime).getTime() - new Date(interview.startTime).getTime()) / (1000 * 60))} min
                        </p>
                      </div>
                    </div>

                    {interview.meetingUrl && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-500">Meeting Link</p>
                        <a
                          href={interview.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        {interview.status === 'scheduled' && (
                          <>
                            <Button size="sm" variant="outline">
                              Reschedule
                            </Button>
                            <Button size="sm" variant="outline">
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {interviews.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews scheduled</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Interviews will appear here once scheduled.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Performance</CardTitle>
                <CardDescription>Success rate and completion metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Completion Rate</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Client Satisfaction</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>On-Time Delivery</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>Monthly and total earnings breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">This Month</span>
                    <span className="font-medium">R{stats.totalEarnings * 0.3}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Month</span>
                    <span className="font-medium">R{stats.totalEarnings * 0.25}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="font-medium">R{stats.totalEarnings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
