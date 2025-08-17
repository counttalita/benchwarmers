import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  offer: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  talentRequest: {
    findUnique: jest.fn()
  },
  talentProfile: {
    findUnique: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  },
  company: {
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

describe('Offers API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/offers', () => {
    it('should create an offer with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          talentRequestId: 'request-123',
          talentProfileId: 'profile-123',
          amount: 5000,
          message: 'Great opportunity!',
          startDate: '2024-02-01T00:00:00.000Z',
          endDate: '2024-05-01T00:00:00.000Z',
          terms: 'Standard terms apply'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock talent request
      jest.mocked(require('@/lib/prisma').talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        companyId: 'company-123',
        title: 'React Developer Needed',
        company: {
          id: 'company-123',
          name: 'Tech Corp'
        }
      })

      // Mock talent profile
      jest.mocked(require('@/lib/prisma').talentProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: 'talent-123',
        title: 'Senior React Developer'
      })

      // Mock offer creation
      jest.mocked(require('@/lib/prisma').offer.create).mockResolvedValue({
        id: 'offer-123',
        talentRequestId: 'request-123',
        talentProfileId: 'profile-123',
        companyId: 'company-123',
        amount: 5000,
        message: 'Great opportunity!',
        status: 'pending',
        expiresAt: new Date('2024-02-08T00:00:00.000Z'),
        createdAt: new Date(),
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
      })

      // Mock existing offer check
      jest.mocked(require('@/lib/prisma').offer.findFirst).mockResolvedValue(null)

      // Import the route handler dynamically
      const { POST } = await import('@/app/api/offers/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.offer).toBeDefined()
      expect(data.offer.amount).toBe(5000)
      expect(data.offer.status).toBe('pending')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123'
        },
        body: JSON.stringify({
          talentRequestId: '',
          amount: 0
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      const { POST } = await import('@/app/api/offers/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should only allow companies to create offers', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123'
        },
        body: JSON.stringify({
          talentRequestId: 'request-123',
          talentProfileId: 'profile-123',
          amount: 5000
        })
      })

      // Mock authenticated user (talent role)
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'talent'
      })

      const { POST } = await import('@/app/api/offers/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only companies can create offers')
    })

    it('should validate talent request belongs to user company', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        headers: {
          'x-user-id': 'user-123',
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          talentRequestId: 'request-123',
          talentProfileId: 'profile-123',
          amount: 5000
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'company',
        companyId: 'company-123'
      })

      // Mock talent request with different company
      jest.mocked(require('@/lib/prisma').talentRequest.findUnique).mockResolvedValue({
        id: 'request-123',
        companyId: 'different-company-123',
        title: 'React Developer Needed'
      })

      const { POST } = await import('@/app/api/offers/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('GET /api/offers', () => {
    it('should list offers for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
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

      // Mock offers list
      jest.mocked(require('@/lib/prisma').offer.findMany).mockResolvedValue([
        {
          id: 'offer-123',
          amount: 5000,
          message: 'Great opportunity!',
          status: 'pending',
          expiresAt: new Date('2024-02-08T00:00:00.000Z'),
          createdAt: new Date(),
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
        }
      ])

      jest.mocked(require('@/lib/prisma').offer.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/offers/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offers).toHaveLength(1)
      expect(data.offers[0].amount).toBe(5000)
    })

    it('should filter offers by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers?status=pending', {
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

      // Mock offers list
      jest.mocked(require('@/lib/prisma').offer.findMany).mockResolvedValue([])
      jest.mocked(require('@/lib/prisma').offer.count).mockResolvedValue(0)

      const { GET } = await import('@/app/api/offers/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offers).toHaveLength(0)
    })
  })

  describe('GET /api/offers/[id]', () => {
    it('should get a specific offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/offer-123', {
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

      // Mock offer data
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        amount: 5000,
        message: 'Great opportunity!',
        status: 'pending',
        companyId: 'company-123',
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
      })

      const { GET } = await import('@/app/api/offers/[id]/route')
      const response = await GET(request, { params: { id: 'offer-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.id).toBe('offer-123')
      expect(data.offer.amount).toBe(5000)
    })

    it('should return 404 for non-existent offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/non-existent', {
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

      // Mock offer not found
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue(null)

      const { GET } = await import('@/app/api/offers/[id]/route')
      const response = await GET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Offer not found')
    })
  })

  describe('POST /api/offers/respond', () => {
    it('should accept an offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'accept',
          message: 'I accept this offer!'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock offer data
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'pending',
        talentProfileId: 'profile-123',
        talentProfile: {
          userId: 'talent-123'
        }
      })

      // Mock offer update
      jest.mocked(require('@/lib/prisma').offer.update).mockResolvedValue({
        id: 'offer-123',
        status: 'accepted'
      })

      const { POST } = await import('@/app/api/offers/respond/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.status).toBe('accepted')
    })

    it('should decline an offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'decline',
          reason: 'Not interested'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock offer data
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'pending',
        talentProfileId: 'profile-123',
        talentProfile: {
          userId: 'talent-123'
        }
      })

      // Mock offer update
      jest.mocked(require('@/lib/prisma').offer.update).mockResolvedValue({
        id: 'offer-123',
        status: 'declined'
      })

      const { POST } = await import('@/app/api/offers/respond/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.status).toBe('declined')
    })

    it('should create counter offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'counter',
          counterOffer: {
            amount: 6000,
            message: 'I can do it for $6000'
          }
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock offer data
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'pending',
        talentProfileId: 'profile-123',
        talentProfile: {
          userId: 'talent-123'
        }
      })

      // Mock offer update
      jest.mocked(require('@/lib/prisma').offer.update).mockResolvedValue({
        id: 'offer-123',
        status: 'countered',
        amount: 6000
      })

      const { POST } = await import('@/app/api/offers/respond/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.status).toBe('countered')
      expect(data.offer.amount).toBe(6000)
    })

    it('should prevent responding to non-pending offers', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'accept'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock offer data (already accepted)
      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'accepted',
        talentProfileId: 'profile-123',
        talentProfile: {
          userId: 'talent-123'
        }
      })

      const { POST } = await import('@/app/api/offers/respond/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot respond to non-pending offer')
    })

    it('should enforce 48-hour response deadline for counter offers', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        headers: {
          'x-user-id': 'talent-123'
        },
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'counter',
          counterOffer: {
            amount: 6000
          }
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'talent-123',
        role: 'talent'
      })

      // Mock offer data (expired)
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 3) // 3 days ago

      jest.mocked(require('@/lib/prisma').offer.findUnique).mockResolvedValue({
        id: 'offer-123',
        status: 'pending',
        expiresAt: expiredDate,
        talentProfileId: 'profile-123',
        talentProfile: {
          userId: 'talent-123'
        }
      })

      const { POST } = await import('@/app/api/offers/respond/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Offer has expired')
    })
  })
})

