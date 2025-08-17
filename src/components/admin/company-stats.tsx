"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"

interface CompanyStats {
  total: number
  pending: number
  active: number
  suspended: number
  domainVerified: number
  domainPending: number
  providers: number
  seekers: number
  both: number
  recentRegistrations: number
}

export function CompanyStats() {
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get('/api/admin/companies/stats')

      if (response.error) {
        throw response.error
      }

      if (response.data?.stats) {
        setStats(response.data.stats)
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'LOAD_STATS_FAILED',
        err instanceof Error ? err.message : 'Failed to load company statistics'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorAlert 
        error={error} 
        onDismiss={() => setError(null)}
        onRetry={loadStats}
      />
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      title: "Total Companies",
      value: stats.total,
      description: "All registered companies",
      color: "text-blue-600"
    },
    {
      title: "Pending Approval",
      value: stats.pending,
      description: "Awaiting admin review",
      color: "text-yellow-600"
    },
    {
      title: "Active Companies",
      value: stats.active,
      description: "Approved and active",
      color: "text-green-600"
    },
    {
      title: "Domain Verified",
      value: stats.domainVerified,
      description: "Completed domain verification",
      color: "text-purple-600"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Company Types</CardTitle>
            <CardDescription>Distribution by company type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Talent Providers</span>
              <span className="font-medium">{stats.providers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Talent Seekers</span>
              <span className="font-medium">{stats.seekers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Both Provider & Seeker</span>
              <span className="font-medium">{stats.both}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Domain verification progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Domain Verified</span>
              <span className="font-medium text-green-600">{stats.domainVerified}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Verification Pending</span>
              <span className="font-medium text-yellow-600">{stats.domainPending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Recent Registrations (7 days)</span>
              <span className="font-medium text-blue-600">{stats.recentRegistrations}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}