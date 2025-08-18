'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Briefcase, 
  CheckCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  Building,
  Star
} from 'lucide-react'

interface EngagementStatsProps {
  userType: 'seeker' | 'provider' | 'admin'
  stats: {
    total: number
    staged: number
    interviewing: number
    accepted: number
    active: number
    completed: number
    totalValue?: number
    averageRating?: number
  }
}

export default function EngagementStats({ userType, stats }: EngagementStatsProps) {
  const getStatsConfig = () => {
    switch (userType) {
      case 'seeker':
        return {
          title: 'Project Overview',
          items: [
            {
              label: 'Total Projects',
              value: stats.total,
              icon: Briefcase,
              color: 'text-blue-600'
            },
            {
              label: 'Shortlisted Talent',
              value: stats.staged,
              icon: Users,
              color: 'text-purple-600'
            },
            {
              label: 'In Interview',
              value: stats.interviewing,
              icon: Clock,
              color: 'text-yellow-600'
            },
            {
              label: 'Signed (Manual Invoice)',
              value: stats.accepted,
              icon: CheckCircle,
              color: 'text-green-600'
            },
            {
              label: 'Active',
              value: stats.active,
              icon: Briefcase,
              color: 'text-blue-600'
            }
          ]
        }
      
      case 'provider':
        return {
          title: 'Opportunity Overview',
          items: [
            {
              label: 'Total Opportunities',
              value: stats.total,
              icon: Briefcase,
              color: 'text-blue-600'
            },
            {
              label: 'Shortlisted',
              value: stats.staged,
              icon: Star,
              color: 'text-purple-600'
            },
            {
              label: 'Interviewing',
              value: stats.interviewing,
              icon: Clock,
              color: 'text-yellow-600'
            },
            {
              label: 'Won (Awaiting Start)',
              value: stats.accepted,
              icon: CheckCircle,
              color: 'text-green-600'
            },
            {
              label: 'Active',
              value: stats.active,
              icon: Briefcase,
              color: 'text-blue-600'
            }
          ]
        }
      
      case 'admin':
        return {
          title: 'Platform Overview',
          items: [
            {
              label: 'Total Engagements',
              value: stats.total,
              icon: TrendingUp,
              color: 'text-blue-600'
            },
            {
              label: 'Active Pipeline',
              value: stats.staged + stats.interviewing,
              icon: Clock,
              color: 'text-yellow-600'
            },
            {
              label: 'Signed (Manual Invoice)',
              value: stats.accepted,
              icon: CheckCircle,
              color: 'text-green-600'
            },
            {
              label: 'Active',
              value: stats.active,
              icon: Briefcase,
              color: 'text-blue-600'
            },
            {
              label: 'Completed',
              value: stats.completed,
              icon: Building,
              color: 'text-gray-600'
            }
          ]
        }
      
      default:
        return { title: 'Overview', items: [] }
    }
  }

  const config = getStatsConfig()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{config.title}</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {config.items.map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gray-50 ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-sm text-gray-600">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Additional stats for specific user types */}
      {(stats.totalValue || stats.averageRating) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {stats.totalValue && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50 text-green-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">R{stats.totalValue.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">
                      {userType === 'seeker' ? 'Total Project Value' : 
                       userType === 'provider' ? 'Total Earnings' : 'Platform Volume'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.averageRating && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50 text-yellow-600">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                    <p className="text-sm text-gray-600">Average Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
