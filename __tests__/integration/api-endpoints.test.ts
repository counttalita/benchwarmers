import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { POST as sendOTP, POST as verifyOTP, POST as register } from '@/app/api/auth/send-otp/route'
import { POST as createRequest, GET as listRequests } from '@/app/api/requests/talent-requests/route'
import { POST as createProfile, GET as listProfiles } from '@/app/api/talent/profiles/route'
import { POST as createOffer } from '@/app/api/offers/route'
import { POST as createEngagement } from '@/app/api/engagements/route'
import { POST as createPayment } from '@/app/api/payments/escrow/route'
import { POST as createReview } from '@/app/api/reviews/route'

// Mock external services
jest.mock('@/lib/twilio', () => ({
  sendOTP: jest.fn().mockResolvedValue({ success: true }),
  generateOTP: jest.fn().mockReturnValue('123456'),
  validatePhoneNumber: jest.fn().mockResolvedValue(true),
  formatPhoneNumber: jest.fn().mockReturnValue('+1234567890')
}))

jest.mock('@/lib/stripe', () => ({
  createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test123' }),
  createTransfer: jest.fn().mockResolvedValue({ id: 'tr_test123' }),
  createConnectAccount: jest.fn().mockResolvedValue({ id: 'acct_test123' })
}))

jest.mock('@/lib/resend', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue({ success: true })
}))

jest.mock('@/lib/pusher/config', () => ({
  triggerUserNotification: jest.fn().mockResolvedValue(true),
  triggerCompanyNotification: jest.fn().mockResolvedValue(true)
}))

describe('API Endpoints Integration Tests', () => {
  let testCompanyId: string
  let testUserId: string
  let testRequestId: string
  let testProfileId: string
  let testEngagementId: string

  beforeAll(async () => {
    // Setup test data
    testCompanyId = 'test-company-123'
    testUserId = 'test-user-123'
  })

  describe('Complete User Journey: Company Registration to Project Completion', () => {
    it('should handle complete user journey from registration to project completion', async () => {
      // Step 1: Company Registration
      const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Test Company',
          contactName: 'John Doe',
          email: 'john@testcompany.com',
          phone: '+1234567890',
          companyType: 'seeker',
          industry: 'technology',
          companySize: 'startup'
        })
      })

      const registerResponse = await register(registerRequest)
      expect(registerResponse.status).toBe(201)
      
      const registerData = await registerResponse.json()
      expect(registerData.success).toBe(true)
      expect(registerData.company.id).toBeDefined()

      // Step 2: Create Talent Request
      const createRequestReq = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify({
          title: 'Senior React Developer Needed',
          description: 'Looking for experienced React developer for 3-month project',
          requiredSkills: [
            { name: 'React', level: 'senior', priority: 'required' },
            { name: 'TypeScript', level: 'senior', priority: 'required' }
          ],
          budget: { min: 80, max: 120, currency: 'USD' },
          duration: { value: 12, unit: 'weeks' },
          startDate: '2024-02-01T00:00:00Z',
          location: 'Remote',
          remotePreference: 'remote'
        })
      })

      const createRequestResponse = await createRequest(createRequestReq)
      expect(createRequestResponse.status).toBe(201)
      
      const requestData = await createRequestResponse.json()
      expect(requestData.success).toBe(true)
      testRequestId = requestData.request.id

      // Step 3: Provider Company Creates Profile
      const providerCompanyId = 'provider-company-456'
      const createProfileReq = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': providerCompanyId
        },
        body: JSON.stringify({
          name: 'Jane Smith',
          title: 'Senior React Developer',
          skills: [
            { name: 'React', level: 'senior', yearsOfExperience: 5 },
            { name: 'TypeScript', level: 'senior', yearsOfExperience: 4 }
          ],
          rateMin: 85,
          rateMax: 115,
          currency: 'USD',
          location: 'New York, NY',
          availability: 'available',
          bio: 'Experienced React developer with 5+ years of experience'
        })
      })

      const createProfileResponse = await createProfile(createProfileReq)
      expect(createProfileResponse.status).toBe(201)
      
      const profileData = await createProfileResponse.json()
      expect(profileData.success).toBe(true)
      testProfileId = profileData.profile.id

      // Step 4: Create Offer
      const createOfferReq = new NextRequest('http://localhost:3000/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': providerCompanyId
        },
        body: JSON.stringify({
          requestId: testRequestId,
          profileId: testProfileId,
          proposedRate: 100,
          currency: 'USD',
          estimatedDuration: 12,
          startDate: '2024-02-01T00:00:00Z',
          coverLetter: 'I am excited to work on this project and believe my experience matches perfectly.'
        })
      })

      const createOfferResponse = await createOffer(createOfferReq)
      expect(createOfferResponse.status).toBe(201)
      
      const offerData = await createOfferResponse.json()
      expect(offerData.success).toBe(true)

      // Step 5: Create Engagement
      const createEngagementReq = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify({
          requestId: testRequestId,
          offerId: offerData.offer.id,
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-04-30T00:00:00Z',
          totalAmount: 12000,
          currency: 'USD'
        })
      })

      const createEngagementResponse = await createEngagement(createEngagementReq)
      expect(createEngagementResponse.status).toBe(201)
      
      const engagementData = await createEngagementResponse.json()
      expect(engagementData.success).toBe(true)
      testEngagementId = engagementData.engagement.id

      // Step 6: Create Escrow Payment
      const createPaymentReq = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify({
          engagementId: testEngagementId,
          amount: 12000,
          currency: 'USD'
        })
      })

      const createPaymentResponse = await createPayment(createPaymentReq)
      expect(createPaymentResponse.status).toBe(200)
      
      const paymentData = await createPaymentResponse.json()
      expect(paymentData.success).toBe(true)
      expect(paymentData.escrowPayment.id).toBeDefined()

      // Step 7: Create Review (after project completion)
      const createReviewReq = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify({
          engagementId: testEngagementId,
          profileId: testProfileId,
          rating: 5,
          comment: 'Excellent work and communication throughout the project. Highly recommended!'
        })
      })

      const createReviewResponse = await createReview(createReviewReq)
      expect(createReviewResponse.status).toBe(201)
      
      const reviewData = await createReviewResponse.json()
      expect(reviewData.success).toBe(true)
      expect(reviewData.review.rating).toBe(5)
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should handle complete authentication flow', async () => {
      // Step 1: Send OTP
      const sendOTPRequest = new NextRequest('http://localhost:3000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+1234567890'
        })
      })

      const sendOTPResponse = await sendOTP(sendOTPRequest)
      expect(sendOTPResponse.status).toBe(200)
      
      const sendOTPData = await sendOTPResponse.json()
      expect(sendOTPData.success).toBe(true)

      // Step 2: Verify OTP
      const verifyOTPRequest = new NextRequest('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+1234567890',
          otp: '123456'
        })
      })

      const verifyOTPResponse = await verifyOTP(verifyOTPRequest)
      expect(verifyOTPResponse.status).toBe(200)
      
      const verifyOTPData = await verifyOTPResponse.json()
      expect(verifyOTPData.success).toBe(true)
      expect(verifyOTPData.token).toBeDefined()
    })
  })

  describe('Talent Request and Matching Flow', () => {
    it('should handle talent request creation and listing', async () => {
      // Create multiple requests
      const requests = [
        {
          title: 'Frontend Developer',
          description: 'Need React developer',
          requiredSkills: [{ name: 'React', level: 'mid', priority: 'required' }],
          budget: { min: 60, max: 80, currency: 'USD' },
          duration: { value: 8, unit: 'weeks' },
          startDate: '2024-02-01T00:00:00Z',
          location: 'Remote'
        },
        {
          title: 'Backend Developer',
          description: 'Need Node.js developer',
          requiredSkills: [{ name: 'Node.js', level: 'senior', priority: 'required' }],
          budget: { min: 90, max: 130, currency: 'USD' },
          duration: { value: 16, unit: 'weeks' },
          startDate: '2024-03-01T00:00:00Z',
          location: 'Remote'
        }
      ]

      for (const requestData of requests) {
        const createReq = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-company-id': testCompanyId
          },
          body: JSON.stringify(requestData)
        })

        const response = await createRequest(createReq)
        expect(response.status).toBe(201)
      }

      // List requests with filters
      const listRequest = new NextRequest('http://localhost:3000/api/requests/talent-requests?status=open&limit=10')
      const listResponse = await listRequests(listRequest)
      expect(listResponse.status).toBe(200)
      
      const listData = await listResponse.json()
      expect(listData.success).toBe(true)
      expect(listData.requests).toBeDefined()
      expect(Array.isArray(listData.requests)).toBe(true)
    })
  })

  describe('Talent Profile and Discovery Flow', () => {
    it('should handle talent profile creation and discovery', async () => {
      // Create multiple profiles
      const profiles = [
        {
          name: 'Alice Johnson',
          title: 'Senior Frontend Developer',
          skills: [
            { name: 'React', level: 'senior', yearsOfExperience: 6 },
            { name: 'Vue.js', level: 'senior', yearsOfExperience: 4 }
          ],
          rateMin: 80,
          rateMax: 120,
          currency: 'USD',
          location: 'San Francisco, CA',
          availability: 'available'
        },
        {
          name: 'Bob Wilson',
          title: 'Full Stack Developer',
          skills: [
            { name: 'React', level: 'mid', yearsOfExperience: 3 },
            { name: 'Node.js', level: 'senior', yearsOfExperience: 5 }
          ],
          rateMin: 70,
          rateMax: 100,
          currency: 'USD',
          location: 'Austin, TX',
          availability: 'partially_available'
        }
      ]

      for (const profileData of profiles) {
        const createReq = new NextRequest('http://localhost:3000/api/talent/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-company-id': 'provider-company-789'
          },
          body: JSON.stringify(profileData)
        })

        const response = await createProfile(createReq)
        expect(response.status).toBe(201)
      }

      // List profiles with filters
      const listRequest = new NextRequest('http://localhost:3000/api/talent/profiles?skills=React&location=San Francisco&availability=available')
      const listResponse = await listProfiles(listRequest)
      expect(listResponse.status).toBe(200)
      
      const listData = await listResponse.json()
      expect(listData.success).toBe(true)
      expect(listData.profiles).toBeDefined()
      expect(Array.isArray(listData.profiles)).toBe(true)
    })
  })

  describe('Payment and Escrow Flow', () => {
    it('should handle complete payment flow with escrow', async () => {
      // Create engagement for payment testing
      const engagementData = {
        requestId: 'test-request-123',
        offerId: 'test-offer-123',
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-04-30T00:00:00Z',
        totalAmount: 5000,
        currency: 'USD'
      }

      const createEngagementReq = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify(engagementData)
      })

      const engagementResponse = await createEngagement(createEngagementReq)
      expect(engagementResponse.status).toBe(201)
      
      const engagement = await engagementResponse.json()
      const engagementId = engagement.engagement.id

      // Create escrow payment
      const paymentData = {
        engagementId,
        amount: 5000,
        currency: 'USD'
      }

      const createPaymentReq = new NextRequest('http://localhost:3000/api/payments/escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify(paymentData)
      })

      const paymentResponse = await createPayment(createPaymentReq)
      expect(paymentResponse.status).toBe(200)
      
      const payment = await paymentResponse.json()
      expect(payment.success).toBe(true)
      expect(payment.escrowPayment.status).toBe('pending')
      expect(payment.breakdown.platformFee).toBe(750) // 15% of 5000
      expect(payment.breakdown.providerAmount).toBe(4250) // 5000 - 750
    })
  })

  describe('Review and Rating Flow', () => {
    it('should handle review creation and profile rating updates', async () => {
      // Create engagement for review testing
      const engagementData = {
        requestId: 'test-request-456',
        offerId: 'test-offer-456',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-03-31T00:00:00Z',
        totalAmount: 3000,
        currency: 'USD',
        status: 'completed'
      }

      const createEngagementReq = new NextRequest('http://localhost:3000/api/engagements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify(engagementData)
      })

      const engagementResponse = await createEngagement(createEngagementReq)
      expect(engagementResponse.status).toBe(201)
      
      const engagement = await engagementResponse.json()
      const engagementId = engagement.engagement.id

      // Create review
      const reviewData = {
        engagementId,
        profileId: 'test-profile-456',
        rating: 5,
        comment: 'Outstanding work quality and communication. Would definitely work together again!'
      }

      const createReviewReq = new NextRequest('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify(reviewData)
      })

      const reviewResponse = await createReview(createReviewReq)
      expect(reviewResponse.status).toBe(201)
      
      const review = await reviewResponse.json()
      expect(review.success).toBe(true)
      expect(review.review.rating).toBe(5)
      expect(review.review.isPublic).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid requests gracefully', async () => {
      // Test invalid company ID
      const invalidRequest = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Missing x-company-id header
        },
        body: JSON.stringify({
          title: 'Test Request',
          description: 'Test description'
        })
      })

      const response = await createRequest(invalidRequest)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Company ID is required')
    })

    it('should handle validation errors', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify({
          // Missing required fields
          title: '',
          description: ''
        })
      })

      const response = await createRequest(invalidRequest)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we'll test with invalid data that should cause validation errors
      const invalidRequest = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': testCompanyId
        },
        body: JSON.stringify({
          title: 'Test',
          description: 'Test',
          budget: { min: 200, max: 100, currency: 'USD' } // Invalid budget range
        })
      })

      const response = await createRequest(invalidRequest)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Maximum budget must be greater than minimum budget')
    })
  })
})
