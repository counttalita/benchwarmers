import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { createOffer, getOffer, updateOffer, listOffers } from '@/app/api/offers/route'
import { respondToOffer } from '@/app/api/offers/respond/route'

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

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  createPaymentIntent: jest.fn(),
  createConnectAccount: jest.fn()
}))

describe('Offers API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/offers', () => {
    it('should create an offer with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        body: JSON.stringify({
          matchId: 'match-123',
          rate: 100,
          currency: 'USD',
          startDate: '2024-02-01',
          durationWeeks: 12,
          terms: 'Standard terms and conditions apply'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock match data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'match-123',
        requestId: 'request-123',
        profileId: 'profile-123'
      })

      // Mock request and profile data
      jest.mocked(require('@/lib/appwrite').databases.getDocument)
        .mockResolvedValueOnce({ // First call for match
          $id: 'match-123',
          requestId: 'request-123',
          profileId: 'profile-123'
        })
        .mockResolvedValueOnce({ // Second call for request
          $id: 'request-123',
          companyId: 'seeker-company-123',
          durationWeeks: 12
        })
        .mockResolvedValueOnce({ // Third call for profile
          $id: 'profile-123',
          companyId: 'provider-company-123'
        })

      const response = await createOffer(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.offer).toBeDefined()
      expect(data.offer.rate).toBe(100)
      expect(data.offer.totalAmount).toBe(12000) // 100 * 40 hours * 12 weeks
      expect(data.offer.platformFee).toBe(1800) // 15% of total
      expect(data.offer.providerAmount).toBe(10200) // 85% of total
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        body: JSON.stringify({
          matchId: '',
          rate: 0
        })
      })

      const response = await createOffer(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.matchId).toBe('Match ID is required')
      expect(data.errors.rate).toBe('Rate must be greater than 0')
    })

    it('should only allow seekers to create offers', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        body: JSON.stringify({
          matchId: 'match-123',
          rate: 100,
          startDate: '2024-02-01',
          durationWeeks: 12
        })
      })

      // Mock provider company user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      const response = await createOffer(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only talent seekers can create offers')
    })

    it('should validate match belongs to seeker', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        body: JSON.stringify({
          matchId: 'match-123',
          rate: 100,
          startDate: '2024-02-01',
          durationWeeks: 12
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock match with different seeker
      jest.mocked(require('@/lib/appwrite').databases.getDocument)
        .mockResolvedValueOnce({ // Match
          $id: 'match-123',
          requestId: 'request-123',
          profileId: 'profile-123'
        })
        .mockResolvedValueOnce({ // Request from different company
          $id: 'request-123',
          companyId: 'different-seeker-company'
        })

      const response = await createOffer(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Match does not belong to your company')
    })
  })

  describe('GET /api/offers', () => {
    it('should list offers for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers?status=pending')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await listOffers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offers).toBeDefined()
      expect(Array.isArray(data.offers)).toBe(true)
    })

    it('should filter offers by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers?status=accepted')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await listOffers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.status).toBe('accepted')
    })
  })

  describe('GET /api/offers/[id]', () => {
    it('should get a specific offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/offer-123')

      // Mock existing offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        rate: 100,
        status: 'pending'
      })

      const response = await getOffer(request, { params: { id: 'offer-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.rate).toBe(100)
    })

    it('should return 404 for non-existent offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/non-existent')

      // Mock non-existent offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockRejectedValue(new Error('Not found'))

      const response = await getOffer(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Offer not found')
    })
  })

  describe('POST /api/offers/respond', () => {
    it('should accept an offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'accept'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock offer data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        providerCompanyId: 'provider-company-123',
        status: 'pending',
        totalAmount: 12000
      })

      const response = await respondToOffer(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.status).toBe('accepted')
    })

    it('should decline an offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'decline',
          reason: 'Rate too low'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock offer data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        providerCompanyId: 'provider-company-123',
        status: 'pending'
      })

      const response = await respondToOffer(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.status).toBe('declined')
    })

    it('should create counter offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'counter',
          counterOffer: {
            rate: 120,
            terms: 'Updated terms'
          }
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock offer data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        providerCompanyId: 'provider-company-123',
        status: 'pending'
      })

      const response = await respondToOffer(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.offer.status).toBe('countered')
      expect(data.counterOffer).toBeDefined()
      expect(data.counterOffer.rate).toBe(120)
    })

    it('should prevent responding to non-pending offers', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'accept'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock accepted offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        providerCompanyId: 'provider-company-123',
        status: 'accepted'
      })

      const response = await respondToOffer(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot respond to non-pending offer')
    })

    it('should enforce 48-hour response deadline for counter offers', async () => {
      const request = new NextRequest('http://localhost:3000/api/offers/respond', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123',
          action: 'counter'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock expired counter offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        providerCompanyId: 'provider-company-123',
        status: 'countered',
        counteredAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString() // 49 hours ago
      })

      const response = await respondToOffer(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Counter offer has expired')
    })
  })
})
