import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/engagements/[id]/interview/route'
import { prisma } from '@/lib/prisma'
import { notificationService } from '@/lib/notifications/notification-service'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    engagement: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/notifications/notification-service', () => ({
  notificationService: {
    bulkCreateNotifications: jest.fn(),
  },
}))

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}))

describe('/api/engagements/[id]/interview', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock getCurrentUser to return a test user
    const { getCurrentUser } = require('@/lib/auth')
    getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'admin',
    })

    // Mock request
    mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  describe('POST /api/engagements/[id]/interview', () => {
    it('should update engagement status to staged', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        status: 'active',
        talentRequestId: 'request-1',
        talentProfileId: 'profile-1',
        talentRequest: {
          companyId: 'company-1',
          company: {
            name: 'Test Company',
          },
        },
        talentProfile: {
          name: 'Test Talent',
        },
      }

      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)
      ;(prisma.engagement.update as jest.Mock).mockResolvedValue({
        ...mockEngagement,
        status: 'staged',
      })
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', email: 'admin@example.com' },
      ])

      const requestBody = {
        status: 'staged',
        interviewNotes: 'Great candidate',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'engagement-1' }) })

      expect(response.status).toBe(200)
      expect(prisma.engagement.update).toHaveBeenCalledWith({
        where: { id: 'engagement-1' },
        data: {
          status: 'staged',
          interviewNotes: 'Great candidate',
        },
        include: {
          talentRequest: {
            include: {
              company: true,
            },
          },
          talentProfile: true,
        },
      })
    })

    it('should update engagement status to interviewing', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        status: 'staged',
        talentRequestId: 'request-1',
        talentProfileId: 'profile-1',
        talentRequest: {
          companyId: 'company-1',
          company: {
            name: 'Test Company',
          },
        },
        talentProfile: {
          name: 'Test Talent',
        },
      }

      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)
      ;(prisma.engagement.update as jest.Mock).mockResolvedValue({
        ...mockEngagement,
        status: 'interviewing',
      })
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', email: 'admin@example.com' },
      ])

      const requestBody = {
        status: 'interviewing',
        interviewNotes: 'Scheduling interview',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'engagement-1' }) })

      expect(response.status).toBe(200)
      expect(prisma.engagement.update).toHaveBeenCalledWith({
        where: { id: 'engagement-1' },
        data: {
          status: 'interviewing',
          interviewNotes: 'Scheduling interview',
        },
        include: {
          talentRequest: {
            include: {
              company: true,
            },
          },
          talentProfile: true,
        },
      })
    })

    it('should update engagement status to accepted and trigger notifications', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        status: 'interviewing',
        talentRequestId: 'request-1',
        talentProfileId: 'profile-1',
        talentRequest: {
          companyId: 'company-1',
          company: {
            name: 'Test Company',
          },
        },
        talentProfile: {
          name: 'Test Talent',
        },
      }

      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)
      ;(prisma.engagement.update as jest.Mock).mockResolvedValue({
        ...mockEngagement,
        status: 'accepted',
      })
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', email: 'admin@example.com' },
      ])

      const requestBody = {
        status: 'accepted',
        interviewNotes: 'Excellent candidate, accepted',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'engagement-1' }) })

      expect(response.status).toBe(200)
      expect(notificationService.bulkCreateNotifications).toHaveBeenCalledTimes(3)
    })

    it('should update engagement status to rejected', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        status: 'interviewing',
        talentRequestId: 'request-1',
        talentProfileId: 'profile-1',
        talentRequest: {
          companyId: 'company-1',
          company: {
            name: 'Test Company',
          },
        },
        talentProfile: {
          name: 'Test Talent',
        },
      }

      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)
      ;(prisma.engagement.update as jest.Mock).mockResolvedValue({
        ...mockEngagement,
        status: 'rejected',
      })
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', email: 'admin@example.com' },
      ])

      const requestBody = {
        status: 'rejected',
        interviewNotes: 'Not a good fit',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'engagement-1' }) })

      expect(response.status).toBe(200)
      expect(prisma.engagement.update).toHaveBeenCalledWith({
        where: { id: 'engagement-1' },
        data: {
          status: 'rejected',
          interviewNotes: 'Not a good fit',
        },
        include: {
          talentRequest: {
            include: {
              company: true,
            },
          },
          talentProfile: true,
        },
      })
    })

    it('should reject invalid status transitions', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        status: 'active',
        talentRequestId: 'request-1',
        talentProfileId: 'profile-1',
        talentRequest: {
          companyId: 'company-1',
          company: {
            name: 'Test Company',
          },
        },
        talentProfile: {
          name: 'Test Talent',
        },
      }

      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)

      const requestBody = {
        status: 'staged',
        interviewNotes: 'Invalid transition',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'engagement-1' }) })

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent engagement', async () => {
      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(null)

      const requestBody = {
        status: 'staged',
        interviewNotes: 'Test',
      }

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/non-existent/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/engagements/[id]/interview', () => {
    it('should return engagement interview details', async () => {
      const mockEngagement = {
        id: 'engagement-1',
        status: 'interviewing',
        interviewNotes: 'Great candidate',
        talentRequest: {
          company: {
            name: 'Test Company',
          },
        },
        talentProfile: {
          name: 'Test Talent',
        },
      }

      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(mockEngagement)

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/engagement-1/interview', {
        method: 'GET',
      })

      const response = await GET(mockRequest, { params: Promise.resolve({ id: 'engagement-1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.engagement).toEqual(mockEngagement)
    })

    it('should return 404 for non-existent engagement', async () => {
      ;(prisma.engagement.findUnique as jest.Mock).mockResolvedValue(null)

      mockRequest = new NextRequest('http://localhost:3000/api/engagements/non-existent/interview', {
        method: 'GET',
      })

      const response = await GET(mockRequest, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })
  })
})
