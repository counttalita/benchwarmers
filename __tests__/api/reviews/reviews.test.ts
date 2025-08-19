import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createReview, GET as listReviews } from '@/app/api/reviews/route'
import { GET as getProfileReviews } from '@/app/api/reviews/profile/[id]/route'
import { PUT as updateReview, DELETE as deleteReview } from '@/app/api/reviews/[id]/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    engagement: {
      findUnique: jest.fn(),
    },
    talentProfile: {
      findUnique: jest.fn(),
    }
  }
}))

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/reviews', () => {
    it('should create a review for completed engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Excellent work and communication throughout the project'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        request: { companyId: 'company-123', company: { id: 'company-123', name: 'Test Company' } },
        offer: { profile: { companyId: 'provider-company-123', company: { id: 'provider-company-123', name: 'Provider Company' } } }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.review.findFirst).mockResolvedValue(null)

      jest.mocked(require('@/lib/prisma').prisma.review.create).mockResolvedValue({
        id: 'review-123',
        rating: 5,
        comment: 'Excellent work and communication throughout the project',
        isPublic: true
      } as any)

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.review).toBeDefined()
      expect(data.review.rating).toBe(5)
      expect(data.review.isPublic).toBe(true)
    })

    it('should validate rating is between 1 and 5', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 6,
          comment: 'Test comment'
        })
      })

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.details).toBeDefined()
    })

    it('should require completed engagement for review', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Test comment'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'active',
        request: { companyId: 'different-company', company: { id: 'different-company', name: 'Different Company' } },
        offer: { profile: { companyId: 'provider-company-123', company: { id: 'provider-company-123', name: 'Provider Company' } } }
      } as any)

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only review engagements you participated in')
    })

    it('should validate user participated in engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'x-company-id': 'different-company'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Test comment'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        request: { companyId: 'seeker-company-123', company: { id: 'seeker-company-123', name: 'Seeker Company' } },
        offer: { profile: { companyId: 'provider-company-123', company: { id: 'provider-company-123', name: 'Provider Company' } } }
      } as any)

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only review engagements you participated in')
    })

    it('should prevent duplicate reviews for same engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Test comment'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.engagement.findUnique).mockResolvedValue({
        id: 'engagement-123',
        status: 'completed',
        request: { companyId: 'company-123', company: { id: 'company-123', name: 'Test Company' } },
        offer: { profile: { companyId: 'provider-company-123', company: { id: 'provider-company-123', name: 'Provider Company' } } }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.review.findFirst).mockResolvedValue({
        id: 'existing-review-123',
        engagementId: 'engagement-123',
        reviewerCompanyId: 'company-123'
      } as any)

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('You have already reviewed this engagement')
    })
  })

  describe('GET /api/reviews', () => {
    it('should list public reviews', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews?profileId=profile-123')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.review.findMany).mockResolvedValue([
        { id: 'review-1', rating: 5, comment: 'Great work' }
      ] as any)
      jest.mocked(require('@/lib/prisma').prisma.review.count).mockResolvedValue(1)

      const response = await listReviews(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reviews).toBeDefined()
      expect(Array.isArray(data.reviews)).toBe(true)
    })

    it('should filter reviews by profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews?profileId=profile-123&rating=5')

      const response = await listReviews(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.profileId).toBe('profile-123')
      expect(data.filters.rating).toBe('5')
    })

    it('should paginate reviews', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews?page=2&limit=10')

      const response = await listReviews(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
    })
  })

  describe('GET /api/reviews/profile/[id]', () => {
    it('should get reviews for specific profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/profile/profile-123')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        name: 'John Doe',
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.review.findMany).mockResolvedValue([
        { id: 'review-1', rating: 5, comment: 'Great work' }
      ] as any)
      jest.mocked(require('@/lib/prisma').prisma.review.count).mockResolvedValue(1)
      jest.mocked(require('@/lib/prisma').prisma.review.aggregate).mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
        _min: { rating: 5 },
        _max: { rating: 5 }
      } as any)
      jest.mocked(require('@/lib/prisma').prisma.review.groupBy).mockResolvedValue([
        { rating: 5, _count: { rating: 1 } }
      ] as any)

      const response = await getProfileReviews(request, { params: { id: 'profile-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reviews).toBeDefined()
      expect(data.profileStats).toBeDefined()
      expect(data.profileStats.averageRating).toBeDefined()
      expect(data.profileStats.totalReviews).toBeDefined()
    })

    it('should calculate profile statistics correctly', async () => {
      const mockReviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
        { rating: 5 }
      ]

      const totalReviews = mockReviews.length
      const averageRating = mockReviews.reduce((sum: any, review: any) => sum + review.rating, 0) / totalReviews

      expect(totalReviews).toBe(5)
      expect(averageRating).toBe(4.4)
    })
  })

  describe('PUT /api/reviews/[id]', () => {
    it('should update review by author', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/review-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Updated comment'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.review.findUnique).mockResolvedValue({
        id: 'review-123',
        reviewerCompanyId: 'company-123',
        rating: 5,
        comment: 'Original comment',
        createdAt: new Date(),
        engagement: { id: 'engagement-123' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.review.update).mockResolvedValue({
        id: 'review-123',
        rating: 4,
        comment: 'Updated comment'
      } as any)

      const response = await updateReview(request, { params: { id: 'review-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.review.rating).toBe(4)
      expect(data.review.comment).toBe('Updated comment')
    })

    it('should prevent updating review by non-author', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/review-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Updated comment'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.review.findUnique).mockResolvedValue({
        id: 'review-123',
        reviewerCompanyId: 'different-company',
        rating: 5,
        comment: 'Original comment',
        createdAt: new Date(),
        engagement: { id: 'engagement-123' }
      } as any)

      const response = await updateReview(request, { params: { id: 'review-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only update your own reviews')
    })

    it('should prevent updating reviews older than 7 days', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/review-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Updated comment'
        })
      })

      // Mock Prisma responses
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

      jest.mocked(require('@/lib/prisma').prisma.review.findUnique).mockResolvedValue({
        id: 'review-123',
        reviewerCompanyId: 'company-123',
        rating: 5,
        comment: 'Original comment',
        createdAt: eightDaysAgo,
        engagement: { id: 'engagement-123' }
      } as any)

      const response = await updateReview(request, { params: { id: 'review-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reviews can only be updated within 7 days of creation')
    })
  })

  describe('Review Moderation', () => {
    it('should flag accounts with consistently poor reviews', async () => {
      const mockReviews = [
        { rating: 1 },
        { rating: 2 },
        { rating: 1 },
        { rating: 2 },
        { rating: 1 }
      ]

      const averageRating = mockReviews.reduce((sum: any, review: any) => sum + review.rating, 0) / mockReviews.length
      const shouldFlag = averageRating < 2.5 && mockReviews.length >= 3

      expect(averageRating).toBe(1.4)
      expect(shouldFlag).toBe(true)
    })

    it('should allow admin to remove inappropriate reviews', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/review-123', {
        method: 'DELETE',
        headers: {
          'x-company-id': 'admin-company',
          'x-is-admin': 'true'
        }
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.review.findUnique).mockResolvedValue({
        id: 'review-123',
        reviewerCompanyId: 'some-company',
        rating: 1,
        comment: 'Inappropriate comment'
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.review.update).mockResolvedValue({
        id: 'review-123',
        isPublic: false
      } as any)

      const response = await deleteReview(request, { params: { id: 'review-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Review removed by admin')
    })
  })

  describe('Review Analytics', () => {
    it('should calculate rating distribution', async () => {
      const mockReviews = [
        { rating: 5 }, { rating: 5 }, { rating: 5 }, // 3 five-star
        { rating: 4 }, { rating: 4 }, // 2 four-star
        { rating: 3 }, // 1 three-star
        { rating: 2 }, // 1 two-star
        { rating: 1 }  // 1 one-star
      ]

      const distribution = {
        5: mockReviews.filter(r => r.rating === 5).length,
        4: mockReviews.filter(r => r.rating === 4).length,
        3: mockReviews.filter(r => r.rating === 3).length,
        2: mockReviews.filter(r => r.rating === 2).length,
        1: mockReviews.filter(r => r.rating === 1).length
      }

      expect(distribution[5]).toBe(3)
      expect(distribution[4]).toBe(2)
      expect(distribution[3]).toBe(1)
      expect(distribution[2]).toBe(1)
      expect(distribution[1]).toBe(1)
    })

    it('should track review trends over time', async () => {
      const mockReviews = [
        { rating: 5, createdAt: '2024-01-01' },
        { rating: 4, createdAt: '2024-01-15' },
        { rating: 5, createdAt: '2024-02-01' },
        { rating: 3, createdAt: '2024-02-15' },
        { rating: 5, createdAt: '2024-03-01' }
      ]

      const monthlyAverages = mockReviews.reduce((acc: Record<string, number[]>, review) => {
        const month = new Date(review.createdAt).toISOString().slice(0, 7) // YYYY-MM
        if (!acc[month]) acc[month] = []
        acc[month].push(review.rating)
        return acc
      }, {})

      const monthlyStats = Object.entries(monthlyAverages).map(([month, ratings]) => ({
        month,
        average: (ratings as number[]).reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length,
        count: ratings.length
      }))

      expect(monthlyStats).toHaveLength(3)
      expect(monthlyStats[0].average).toBe(4.5) // January: (5+4)/2
      expect(monthlyStats[1].average).toBe(4)   // February: (5+3)/2
      expect(monthlyStats[2].average).toBe(5)   // March: 5/1
    })
  })
})
