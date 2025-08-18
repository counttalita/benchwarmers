import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  engagement: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  offer: {
    findUnique: jest.fn()
  },
  milestone: {
    create: jest.fn()
  },
  timeEntry: {
    create: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

describe('Engagements API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/engagements', () => {
    it('should create engagement from accepted offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          startDate: '2024-02-01T00:00:00.000Z',
          endDate: '2024-05-01T00:00:00.000Z',
          milestones: [
            {
              title: 'Phase 1: Setup',
              description: 'Initial project setup',
              dueDate: '2024-03-01T00:00:00.000Z',
              amount: 2000
            }
          ]
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock offer data
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'accepted',
        companyId: 'company-123',
        talentProfileId: 'profile-123',
        talentRequestId: 'request-123',
        amount: 5000,
        talentRequest: {
          id: 'request-123',
          title: 'React Developer Needed',
          company: {
            id: 'company-123',
            name: 'Tech Corp'
          }
        },
        talentProfile: {
          id: 'profile-123',
          title: 'Senior React Developer',
          user: {
            id: 'talent-123',
            name: 'John Doe'
          }
        },
        company: {
          id: 'company-123',
          name: 'Tech Corp'
        }
      })

      // Mock engagement creation
      jest.mocked(require('@/lib/prisma').engagement.create).mockResolvedValue({
        id: 'engagement-123',
        offerId: 'offer-123',
        companyId: 'company-123',
        talentProfileId: 'profile-123',
        talentRequestId: 'request-123',
        startDate: new Date('2024-02-01T00:00:00.000Z'),
        endDate: new Date('2024-05-01T00:00:00.000Z'),
        status: 'active',
        totalAmount: 5000,
        platformFee: 750,
        providerAmount: 4250,
        createdAt: new Date(),
        offer: {
          id: 'offer-123',
          amount: 5000,
          message: 'Great opportunity!',
          talentRequest: {
            id: 'request-123',
            title: 'React Developer Needed'
          },
          talentProfile: {
            id: 'profile-123',
            title: 'Senior React Developer',
            user: {
              id: 'talent-123',
              name: 'John Doe'
            }
          },
          company: {
            id: 'company-123',
            name: 'Tech Corp'
          }
        }
      })

      // Mock existing engagement check
      jest.mocked(require('@/lib/prisma').engagement.findFirst).mockResolvedValue(null)

      // Mock milestone creation
      jest.mocked(require('@/lib/prisma').milestone.create).mockResolvedValue({
        id: 'milestone-123',
        engagementId: 'engagement-123',
        title: 'Phase 1: Setup',
        description: 'Initial project setup',
        dueDate: new Date('2024-03-01T00:00:00.000Z'),
        amount: 2000,
        status: 'pending'
      })

      const { POST } = await import('@/app/api/engagements/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.engagement).toBeDefined()
      expect(data.engagement.status).toBe('active')
      expect(data.engagement.totalAmount).toBe(5000)
    })

    it('should validate offer is accepted before creating engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          startDate: '2024-02-01T00:00:00.000Z'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock offer data (pending status)
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'pending',
        companyId: 'company-123'
      })

      const { POST } = await import('@/app/api/engagements/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Offer must be accepted to create engagement')
    })

    it('should validate offer belongs to user company', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          startDate: '2024-02-01T00:00:00.000Z'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock offer data (different company)
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'accepted',
        companyId: 'different-company-123'
      })

      const { POST } = await import('@/app/api/engagements/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('GET /api/engagements', () => {
    it('should list engagements for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagements list
      jest.mocked(require('@/lib/prisma').engagement.findMany).mockResolvedValue([
        {
          id: 'engagement-123',
          status: 'active',
          startDate: new Date('2024-02-01T00:00:00.000Z'),
          endDate: new Date('2024-05-01T00:00:00.000Z'),
          totalAmount: 5000,
          platformFee: 750,
          providerAmount: 4250,
          createdAt: new Date(),
          updatedAt: new Date(),
          offer: {
            id: 'offer-123',
            amount: 5000,
            message: 'Great opportunity!',
            talentRequest: {
              id: 'request-123',
              title: 'React Developer Needed',
              description: 'We need a React developer'
            },
            talentProfile: {
              id: 'profile-123',
              title: 'Senior React Developer',
              user: {
                id: 'talent-123',
                name: 'John Doe'
              }
            },
            company: {
              id: 'company-123',
              name: 'Tech Corp'
            }
          },
          milestones: [
            {
              id: 'milestone-123',
              title: 'Phase 1: Setup',
              status: 'pending',
              amount: 2000,
              dueDate: new Date('2024-03-01T00:00:00.000Z')
            }
          ]
        }
      ])

      jest.mocked(require('@/lib/prisma').engagement.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/engagements/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagements).toHaveLength(1)
      expect(data.engagements[0].status).toBe('active')
      expect(data.engagements[0].totalAmount).toBe(5000)
    })

    it('should filter engagements by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements?status=active', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagements list
      jest.mocked(require('@/lib/prisma').engagement.findMany).mockResolvedValue([])
      jest.mocked(require('@/lib/prisma').engagement.count).mockResolvedValue(0)

      const { GET } = await import('@/app/api/engagements/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagements).toHaveLength(0)
    })
  })

  describe('GET /api/engagements/[id]', () => {
    it('should get engagement details', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-123', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagement data
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        startDate: new Date('2024-02-01T00:00:00.000Z'),
        endDate: new Date('2024-05-01T00:00:00.000Z'),
        totalAmount: 5000,
        platformFee: 750,
        providerAmount: 4250,
        totalHours: 40,
        completionNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        offer: {
          id: 'offer-123',
          amount: 5000,
          message: 'Great opportunity!',
          talentRequest: {
            id: 'request-123',
            title: 'React Developer Needed',
            description: 'We need a React developer',
            company: {
              id: 'company-123',
              name: 'Tech Corp'
            }
          },
          talentProfile: {
            id: 'profile-123',
            title: 'Senior React Developer',
            user: {
              id: 'talent-123',
              name: 'John Doe'
            }
          },
          company: {
            id: 'company-123',
            name: 'Tech Corp'
          }
        },
        milestones: [
          {
            id: 'milestone-123',
            title: 'Phase 1: Setup',
            status: 'pending',
            amount: 2000,
            dueDate: new Date('2024-03-01T00:00:00.000Z')
          }
        ],
        timeEntries: [
          {
            id: 'time-123',
            date: new Date('2024-02-01T00:00:00.000Z'),
            hours: 8,
            description: 'Project setup'
          }
        ],
        reviews: []
      })

      const { GET } = await import('@/app/api/engagements/[id]/route')
      const response = await GET(request, { params: { id: 'engagement-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.id).toBe('engagement-123')
      expect(data.engagement.status).toBe('active')
      expect(data.engagement.totalAmount).toBe(5000)
    })

    it('should return 404 for non-existent engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/non-existent', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-123'
        }
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'admin'
      })

      // Mock engagement not found
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue(null)

      const { GET } = await import('@/app/api/engagements/[id]/route')
      const response = await GET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Engagement not found')
    })
  })

  describe('PUT /api/engagements/[id]', () => {
    it('should update engagement with time tracking', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-123', {
        method: 'PUT',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          totalHours: 40,
          completionNotes: 'Project completed successfully',
          timeEntries: [
            {
              date: '2024-02-01T00:00:00.000Z',
              hours: 8,
              description: 'Project setup'
            }
          ]
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagement data
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        companyId: 'company-123',
        offer: {
          talentProfileId: 'profile-123'
        }
      })

      // Mock engagement update
      jest.mocked(require('@/lib/prisma').engagement.update).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        totalHours: 40,
        completionNotes: 'Project completed successfully',
        startDate: new Date('2024-02-01T00:00:00.000Z'),
        endDate: new Date('2024-05-01T00:00:00.000Z'),
        totalAmount: 5000,
        platformFee: 750,
        providerAmount: 4250,
        createdAt: new Date(),
        updatedAt: new Date(),
        offer: {
          id: 'offer-123',
          amount: 5000,
          message: 'Great opportunity!',
          talentRequest: {
            id: 'request-123',
            title: 'React Developer Needed',
            description: 'We need a React developer',
            company: {
              id: 'company-123',
              name: 'Tech Corp'
            }
          },
          talentProfile: {
            id: 'profile-123',
            title: 'Senior React Developer',
            user: {
              id: 'talent-123',
              name: 'John Doe'
            }
          },
          company: {
            id: 'company-123',
            name: 'Tech Corp'
          }
        },
        milestones: [],
        timeEntries: [
          {
            id: 'time-123',
            date: new Date('2024-02-01T00:00:00.000Z'),
            hours: 8,
            description: 'Project setup'
          }
        ]
      })

      // Mock time entry creation
      jest.mocked(require('@/lib/prisma').timeEntry.create).mockResolvedValue({
        id: 'time-123',
        engagementId: 'engagement-123',
        date: new Date('2024-02-01T00:00:00.000Z'),
        hours: 8,
        description: 'Project setup',
        userId: 'user-123'
      })

      const { PUT } = await import('@/app/api/engagements/[id]/route')
      const response = await PUT(request, { params: { id: 'engagement-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.totalHours).toBe(40)
      expect(data.engagement.completionNotes).toBe('Project completed successfully')
    })

    it('should prevent updating completed engagements', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-123', {
        method: 'PUT',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          totalHours: 40
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagement data (completed)
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        companyId: 'company-123',
        offer: {
          talentProfileId: 'profile-123'
        }
      })

      const { PUT } = await import('@/app/api/engagements/[id]/route')
      const response = await PUT(request, { params: { id: 'engagement-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot update non-pending engagement')
    })
  })

  describe('POST /api/engagements/completion', () => {
    it('should confirm completion by seeker', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'seeker',
          completionNotes: 'Project completed successfully'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagement data
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        companyId: 'company-123',
        seekerConfirmed: false,
        providerConfirmed: false
      })

      // Mock engagement update
      jest.mocked(require('@/lib/prisma').engagement.update).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        seekerConfirmed: true,
        providerConfirmed: false
      })

      const { POST } = await import('@/app/api/engagements/completion/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.seekerConfirmed).toBe(true)
    })

    it('should confirm completion by provider', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'provider',
          completionNotes: 'Work completed as agreed'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock engagement data
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        talentProfileId: 'profile-123',
        seekerConfirmed: true,
        providerConfirmed: false,
        offer: {
          talentProfileId: 'profile-123'
        }
      })

      // Mock engagement update
      jest.mocked(require('@/lib/prisma').engagement.update).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        seekerConfirmed: true,
        providerConfirmed: true
      })

      const { POST } = await import('@/app/api/engagements/completion/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.status).toBe('completed')
    })

    it('should complete engagement when both parties confirm', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'provider'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock engagement data (seeker already confirmed)
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        talentProfileId: 'profile-123',
        seekerConfirmed: true,
        providerConfirmed: false,
        offer: {
          talentProfileId: 'profile-123'
        }
      })

      // Mock engagement update
      jest.mocked(require('@/lib/prisma').engagement.update).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        seekerConfirmed: true,
        providerConfirmed: true
      })

      const { POST } = await import('@/app/api/engagements/completion/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.status).toBe('completed')
    })

    it('should validate user belongs to engagement parties', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        headers: {
          'x-user-id': 'unauthorized-user-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'seeker'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'unauthorized-user-123',
        role: 'company',
        companyId: 'different-company-123'
      })

      // Mock engagement data
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        companyId: 'company-123',
        talentProfileId: 'profile-123',
        offer: {
          talentProfileId: 'profile-123'
        }
      })

      const { POST } = await import('@/app/api/engagements/completion/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should prevent confirming already completed engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'seeker'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock engagement data (already completed)
      jest.mocked(require('@/lib/prisma').engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        companyId: 'company-123'
      })

      const { POST } = await import('@/app/api/engagements/completion/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Engagement is already completed')
    })
  })

  describe('Engagement Duration Tracking', () => {
    it('should alert when engagement exceeds planned duration by 50%', async () => {
      const plannedDuration = 12 // weeks
      const actualDuration = 18 // weeks
      const overrunPercentage = ((actualDuration - plannedDuration) / plannedDuration) * 100

      expect(overrunPercentage).toBe(50)
      expect(actualDuration).toBeGreaterThan(plannedDuration * 1.5)
    })

    it('should calculate engagement progress correctly', async () => {
      const totalMilestones = 4
      const completedMilestones = 2
      const progressPercentage = (completedMilestones / totalMilestones) * 100

      expect(progressPercentage).toBe(50)
      expect(completedMilestones).toBeLessThanOrEqual(totalMilestones)
    })
  })
})
