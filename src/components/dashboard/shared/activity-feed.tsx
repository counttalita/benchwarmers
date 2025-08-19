'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  User, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  BookmarkPlus,
  DollarSign,
  Calendar
} from 'lucide-react'

export interface ActivityItem {
  id: string
  type: 'engagement_status_changed' | 'manual_invoice_required' | 'payment_required' | 'new_request' | 'new_application'
  title: string
  description: string
  timestamp: Date
  status?: 'staged' | 'interviewing' | 'accepted' | 'rejected' | 'active' | 'completed'
  metadata?: {
    requestTitle?: string
    talentName?: string
    companyName?: string
    amount?: number
    engagementId?: string
  }
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  userType: 'seeker' | 'provider' | 'admin'
  onActionClick?: (activity: ActivityItem, action: string) => void
}

export default function ActivityFeed({ activities, userType, onActionClick }: ActivityFeedProps) {
  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'engagement_status_changed':
        if (status === 'staged') return <BookmarkPlus className="h-4 w-4 text-blue-600" />
        if (status === 'interviewing') return <MessageCircle className="h-4 w-4 text-yellow-600" />
        if (status === 'accepted') return <CheckCircle className="h-4 w-4 text-green-600" />
        return <AlertCircle className="h-4 w-4 text-gray-600" />
      case 'manual_invoice_required':
        return <DollarSign className="h-4 w-4 text-orange-600" />
      case 'payment_required':
        return <DollarSign className="h-4 w-4 text-red-600" />
      case 'new_request':
        return <Building className="h-4 w-4 text-blue-600" />
      case 'new_application':
        return <User className="h-4 w-4 text-purple-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const statusConfig = {
      staged: { label: 'Shortlisted', color: 'bg-blue-100 text-blue-800' },
      interviewing: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
      accepted: { label: 'Signed', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Declined', color: 'bg-red-100 text-red-800' },
      active: { label: 'Active', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getActionButtons = (activity: ActivityItem) => {
    const buttons = []

    if (userType === 'admin') {
      if (activity.type === 'engagement_status_changed' && activity.status === 'accepted') {
        buttons.push(
          <Button 
            key="invoice" 
            size="sm" 
            variant="outline"
            onClick={() => onActionClick?.(activity, 'create_invoice')}
          >
            Create Invoice
          </Button>
        )
      }
      
      if (activity.type === 'manual_invoice_required') {
        buttons.push(
          <Button 
            key="process" 
            size="sm" 
            onClick={() => onActionClick?.(activity, 'process_invoice')}
          >
            Process Invoice
          </Button>
        )
      }

      buttons.push(
        <Button 
          key="view" 
          size="sm" 
          variant="outline"
          onClick={() => onActionClick?.(activity, 'view_details')}
        >
          View Details
        </Button>
      )
    } else {
      // Seeker/Provider actions
      if (activity.metadata?.engagementId) {
        buttons.push(
          <Button 
            key="view" 
            size="sm" 
            variant="outline"
            onClick={() => onActionClick?.(activity, 'view_engagement')}
          >
            View {userType === 'seeker' ? 'Project' : 'Opportunity'}
          </Button>
        )
      }
    }

    return buttons
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-medium text-gray-900 mb-2">No Recent Activity</h3>
          <p className="text-sm text-gray-500">
            {userType === 'seeker' && "Your project activity will appear here"}
            {userType === 'provider' && "Your opportunity activity will appear here"}
            {userType === 'admin' && "Platform activity will appear here"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activities.map((activity: any) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    {getStatusBadge(activity.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {activity.description}
                  </p>
                  
                  {activity.metadata && (
                    <div className="text-xs text-gray-500 mb-2">
                      {activity.metadata.requestTitle && (
                        <span>Project: {activity.metadata.requestTitle}</span>
                      )}
                      {activity.metadata.talentName && (
                        <span> • Talent: {activity.metadata.talentName}</span>
                      )}
                      {activity.metadata.companyName && (
                        <span> • Company: {activity.metadata.companyName}</span>
                      )}
                      {activity.metadata.amount && (
                        <span> • Amount: R{activity.metadata.amount.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                    
                    <div className="flex gap-2">
                      {getActionButtons(activity)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
