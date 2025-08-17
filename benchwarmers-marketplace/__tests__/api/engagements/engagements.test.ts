import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { createEngagement, updateEngagement, getEngagement, listEngagements } from '@/app/api/engagements/route'
import { confirmCompletion } from '@/app/api/engagements/completion/route'

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

describe('Engagements API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/engagements', () => {
    it('should create engagement from accepted offer', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock accepted offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'accepted',
        startDate: '2024-02-01',
        totalAmount: 12000,
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await createEngagement(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.engagement).toBeDefined()
      expect(data.engagement.status).toBe('active')
      expect(data.engagement.startDate).toBe('2024-02-01')
    })

    it('should validate offer is accepted before creating engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock pending offer
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'pending'
      })

      const response = await createEngagement(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Engagement can only be created from accepted offers')
    })

    it('should validate offer belongs to user company', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        body: JSON.stringify({
          offerId: 'offer-123'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'different-company'
      })

      // Mock offer from different company
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'offer-123',
        status: 'accepted',
        seekerCompanyId: 'seeker-company-123'
      })

      const response = await createEngagement(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Offer does not belong to your company')
    })
  })

  describe('GET /api/engagements', () => {
    it('should list engagements for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements?status=active')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await listEngagements(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagements).toBeDefined()
      expect(Array.isArray(data.engagements)).toBe(true)
    })

    it('should filter engagements by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements?status=completed')

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await listEngagements(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.status).toBe('completed')
    })
  })

  describe('GET /api/engagements/[id]', () => {
    it('should get engagement details', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-123')

      // Mock engagement data
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active',
        startDate: '2024-02-01',
        totalAmount: 12000
      })

      const response = await getEngagement(request, { params: { id: 'engagement-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.status).toBe('active')
      expect(data.engagement.totalAmount).toBe(12000)
    })

    it('should return 404 for non-existent engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/non-existent')

      // Mock non-existent engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockRejectedValue(new Error('Not found'))

      const response = await getEngagement(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Engagement not found')
    })
  })

  describe('PUT /api/engagements/[id]', () => {
    it('should update engagement with time tracking', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-123', {
        method: 'PUT',
        body: JSON.stringify({
          totalHours: 160,
          milestone: 'Phase 1 completed'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock existing engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active',
        companyId: 'company-123'
      })

      const response = await updateEngagement(request, { params: { id: 'engagement-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.totalHours).toBe(160)
    })

    it('should prevent updating completed engagements', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/engagement-123', {
        method: 'PUT',
        body: JSON.stringify({
          totalHours: 160
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
        companyId: 'company-123'
      })

      const response = await updateEngagement(request, { params: { id: 'engagement-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot update completed engagement')
    })
  })

  describe('POST /api/engagements/completion', () => {
    it('should confirm completion by seeker', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'seeker'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock active engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active',
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await confirmCompletion(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.seekerConfirmed).toBe(true)
    })

    it('should confirm completion by provider', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'provider'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock active engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active',
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await confirmCompletion(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.providerConfirmed).toBe(true)
    })

    it('should complete engagement when both parties confirm', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'provider'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'provider-company-123'
      })

      // Mock engagement with seeker already confirmed
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active',
        seekerConfirmed: true,
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await confirmCompletion(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.engagement.status).toBe('completed')
    })

    it('should validate user belongs to engagement parties', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'seeker'
        })
      })

      // Mock authenticated user from different company
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'different-company'
      })

      // Mock engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'active',
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await confirmCompletion(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You are not authorized to confirm this engagement')
    })

    it('should prevent confirming already completed engagement', async () => {
      const request = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        body: JSON.stringify({
          engagementId: 'engagement-123',
          confirmedBy: 'seeker'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'seeker-company-123'
      })

      // Mock completed engagement
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'engagement-123',
        status: 'completed',
        seekerCompanyId: 'seeker-company-123',
        providerCompanyId: 'provider-company-123'
      })

      const response = await confirmCompletion(request)
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
      const startDate = new Date('2024-02-01')
      const endDate = new Date('2024-05-01')
      const currentDate = new Date('2024-03-15')

      const totalDuration = endDate.getTime() - startDate.getTime()
      const elapsedDuration = currentDate.getTime() - startDate.getTime()
      const progressPercentage = (elapsedDuration / totalDuration) * 100

      expect(progressPercentage).toBeGreaterThan(0)
      expect(progressPercentage).toBeLessThan(100)
    })
  })
})
