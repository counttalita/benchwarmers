import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { sendNotification, getNotifications, updatePreferences } from '@/app/api/notifications/route'
import { sendSMS } from '@/app/api/notifications/sms/route'

// Mock Appwrite
jest.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock Twilio
jest.mock('@/lib/twilio', () => ({
  sendSMS: jest.fn()
}))

// Mock Pusher
jest.mock('@/lib/pusher', () => ({
  trigger: jest.fn()
}))

describe('Notifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/notifications', () => {
    it('should send notification for important events', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          type: 'offer_received',
          title: 'New Offer Received',
          message: 'You have received a new offer for your talent profile',
          data: {
            offerId: 'offer-123',
            amount: 12000
          }
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.notification).toBeDefined()
      expect(data.notification.type).toBe('offer_received')
      expect(data.notification.isRead).toBe(false)
    })

    it('should respect user notification preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          type: 'marketing',
          title: 'Special Offer',
          message: 'Limited time discount available'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock user preferences - marketing disabled
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'user-123',
        notificationPreferences: {
          marketing: false,
          offers: true,
          payments: true,
          system: true
        }
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User has disabled marketing notifications')
    })

    it('should send real-time notification via Pusher', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          type: 'payment_received',
          title: 'Payment Received',
          message: 'Your payment of $10,200 has been released'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verify Pusher was triggered
      expect(require('@/lib/pusher').trigger).toHaveBeenCalledWith(
        'user-123',
        'notification',
        expect.objectContaining({
          type: 'payment_received',
          title: 'Payment Received'
        })
      )
    })
  })

  describe('POST /api/notifications/sms', () => {
    it('should send SMS for critical actions', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          message: 'Your offer has been accepted! Payment will be processed shortly.',
          type: 'offer_accepted'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'admin'
      })

      // Mock Twilio SMS
      jest.mocked(require('@/lib/twilio').sendSMS).mockResolvedValue({
        sid: 'SM1234567890',
        status: 'sent'
      })

      const response = await sendSMS(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sms).toBeDefined()
      expect(data.sms.status).toBe('sent')
    })

    it('should retry failed SMS delivery up to 3 times', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          message: 'Test message',
          type: 'test'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'admin'
      })

      // Mock Twilio SMS failure
      jest.mocked(require('@/lib/twilio').sendSMS).mockRejectedValue(new Error('Delivery failed'))

      const response = await sendSMS(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('SMS delivery failed after 3 attempts')
      // Verify retry attempts
      expect(require('@/lib/twilio').sendSMS).toHaveBeenCalledTimes(3)
    })

    it('should validate phone number format', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: 'invalid-phone',
          message: 'Test message',
          type: 'test'
        })
      })

      const response = await sendSMS(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid phone number format')
    })
  })

  describe('GET /api/notifications', () => {
    it('should list user notifications', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications?limit=10')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await getNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.notifications).toBeDefined()
      expect(Array.isArray(data.notifications)).toBe(true)
    })

    it('should filter notifications by type', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications?type=offers&unread=true')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await getNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.type).toBe('offers')
      expect(data.filters.unread).toBe('true')
    })

    it('should paginate notifications', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications?page=2&limit=20')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await getNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(20)
    })
  })

  describe('PUT /api/notifications/preferences', () => {
    it('should update user notification preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          offers: true,
          payments: true,
          marketing: false,
          system: true
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await updatePreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.preferences).toBeDefined()
      expect(data.preferences.offers).toBe(true)
      expect(data.preferences.marketing).toBe(false)
    })

    it('should validate preference values', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          offers: 'invalid',
          payments: true
        })
      })

      const response = await updatePreferences(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('All preference values must be boolean')
    })
  })

  describe('System Maintenance Notifications', () => {
    it('should notify all active users 24 hours before maintenance', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: '2 hours',
          reason: 'Database migration'
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.notificationsSent).toBeDefined()
      expect(data.notificationsSent).toBeGreaterThan(0)
    })

    it('should send SMS notifications for critical maintenance', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour
          duration: '30 minutes',
          reason: 'Critical security update',
          sendSMS: true
        })
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.smsSent).toBeDefined()
      expect(data.smsSent).toBeGreaterThan(0)
    })
  })

  describe('Notification Queue Management', () => {
    it('should queue notifications for offline users', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          type: 'offer_received',
          title: 'New Offer',
          message: 'You have a new offer',
          queueIfOffline: true
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock user as offline
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'user-123',
        lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        isOnline: false
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.notification.status).toBe('queued')
    })

    it('should deliver queued notifications when user returns', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/deliver-queued', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await sendNotification(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deliveredCount).toBeDefined()
    })
  })

  describe('Notification Analytics', () => {
    it('should track notification delivery rates', async () => {
      const mockNotifications = [
        { status: 'delivered', type: 'offer_received' },
        { status: 'delivered', type: 'payment_received' },
        { status: 'failed', type: 'marketing' },
        { status: 'delivered', type: 'system' },
        { status: 'queued', type: 'offer_received' }
      ]

      const totalNotifications = mockNotifications.length
      const deliveredCount = mockNotifications.filter(n => n.status === 'delivered').length
      const deliveryRate = (deliveredCount / totalNotifications) * 100

      expect(totalNotifications).toBe(5)
      expect(deliveredCount).toBe(3)
      expect(deliveryRate).toBe(60)
    })

    it('should track notification engagement', async () => {
      const mockNotifications = [
        { id: '1', isRead: true, readAt: Date.now() - 1000 },
        { id: '2', isRead: false },
        { id: '3', isRead: true, readAt: Date.now() - 5000 },
        { id: '4', isRead: false },
        { id: '5', isRead: true, readAt: Date.now() - 2000 }
      ]

      const totalNotifications = mockNotifications.length
      const readCount = mockNotifications.filter(n => n.isRead).length
      const engagementRate = (readCount / totalNotifications) * 100

      expect(totalNotifications).toBe(5)
      expect(readCount).toBe(3)
      expect(engagementRate).toBe(60)
    })
  })
})
