import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getNotifications, POST as updatePreferences } from '@/app/api/notifications/route'
import { PUT as updateNotification, DELETE as deleteNotification } from '@/app/api/notifications/[id]/route'
import { GET as getPreferences, POST as createPreference, PUT as bulkUpdatePreferences } from '@/app/api/notifications/preferences/route'
import { POST as createNotification, PUT as bulkCreateNotifications } from '@/app/api/notifications/create/route'

// Mock the notification service
jest.mock('@/lib/notifications/notification-service', () => ({
  notificationService: {
    getUserNotifications: jest.fn(),
    getNotificationStats: jest.fn(),
    updateNotificationPreferences: jest.fn(),
    getNotificationPreferences: jest.fn(),
    markAsRead: jest.fn(),
    archiveNotification: jest.fn(),
    createNotification: jest.fn()
  }
}))

// Mock the email service
jest.mock('@/lib/notifications/email-service', () => ({
  sendEmailNotification: jest.fn()
}))

// Mock Pusher
jest.mock('@/lib/pusher/config', () => ({
  triggerUserNotification: jest.fn(),
  triggerCompanyNotification: jest.fn(),
  EVENTS: {
    NOTIFICATION_CREATED: 'notification-created',
    NOTIFICATION_UPDATED: 'notification-updated'
  }
}))

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logRequest: jest.fn(),
  logError: jest.fn()
}))

const mockNotificationService = require('@/lib/notifications/notification-service').notificationService

function createNextRequest(url: string, method: string = 'GET', body?: any): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
  const request = new Request(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user-id',
      'x-company-id': 'test-company-id'
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request as NextRequest
}

describe('Notifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/notifications', () => {
    it('should return notifications successfully', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'match_created',
          title: 'New Match',
          message: 'You have a new match',
          status: 'unread',
          priority: 'medium',
          createdAt: new Date().toISOString()
        }
      ]

      const mockStats = {
        total: 1,
        unread: 1,
        read: 0,
        archived: 0
      }

      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications)
      mockNotificationService.getNotificationStats.mockResolvedValue(mockStats)

      const request = createNextRequest('/api/notifications?status=unread&limit=10')
      const response = await getNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toEqual(mockNotifications)
      expect(data.stats).toEqual(mockStats)
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        'test-user-id',
        { status: 'unread', limit: 10, offset: 0 }
      )
    })

    it('should handle service errors', async () => {
      mockNotificationService.getUserNotifications.mockRejectedValue(new Error('Database error'))

      const request = createNextRequest('/api/notifications')
      const response = await getNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/notifications', () => {
    it('should update notification preferences successfully', async () => {
      const mockPreference = {
        id: '1',
        type: 'match_created',
        channels: ['in_app', 'email'],
        enabled: true
      }

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(mockPreference)

      const request = createNextRequest('/api/notifications', 'POST', {
        type: 'match_created',
        channels: ['in_app', 'email'],
        enabled: true
      })

      const response = await updatePreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification preferences updated successfully')
      expect(data.preferences).toEqual(mockPreference)
    })

    it('should validate request body', async () => {
      const request = createNextRequest('/api/notifications', 'POST', {
        type: 'invalid_type',
        channels: ['invalid_channel']
      })

      const response = await updatePreferences(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })
  })

  describe('PUT /api/notifications/[id]', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: '1',
        status: 'read',
        readAt: new Date().toISOString()
      }

      mockNotificationService.markAsRead.mockResolvedValue(mockNotification)

      const request = createNextRequest('/api/notifications/1', 'PUT', {
        action: 'read'
      })

      const response = await updateNotification(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification read successfully')
      expect(data.notification).toEqual(mockNotification)
    })

    it('should archive notification', async () => {
      const mockNotification = {
        id: '1',
        status: 'archived'
      }

      mockNotificationService.archiveNotification.mockResolvedValue(mockNotification)

      const request = createNextRequest('/api/notifications/1', 'PUT', {
        action: 'archive'
      })

      const response = await updateNotification(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification archive successfully')
      expect(data.notification).toEqual(mockNotification)
    })

    it('should handle invalid action', async () => {
      const request = createNextRequest('/api/notifications/1', 'PUT', {
        action: 'invalid_action'
      })

      const response = await updateNotification(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })
  })

  describe('DELETE /api/notifications/[id]', () => {
    it('should archive notification on delete', async () => {
      const mockNotification = {
        id: '1',
        status: 'archived'
      }

      mockNotificationService.archiveNotification.mockResolvedValue(mockNotification)

      const request = createNextRequest('/api/notifications/1', 'DELETE')
      const response = await deleteNotification(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification archived successfully')
      expect(data.notification).toEqual(mockNotification)
    })
  })

  describe('GET /api/notifications/preferences', () => {
    it('should return notification preferences', async () => {
      const mockPreferences = {
        type: 'match_created',
        channels: ['in_app', 'email'],
        enabled: true
      }

      mockNotificationService.getNotificationPreferences.mockResolvedValue(mockPreferences)

      const request = createNextRequest('/api/notifications/preferences?type=match_created')
      const response = await getPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toEqual(mockPreferences)
    })
  })

  describe('POST /api/notifications/preferences', () => {
    it('should create notification preference', async () => {
      const mockPreference = {
        id: '1',
        type: 'match_created',
        channels: ['in_app', 'email'],
        enabled: true
      }

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(mockPreference)

      const request = createNextRequest('/api/notifications/preferences', 'POST', {
        type: 'match_created',
        channels: ['in_app', 'email'],
        enabled: true
      })

      const response = await createPreference(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification preferences updated successfully')
      expect(data.preferences).toEqual(mockPreference)
    })
  })

  describe('PUT /api/notifications/preferences', () => {
    it('should bulk update notification preferences', async () => {
      const mockPreferences = [
        { id: '1', type: 'match_created', channels: ['in_app'], enabled: true },
        { id: '2', type: 'offer_received', channels: ['email'], enabled: false }
      ]

      mockNotificationService.updateNotificationPreferences
        .mockResolvedValueOnce(mockPreferences[0])
        .mockResolvedValueOnce(mockPreferences[1])

      const request = createNextRequest('/api/notifications/preferences', 'PUT', {
        preferences: [
          { type: 'match_created', channels: ['in_app'], enabled: true },
          { type: 'offer_received', channels: ['email'], enabled: false }
        ]
      })

      const response = await bulkUpdatePreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification preferences updated successfully')
      expect(data.preferences).toEqual(mockPreferences)
    })
  })

  describe('POST /api/notifications/create', () => {
    it('should create notification successfully', async () => {
      const mockNotification = {
        id: '1',
        type: 'match_created',
        title: 'New Match',
        message: 'You have a new match',
        status: 'unread'
      }

      mockNotificationService.createNotification.mockResolvedValue(mockNotification)

      const request = createNextRequest('/api/notifications/create', 'POST', {
        userId: 'test-user-id',
        type: 'match_created',
        title: 'New Match',
        message: 'You have a new match'
      })

      const response = await createNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification created and sent successfully')
      expect(data.notification).toEqual(mockNotification)
    })

    it('should handle skipped notifications', async () => {
      mockNotificationService.createNotification.mockResolvedValue(null)

      const request = createNextRequest('/api/notifications/create', 'POST', {
        userId: 'test-user-id',
        type: 'match_created',
        title: 'New Match',
        message: 'You have a new match'
      })

      const response = await createNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Notification skipped due to user preferences or quiet hours')
      expect(data.skipped).toBe(true)
    })

    it('should validate notification data', async () => {
      const request = createNextRequest('/api/notifications/create', 'POST', {
        userId: 'test-user-id',
        type: 'invalid_type',
        title: '',
        message: ''
      })

      const response = await createNotification(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })
  })

  describe('PUT /api/notifications/create', () => {
    it('should create bulk notifications successfully', async () => {
      const mockNotifications = [
        { id: '1', type: 'match_created', title: 'Match 1' },
        { id: '2', type: 'offer_received', title: 'Offer 1' }
      ]

      mockNotificationService.createNotification
        .mockResolvedValueOnce(mockNotifications[0])
        .mockResolvedValueOnce(mockNotifications[1])

      const request = createNextRequest('/api/notifications/create', 'PUT', [
        {
          userId: 'test-user-id',
          type: 'match_created',
          title: 'Match 1',
          message: 'You have a new match'
        },
        {
          userId: 'test-user-id',
          type: 'offer_received',
          title: 'Offer 1',
          message: 'You have a new offer'
        }
      ])

      const response = await bulkCreateNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Bulk notifications processed')
      expect(data.summary.total).toBe(2)
      expect(data.summary.successful).toBe(2)
      expect(data.summary.failed).toBe(0)
      expect(data.summary.skipped).toBe(0)
    })

    it('should handle mixed results in bulk creation', async () => {
      mockNotificationService.createNotification
        .mockResolvedValueOnce({ id: '1', type: 'match_created' })
        .mockResolvedValueOnce(null) // skipped
        .mockRejectedValueOnce(new Error('Failed')) // failed

      const request = createNextRequest('/api/notifications/create', 'PUT', [
        { userId: 'test-user-id', type: 'match_created', title: 'Match 1', message: 'Match' },
        { userId: 'test-user-id', type: 'offer_received', title: 'Offer 1', message: 'Offer' },
        { userId: 'test-user-id', type: 'payment_released', title: 'Payment 1', message: 'Payment' }
      ])

      const response = await bulkCreateNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.total).toBe(3)
      expect(data.summary.successful).toBe(1)
      expect(data.summary.failed).toBe(1)
      expect(data.summary.skipped).toBe(1)
    })
  })
})
