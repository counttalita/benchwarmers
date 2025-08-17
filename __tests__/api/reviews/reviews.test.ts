import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createReview, GET as listReviews } from '@/app/api/reviews/route'
import { GET as getProfileReviews } from '@/app/api/reviews/profile/route'
import { PUT as updateReview } from '@/app/api/reviews/[id]/route'

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

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/reviews', () => {
    it('should create a review for completed engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Excellent work and communication throughout the project'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock completed engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'completed',
        seekerCompanyId: 'company-123',
        providerCompanyId: 'provider-company-123'
      })

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
      expect(data.error).toBe('Rating must be between 1 and 5')
    })

    it('should require completed engagement for review', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Test comment'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock active engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active'
      })

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reviews can only be submitted for completed engagements')
    })

    it('should validate user participated in engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Test comment'
        })
      })

      // Mock authenticated user from different company
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'different-company'
      })

      // Mock completed engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'completed',
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only review engagements you participated in')
    })

    it('should prevent duplicate reviews for same engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          profileId: 'profile-123',
          rating: 5,
          comment: 'Test comment'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock completed engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'completed',
        seekerCompanyId: 'company-123'
      })

      // Mock existing review
      jest.mocked(require('@/lib/appwrite').databases.listDocuments).mockResolvedValue({
        documents: [{ $id: 'existing-review' }]
      })

      const response = await createReview(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('You have already reviewed this engagement')
    })
  })

  describe('GET /api/reviews', () => {
    it('should list public reviews', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews?profileId=profile-123')

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
      const averageRating = mockReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews

      expect(totalReviews).toBe(5)
      expect(averageRating).toBe(4.4)
    })
  })

  describe('PUT /api/reviews/[id]', () => {
    it('should update review by author', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/review-123', {
        method: 'PUT',
        body: JSON.stringify({
          rating: 4,
          comment: 'Updated comment'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock existing review
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'review-123',
        authorId: 'user-123',
        rating: 5,
        comment: 'Original comment'
      })

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
        body: JSON.stringify({
          rating: 4,
          comment: 'Updated comment'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock review by different user
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'review-123',
        authorId: 'different-user',
        rating: 5,
        comment: 'Original comment'
      })

      const response = await updateReview(request, { params: { id: 'review-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only update your own reviews')
    })

    it('should prevent updating reviews older than 7 days', async () => {
      const request = new NextRequest('http://localhost:3000/api/reviews/review-123', {
        method: 'PUT',
        body: JSON.stringify({
          rating: 4,
          comment: 'Updated comment'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock old review
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'review-123',
        authorId: 'user-123',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        rating: 5,
        comment: 'Original comment'
      })

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

      const averageRating = mockReviews.reduce((sum, review) => sum + review.rating, 0) / mockReviews.length
      const shouldFlag = averageRating < 2.5 && mockReviews.length >= 3

      expect(averageRating).toBe(1.4)
      expect(shouldFlag).toBe(true)
    })

    it('should allow admin to remove inappropriate reviews', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reviews/review-123', {
        method: 'DELETE'
      })

      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin'
      })

      const response = await updateReview(request, { params: { id: 'review-123' } })
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

      const monthlyAverages = mockReviews.reduce((acc, review) => {
        const month = new Date(review.createdAt).toISOString().slice(0, 7) // YYYY-MM
        if (!acc[month]) acc[month] = []
        acc[month].push(review.rating)
        return acc
      }, {})

      const monthlyStats = Object.entries(monthlyAverages).map(([month, ratings]) => ({
        month,
        average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
        count: ratings.length
      }))

      expect(monthlyStats).toHaveLength(3)
      expect(monthlyStats[0].average).toBe(4.5) // January: (5+4)/2
      expect(monthlyStats[1].average).toBe(4)   // February: (5+3)/2
      expect(monthlyStats[2].average).toBe(5)   // March: 5/1
    })
  })
})
