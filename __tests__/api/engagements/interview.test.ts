import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/engagements/[id]/interview/route'
import { prisma } from '@/lib/prisma'
import { notificationService } from '@/lib/notifications/notification-service'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    engagement: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}))

jest.mock('@/lib/notifications/notification-service', () => ({
  notificationService: {
    bulkCreateNotifications: jest.fn()
  }
}))

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))



describe('/api/engagements/[id]/interview', () => {
  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
    role: 'admin'
  }

  const mockEngagement = {
    id: 'engagement-1',
    status: 'staged',
    totalAmount: 10000,
    offer: {
      id: 'offer-1',
      amount: 10000,
      message: 'Test offer',
      talentRequest: {
        id: 'request-1',
        title: 'Test Request',
        companyId: 'company-1',
        company: {
          id: 'company-1',
          name: 'Seeker Company',
          users: [
            { id: 'user-1', role: 'admin' },
            { id: 'user-2', role: 'member' }
          ]
        }
      },
      talentProfile: {
        id: 'profile-1',
        name: 'Test Talent',
        companyId: 'company-2',
        company: {
          id: 'company-2',
          name: 'Provider Company',
          users: [
            { id: 'user-3', role: 'admin' },
            { id: 'user-4', role: 'member' }
          ]
        }
      },
      company: {
        id: 'company-1',
        name: 'Seeker Company',
        users: [
          { id: 'user-1', role: 'admin' },
          { id: 'user-2', role: 'member' }
        ]
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(require('@/lib/auth').getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)
    ;(prisma.engagement.update as jest.Mock).mockResolvedValue({
      ...mockEngagement,
      status: 'interviewing',
      updatedAt: new Date()
    })
    ;(notificationService.bulkCreateNotifications as jest.Mock).mockResolvedValue([])
  })

  describe('POST', () => {
    it('should update engagement status to interviewing', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        body: JSON.stringify({
          status: 'interviewing',
          notes: 'Scheduling interview',
          interviewDate: '2024-01-15T10:00:00Z',
          interviewDuration: 60,
          interviewerName: 'John Doe',
          interviewType: 'video'
        })
      })

      const response = await POST(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.status).toBe('interviewing')
      expect(prisma.engagement.update).toHaveBeenCalledWith({
        where: { id: 'engagement-1' },
        data: {
          status: 'interviewing',
          updatedAt: expect.any(Date)
        },
        include: expect.any(Object)
      })
    })

    it('should trigger manual invoicing when status is accepted', async () => {
      // First update the mock to simulate an engagement in 'interviewing' status
      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue({
        ...mockEngagement,
        status: 'interviewing'
      })

      // Update the update mock to return 'accepted' status
      ;(prisma.engagement.update as jest.Mock).mockResolvedValue({
        ...mockEngagement,
        status: 'accepted',
        updatedAt: new Date()
      })

      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        body: JSON.stringify({
          status: 'accepted',
          notes: 'Interview successful'
        })
      })

      const response = await POST(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.status).toBe('accepted')
      
      // Should create notifications for manual invoicing
      expect(notificationService.bulkCreateNotifications).toHaveBeenCalledTimes(3)
    })

    it('should reject invalid status transitions', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        body: JSON.stringify({
          status: 'accepted' // Cannot go directly from staged to accepted
        })
      })

      const response = await POST(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid status transition')
    })

    it('should validate required fields for interview scheduling', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        body: JSON.stringify({
          status: 'interviewing',
          interviewDuration: 1000 // Exceeds max limit
        })
      })

      const response = await POST(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request data')
    })

    it('should return 401 for unauthorized users', async () => {
      ;(require('@/lib/auth').getCurrentUser as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        body: JSON.stringify({
          status: 'interviewing'
        })
      })

      const response = await POST(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent engagement', async () => {
      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/engagements/non-existent/interview', {
        method: 'POST',
        body: JSON.stringify({
          status: 'interviewing'
        })
      })

      const response = await POST(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Engagement not found')
    })
  })

  describe('GET', () => {
    it('should return engagement details', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview')

      const response = await GET(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.id).toBe('engagement-1')
      expect(data.engagement.status).toBe('staged')
      expect(data.engagement.offer.talentRequest.title).toBe('Test Request')
      expect(data.engagement.offer.talentProfile.name).toBe('Test Talent')
    })

    it('should return 401 for unauthorized users', async () => {
      ;(require('@/lib/auth').getCurrentUser as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview')

      const response = await GET(request, { params: { id: 'engagement-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent engagement', async () => {
      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/engagements/non-existent/interview')

      const response = await GET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Engagement not found')
    })
  })
})
