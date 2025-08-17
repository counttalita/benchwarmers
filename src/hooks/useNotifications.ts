import { useState, useEffect, useCallback, useRef } from 'react'
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher/config'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'unread' | 'read' | 'archived'
  createdAt: string
  readAt?: string
  expiresAt?: string
}

export interface NotificationStats {
  total: number
  unread: number
  read: number
  archived: number
}

export interface NotificationPreferences {
  type: string
  channels: ('in_app' | 'email' | 'push')[]
  enabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
  frequency?: 'immediate' | 'daily' | 'weekly'
}

export function useNotifications(userId: string, companyId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    read: 0,
    archived: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<any>(null)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (options?: {
    status?: 'unread' | 'read' | 'archived'
    limit?: number
    offset?: number
    type?: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options?.status) params.append('status', options.status)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.type) params.append('type', options.type)

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        headers: {
          'x-user-id': userId,
          ...(companyId && { 'x-company-id': companyId })
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications)
      setStats(data.stats)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [userId, companyId])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          ...(companyId && { 'x-company-id': companyId })
        },
        body: JSON.stringify({ action: 'read' })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 'read', readAt: new Date().toISOString() }
            : notification
        )
      )

      // Update stats
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    }
  }, [userId, companyId])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (type?: string) => {
    try {
      const params = new URLSearchParams()
      if (type) params.append('type', type)

      const response = await fetch(`/api/notifications/mark-all-read?${params.toString()}`, {
        method: 'PUT',
        headers: {
          'x-user-id': userId,
          ...(companyId && { 'x-company-id': companyId })
        }
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          type ? 
            (notification.type === type ? { ...notification, status: 'read', readAt: new Date().toISOString() } : notification) :
            { ...notification, status: 'read', readAt: new Date().toISOString() }
        )
      )

      // Update stats
      setStats(prev => ({
        ...prev,
        unread: type ? Math.max(0, prev.unread - notifications.filter(n => n.type === type && n.status === 'unread').length) : 0,
        read: type ? prev.read + notifications.filter(n => n.type === type && n.status === 'unread').length : prev.total
      }))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
    }
  }, [userId, companyId, notifications])

  // Archive notification
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          ...(companyId && { 'x-company-id': companyId })
        },
        body: JSON.stringify({ action: 'archive' })
      })

      if (!response.ok) {
        throw new Error('Failed to archive notification')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 'archived' }
            : notification
        )
      )

      // Update stats
      setStats(prev => ({
        ...prev,
        archived: prev.archived + 1,
        ...(notifications.find(n => n.id === notificationId)?.status === 'unread' && {
          unread: Math.max(0, prev.unread - 1)
        }),
        ...(notifications.find(n => n.id === notificationId)?.status === 'read' && {
          read: Math.max(0, prev.read - 1)
        })
      }))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive notification')
    }
  }, [userId, companyId, notifications])

  // Update notification preferences
  const updatePreferences = useCallback(async (preferences: NotificationPreferences) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          ...(companyId && { 'x-company-id': companyId })
        },
        body: JSON.stringify(preferences)
      })

      if (!response.ok) {
        throw new Error('Failed to update notification preferences')
      }

      return await response.json()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification preferences')
      throw err
    }
  }, [userId, companyId])

  // Get notification preferences
  const getPreferences = useCallback(async (type?: string) => {
    try {
      const params = new URLSearchParams()
      if (type) params.append('type', type)

      const response = await fetch(`/api/notifications/preferences?${params.toString()}`, {
        headers: {
          'x-user-id': userId,
          ...(companyId && { 'x-company-id': companyId })
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get notification preferences')
      }

      return await response.json()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get notification preferences')
      throw err
    }
  }, [userId, companyId])

  // Set up real-time notifications
  useEffect(() => {
    if (!userId) return

    // Subscribe to user notifications channel
    const channel = pusherClient.subscribe(CHANNELS.USER_NOTIFICATIONS(userId))
    channelRef.current = channel

    // Listen for new notifications
    channel.bind(EVENTS.NOTIFICATION_CREATED, (data: Notification) => {
      setNotifications(prev => [data, ...prev])
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + 1
      }))
    })

    // Listen for notification updates
    channel.bind(EVENTS.NOTIFICATION_UPDATED, (data: { id: string; status: string; readAt?: string }) => {
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === data.id 
            ? { ...notification, status: data.status as any, readAt: data.readAt }
            : notification
        )
      )
    })

    // Subscribe to company notifications if companyId is provided
    if (companyId) {
      const companyChannel = pusherClient.subscribe(CHANNELS.COMPANY_NOTIFICATIONS(companyId))
      
      companyChannel.bind(EVENTS.NOTIFICATION_CREATED, (data: Notification) => {
        setNotifications(prev => [data, ...prev])
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          unread: prev.unread + 1
        }))
      })
    }

    // Initial fetch
    fetchNotifications()

    return () => {
      if (channelRef.current) {
        pusherClient.unsubscribe(CHANNELS.USER_NOTIFICATIONS(userId))
      }
      if (companyId) {
        pusherClient.unsubscribe(CHANNELS.COMPANY_NOTIFICATIONS(companyId))
      }
    }
  }, [userId, companyId, fetchNotifications])

  return {
    notifications,
    stats,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    updatePreferences,
    getPreferences
  }
}

// Hook for notification badges/counts
export function useNotificationCount(userId: string, companyId?: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!userId) return

    // Subscribe to user notifications channel
    const channel = pusherClient.subscribe(CHANNELS.USER_NOTIFICATIONS(userId))
    channelRef.current = channel

    // Listen for new notifications
    channel.bind(EVENTS.NOTIFICATION_CREATED, () => {
      setUnreadCount(prev => prev + 1)
    })

    // Listen for notification updates
    channel.bind(EVENTS.NOTIFICATION_UPDATED, (data: { action?: string; id: string; status: string }) => {
      if (data.action === 'mark_all_read') {
        setUnreadCount(0)
      } else if (data.status === 'read') {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    })

    // Subscribe to company notifications if companyId is provided
    if (companyId) {
      const companyChannel = pusherClient.subscribe(CHANNELS.COMPANY_NOTIFICATIONS(companyId))
      
      companyChannel.bind(EVENTS.NOTIFICATION_CREATED, () => {
        setUnreadCount(prev => prev + 1)
      })
    }

    // Initial fetch
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'x-user-id': userId,
            ...(companyId && { 'x-company-id': companyId })
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.stats.unread)
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error)
      }
    }

    fetchCount()

    return () => {
      if (channelRef.current) {
        pusherClient.unsubscribe(CHANNELS.USER_NOTIFICATIONS(userId))
      }
      if (companyId) {
        pusherClient.unsubscribe(CHANNELS.COMPANY_NOTIFICATIONS(companyId))
      }
    }
  }, [userId, companyId])

  return unreadCount
}
