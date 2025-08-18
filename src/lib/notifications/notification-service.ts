import { prisma } from '@/lib/prisma'
import { triggerUserNotification, triggerCompanyNotification, EVENTS } from '@/lib/pusher/config'
import { sendEmailNotification } from './email-service'
import { logInfo, logError } from '@/lib/logger'
import { z } from 'zod'

export interface CreateNotificationData {
  userId: string
  companyId?: string
  type: 'match_created' | 'offer_received' | 'offer_accepted' | 'offer_declined' | 
        'payment_released' | 'payment_held' | 'engagement_started' | 'engagement_completed' |
        'engagement_status_changed' | 'manual_invoice_required' | 'payment_required' |
        'milestone_reached' | 'dispute_created' | 'dispute_resolved' | 'system_alert'
  title: string
  message: string
  data?: Record<string, unknown>
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  channels?: ('in_app' | 'email' | 'push')[]
  scheduledFor?: Date
  expiresAt?: Date
}

export interface NotificationPreferenceData {
  userId: string
  companyId?: string
  type: string
  channels: ('in_app' | 'email' | 'push')[]
  enabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
  frequency?: 'immediate' | 'daily' | 'weekly'
}

export class NotificationService {
  /**
   * Create and send a notification
   */
  async createNotification(data: CreateNotificationData) {
    const correlationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    try {
      logInfo('Creating notification', {
        correlationId,
        userId: data.userId,
        type: data.type,
        title: data.title
      })

      // Get user preferences for this notification type
      const preferences = await this.getNotificationPreferences(
        data.userId,
        data.companyId,
        data.type
      )

      // Check if notifications are enabled and not in quiet hours
      if (!preferences.enabled || this.isInQuietHours(preferences)) {
        logInfo('Notification skipped due to preferences or quiet hours', {
          correlationId,
          userId: data.userId,
          type: data.type,
          enabled: preferences.enabled,
          inQuietHours: this.isInQuietHours(preferences)
        })
        return null
      }

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          companyId: data.companyId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          priority: data.priority || 'medium',
          channels: data.channels || preferences.channels,
          scheduledFor: data.scheduledFor,
          expiresAt: data.expiresAt,
          sentAt: new Date()
        }
      })

      // Send notifications through enabled channels
      await this.sendNotification(notification, preferences, correlationId)

      logInfo('Notification created and sent successfully', {
        correlationId,
        notificationId: notification.id,
        channels: notification.channels
      })

      return notification

    } catch (error) {
      logError('Failed to create notification', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      })
      throw error
    }
  }

  /**
   * Send notification through enabled channels
   */
  private async sendNotification(
    notification: { id: string; type: string; title: string; message: string; data?: Record<string, unknown> },
    preferences: { channels: string[] },
    correlationId: string
  ) {
    const promises: Promise<unknown>[] = []

    // Send in-app notification via Pusher
    if (preferences.channels.includes('in_app')) {
      promises.push(
        triggerUserNotification(
          notification.userId,
          EVENTS.NOTIFICATION_CREATED,
          {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            priority: notification.priority,
            createdAt: notification.createdAt
          }
        )
      )
    }

    // Send email notification
    if (preferences.channels.includes('email')) {
      promises.push(
        sendEmailNotification(notification, preferences, correlationId)
      )
    }

    // Send push notification (future implementation)
    if (preferences.channels.includes('push')) {
      // TODO: Implement push notification service
      logInfo('Push notification not yet implemented', { correlationId })
    }

    await Promise.allSettled(promises)
  }

  /**
   * Get notification preferences for a user and notification type
   */
  async getNotificationPreferences(
    userId: string,
    companyId?: string,
    type?: string
  ) {
    const where: { userId: string; companyId?: string; type?: string } = { userId }
    if (companyId) where.companyId = companyId
    if (type) where.type = type

    const preferences = await prisma.notificationPreference.findFirst({
      where
    })

    // Return default preferences if none found
    return preferences || {
      channels: ['in_app', 'email'],
      enabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: 'UTC',
      frequency: 'immediate'
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(preferences: { quietHoursStart?: string | null; quietHoursEnd?: string | null; timezone?: string | null }): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const timezone = preferences.timezone || 'UTC'
    
    // Convert current time to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const currentHour = userTime.getHours()
    const currentMinute = userTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    // Parse quiet hours
    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number)
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number)
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    // Handle overnight quiet hours
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    } else {
      return currentTime >= startTime && currentTime <= endTime
    }
  }

  /**
   * Get user notifications with pagination and filters
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number
      limit?: number
      status?: 'unread' | 'read' | 'archived'
      type?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ) {
    const { page = 1, limit = 20, status, type, startDate, endDate } = options
    const skip = (page - 1) * limit

    try {
      const where: any = { userId }

      if (status) {
        where.status = status
      }

      if (type) {
        where.type = type
      }

      if (startDate || endDate) {
        where.sentAt = {}
        if (startDate) where.sentAt.gte = startDate
        if (endDate) where.sentAt.lte = endDate
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({ where })
      ])

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      logError('Failed to get user notifications', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Update notification (mark as read, archive, etc.)
   */
  async updateNotification(
    notificationId: string,
    userId: string,
    updates: {
      status?: 'read' | 'archived'
      readAt?: Date
      archivedAt?: Date
    }
  ) {
    try {
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId }
      })

      if (!notification) {
        throw new Error('Notification not found')
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: updates
      })

      return updatedNotification
    } catch (error) {
      logError('Failed to update notification', {
        notificationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId: string) {
    return this.updateNotification(notificationId, userId, {
      status: 'archived',
      archivedAt: new Date()
    })
  }

  /**
   * Bulk create notifications
   */
  async bulkCreateNotifications(notifications: CreateNotificationData[]) {
    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const notificationData of notifications) {
      try {
        const notification = await this.createNotification(notificationData)
        if (notification) {
          results.successful++
        } else {
          results.skipped++
        }
      } catch (error) {
        results.failed++
        results.errors.push(
          `Failed to create notification for user ${notificationData.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return {
      summary: {
        total: notifications.length,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped
      },
      errors: results.errors
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId // Ensure user owns the notification
        },
        data: {
          status: 'read',
          readAt: new Date()
        }
      })

      // Trigger real-time update
      await triggerUserNotification(
        userId,
        EVENTS.NOTIFICATION_UPDATED,
        {
          id: notification.id,
          status: notification.status,
          readAt: notification.readAt
        }
      )

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, type?: string) {
    const where: { userId: string; status: string; type?: string } = { userId, status: 'unread' }
    if (type) where.type = type

    const notifications = await prisma.notification.updateMany({
      where,
      data: {
        status: 'read',
        readAt: new Date()
      }
    })

    // Trigger real-time update
    await triggerUserNotification(
      userId,
      EVENTS.NOTIFICATION_UPDATED,
      {
        action: 'mark_all_read',
        count: notifications.count
      }
    )

    return notifications
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId
        },
        data: {
          status: 'deleted'
        }
      })

      // Trigger real-time update
      await triggerUserNotification(
        userId,
        EVENTS.NOTIFICATION_UPDATED,
        {
          id: notification.id,
          status: notification.status
        }
      )

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotifications(userId: string, limit = 50): Promise<unknown[]> {
    const [total, unread, read, archived] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, status: 'unread' } }),
      prisma.notification.count({ where: { userId, status: 'read' } }),
      prisma.notification.count({ where: { userId, status: 'archived' } })
    ])

    return {
      total,
      unread,
      read,
      archived
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(data: NotificationPreferenceData) {
    const existing = await prisma.notificationPreference.findFirst({
      where: {
        userId: data.userId,
        companyId: data.companyId,
        type: data.type
      }
    })

    if (existing) {
      return await prisma.notificationPreference.update({
        where: { id: existing.id },
        data: {
          channels: data.channels,
          enabled: data.enabled,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          timezone: data.timezone || 'UTC',
          frequency: data.frequency || 'immediate'
        }
      })
    } else {
      return await prisma.notificationPreference.create({
        data: {
          userId: data.userId,
          companyId: data.companyId,
          type: data.type,
          channels: data.channels,
          enabled: data.enabled,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          timezone: data.timezone || 'UTC',
          frequency: data.frequency || 'immediate'
        }
      })
    }
  }

  /**
   * Delete expired notifications
   */
  async cleanupExpiredNotifications() {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    logInfo('Cleaned up expired notifications', {
      deletedCount: result.count
    })

    return result
  }
}

export const notificationService = new NotificationService()
