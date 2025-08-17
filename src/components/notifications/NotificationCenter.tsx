'use client'

import React, { useState } from 'react'
import { useNotifications, Notification } from '@/hooks/useNotifications'
import { Bell, X, Check, Archive, Settings, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'

interface NotificationCenterProps {
  userId: string
  companyId?: string
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ userId, companyId, isOpen, onClose }: NotificationCenterProps) {
  const {
    notifications,
    stats,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    archiveNotification
  } = useNotifications(userId, companyId)

  const [activeTab, setActiveTab] = useState('all')
  const [filterType, setFilterType] = useState<string>('all')

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return notification.status === 'unread'
    if (activeTab === 'read') return notification.status === 'read'
    if (activeTab === 'archived') return notification.status === 'archived'
    if (filterType !== 'all') return notification.type === filterType
    return true
  })

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(filterType !== 'all' ? filterType : undefined)
  }

  const handleArchive = async (notificationId: string) => {
    await archiveNotification(notificationId)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_created':
        return '🎯'
      case 'offer_received':
        return '💰'
      case 'offer_accepted':
        return '✅'
      case 'payment_released':
        return '💸'
      case 'engagement_completed':
        return '🎉'
      case 'dispute_created':
        return '⚠️'
      default:
        return '📢'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Notifications</h2>
            {stats.unread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.unread}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="match_created">Matches</SelectItem>
                <SelectItem value="offer_received">Offers</SelectItem>
                <SelectItem value="payment_released">Payments</SelectItem>
                <SelectItem value="engagement_completed">Engagements</SelectItem>
                <SelectItem value="dispute_created">Disputes</SelectItem>
              </SelectContent>
            </Select>

            {stats.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="ml-auto"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({stats.unread})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({stats.read})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({stats.archived})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="h-full overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 p-4">
                  {error}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center text-gray-500 p-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onArchive={handleArchive}
                      getNotificationIcon={getNotificationIcon}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredNotifications.length} of {stats.total} notifications
            </span>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NotificationCardProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onArchive: (id: string) => void
  getNotificationIcon: (type: string) => string
  getPriorityColor: (priority: string) => string
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onArchive,
  getNotificationIcon,
  getPriorityColor
}: NotificationCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className={`transition-all duration-200 ${
        notification.status === 'unread' ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
      } ${isHovered ? 'shadow-md' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {notification.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPriorityColor(notification.priority)}`}
                  >
                    {notification.priority}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                  {notification.data?.projectTitle && (
                    <span className="truncate">
                      Project: {notification.data.projectTitle}
                    </span>
                  )}
                </div>
              </div>
              
              <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                {notification.status === 'unread' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(notification.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onArchive(notification.id)}
                  className="h-8 w-8 p-0"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
