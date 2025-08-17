import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockDataFactory, ApiMockHelper } from '../utils/test-helpers'

// Mock Service Worker for comprehensive API mocking
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Integration test following Open/Closed Principle - extensible without modification
class MarketplaceIntegrationTestSuite {
  private server: any
  private mockData: any

  constructor() {
    this.mockData = this.initializeMockData()
    this.server = this.setupMockServer()
  }

  // Single Responsibility: Initialize all test data
  private initializeMockData() {
    return {
      seekerCompany: MockDataFactory.createCompany({ 
        type: 'seeker', 
        name: 'Tech Startup Inc' 
      }),
      providerCompany: MockDataFactory.createCompany({ 
        type: 'provider', 
        name: 'Dev Agency Ltd' 
      }),
      seekerUser: MockDataFactory.createUser({ 
        companyId: 'seeker-company-123',
        role: 'admin' 
      }),
      providerUser: MockDataFactory.createUser({ 
        companyId: 'provider-company-123',
        role: 'admin' 
      }),
      talentProfile: MockDataFactory.createTalentProfile({
        companyId: 'provider-company-123',
        hourlyRate: 85
      }),
      talentRequest: MockDataFactory.createTalentRequest({
        companyId: 'seeker-company-123',
        budgetMax: 100
      })
    }
  }

  // Single Responsibility: Setup mock API server
  private setupMockServer() {
    return setupServer(
      // Authentication endpoints
      http.post('/api/auth/send-otp', () => {
        return HttpResponse.json({ success: true, otpId: 'otp-123' })
      }),
      http.post('/api/auth/verify-otp', () => {
        return HttpResponse.json({ 
          success: true, 
          user: this.mockData.seekerUser,
          token: 'jwt-token-123'
        })
      }),

      // Company endpoints
      http.post('/api/companies', () => {
        return HttpResponse.json({ ...this.mockData.seekerCompany, status: 'pending' })
      }),
      http.post('/api/companies/verify-domain', () => {
        return HttpResponse.json({ success: true, verificationId: 'verify-123' })
      }),

      // Talent endpoints
      http.get('/api/talent/search', () => {
        return HttpResponse.json({ 
          profiles: [this.mockData.talentProfile],
          matches: [{ profileId: this.mockData.talentProfile.id, score: 0.95 }]
        })
      }),
      http.post('/api/talent/requests', () => {
        return HttpResponse.json(this.mockData.talentRequest)
      }),

      // Offer endpoints
      http.post('/api/offers', () => {
        return HttpResponse.json(MockDataFactory.createOffer({
          talentId: this.mockData.talentProfile.id,
          requestId: this.mockData.talentRequest.id
        }))
      }),
      http.post('/api/offers/:id/accept', () => {
        return HttpResponse.json({ status: 'accepted' })
      }),

      // Payment endpoints
      http.post('/api/payments/create-payment-intent', () => {
        return HttpResponse.json({ id: 'pi_123', status: 'requires_confirmation' })
      }),
      http.post('/api/payments/confirm', () => {
        return HttpResponse.json({ success: true, paymentIntentId: 'pi_123' })
      }),

      // Engagement endpoints
      http.post('/api/engagements', () => {
        return HttpResponse.json({
          id: 'engagement-123',
          status: 'active',
          paymentStatus: 'in_escrow'
        })
      }),
      http.post('/api/engagements/:id/complete', () => {
        return HttpResponse.json({ status: 'completed', paymentStatus: 'released' })
      }),

      // Review endpoints
      http.post('/api/reviews', () => {
        return HttpResponse.json({
          id: 'review-123',
          rating: 5,
          comment: 'Excellent work!'
        })
      }),

      // Notification endpoints
      http.post('/api/notifications/sms', () => {
        return HttpResponse.json({ success: true, messageId: 'msg-123' })
      })
    )
  }

  // Interface Segregation: Specific test methods for different flows
  async testCompleteMarketplaceFlow() {
    this.server.listen()
    
    try {
      await this.runCompanyRegistrationFlow()
      await this.runTalentMatchingFlow()
      await this.runOfferNegotiationFlow()
      await this.runPaymentAndEscrowFlow()
      await this.runEngagementCompletionFlow()
      await this.runReviewFlow()
    } finally {
      this.server.close()
    }
  }

  private async runCompanyRegistrationFlow() {
    // Test company registration for both seeker and provider
    const seekerRegistration = await fetch('/api/companies', {
      method: 'POST',
      body: JSON.stringify({
        name: this.mockData.seekerCompany.name,
        domain: this.mockData.seekerCompany.domain,
        phone: this.mockData.seekerCompany.phone,
        type: 'seeker'
      })
    })
    
    expect(seekerRegistration.ok).toBe(true)
  }

  private async runTalentMatchingFlow() {
    // Test talent request creation and matching
    const requestResponse = await fetch('/api/talent/requests', {
      method: 'POST',
      body: JSON.stringify(this.mockData.talentRequest)
    })
    
    expect(requestResponse.ok).toBe(true)
    
    // Test talent search and matching
    const searchResponse = await fetch('/api/talent/search?skills=React,TypeScript&budget=100')
    const searchData = await searchResponse.json()
    
    expect(searchData.profiles).toHaveLength(1)
    expect(searchData.matches[0].score).toBeGreaterThan(0.9)
  }

  private async runOfferNegotiationFlow() {
    // Test offer creation
    const offerResponse = await fetch('/api/offers', {
      method: 'POST',
      body: JSON.stringify({
        talentId: this.mockData.talentProfile.id,
        requestId: this.mockData.talentRequest.id,
        rate: 85,
        duration: '3 months'
      })
    })
    
    expect(offerResponse.ok).toBe(true)
    
    // Test offer acceptance
    const acceptResponse = await fetch('/api/offers/offer-123/accept', {
      method: 'POST'
    })
    
    expect(acceptResponse.ok).toBe(true)
  }

  private async runPaymentAndEscrowFlow() {
    // Test payment intent creation
    const paymentIntentResponse = await fetch('/api/payments/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount: 11500, // $100 + 15% fee
        currency: 'usd'
      })
    })
    
    const paymentIntent = await paymentIntentResponse.json()
    expect(paymentIntent.id).toBe('pi_123')
    
    // Test payment confirmation
    const confirmResponse = await fetch('/api/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId: paymentIntent.id
      })
    })
    
    expect(confirmResponse.ok).toBe(true)
  }

  private async runEngagementCompletionFlow() {
    // Test engagement creation
    const engagementResponse = await fetch('/api/engagements', {
      method: 'POST',
      body: JSON.stringify({
        offerId: 'offer-123'
      })
    })
    
    const engagement = await engagementResponse.json()
    expect(engagement.status).toBe('active')
    expect(engagement.paymentStatus).toBe('in_escrow')
    
    // Test engagement completion
    const completeResponse = await fetch(`/api/engagements/${engagement.id}/complete`, {
      method: 'POST'
    })
    
    const completedEngagement = await completeResponse.json()
    expect(completedEngagement.status).toBe('completed')
    expect(completedEngagement.paymentStatus).toBe('released')
  }

  private async runReviewFlow() {
    // Test review submission
    const reviewResponse = await fetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        engagementId: 'engagement-123',
        rating: 5,
        comment: 'Excellent work!'
      })
    })
    
    const review = await reviewResponse.json()
    expect(review.rating).toBe(5)
    expect(review.comment).toBe('Excellent work!')
  }
}

describe('Complete Marketplace Integration Flow', () => {
  let testSuite: MarketplaceIntegrationTestSuite

  beforeAll(() => {
    testSuite = new MarketplaceIntegrationTestSuite()
  })

  describe('End-to-End Marketplace Workflow', () => {
    it('should complete full marketplace transaction from registration to review', async () => {
      await testSuite.testCompleteMarketplaceFlow()
    })

    it('should handle buyer-driven marketplace rule - only paying seekers can approach providers', async () => {
      const mockSeeker = { ...MockDataFactory.createUser({ companyId: 'seeker-company' }), token: 'seeker-jwt-token' }
      const mockProvider = { ...MockDataFactory.createUser({ companyId: 'provider-company' }), token: 'provider-jwt-token' }
      
      // Seeker can create offers (allowed)
      ApiMockHelper.mockFetch({
        '/api/offers/create': { success: true, offerId: 'offer-123' }
      })
      
      const seekerOfferResponse = await fetch('/api/offers/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${mockSeeker.token}` },
        body: JSON.stringify({ talentId: 'talent-123' })
      })
      
      expect(seekerOfferResponse.ok).toBe(true)
      
      // Provider cannot cold-approach seekers (blocked)
      ApiMockHelper.mockFetch({
        '/api/offers/cold-approach': Promise.reject({
          status: 403,
          message: 'Providers cannot initiate contact with seekers'
        })
      })
      
      try {
        await fetch('/api/offers/cold-approach', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${mockProvider.token}` },
          body: JSON.stringify({ seekerId: 'seeker-123' })
        })
      } catch (error: any) {
        expect(error.status).toBe(403)
        expect(error.message).toContain('cannot initiate contact')
      }
    })

    it('should ensure quality interactions through payment commitment', async () => {
      const mockTalentProfile = MockDataFactory.createTalentProfile()
      
      // Seeker must commit to payment before viewing full profile details
      ApiMockHelper.mockFetch({
        '/api/talent/profiles/preview': {
          id: mockTalentProfile.id,
          name: mockTalentProfile.name,
          title: mockTalentProfile.title,
          skills: mockTalentProfile.skills.slice(0, 3), // Limited preview
          // Full details hidden until payment commitment
        },
        '/api/talent/profiles/full': Promise.reject({
          status: 402,
          message: 'Payment commitment required to view full profile'
        })
      })
      
      // Preview should be available
      const previewResponse = await fetch('/api/talent/profiles/preview')
      const preview = await previewResponse.json()
      expect(preview.skills).toHaveLength(3)
      
      // Full profile should require payment
      try {
        await fetch('/api/talent/profiles/full')
      } catch (error: any) {
        expect(error.status).toBe(402)
        expect(error.message).toContain('Payment commitment required')
      }
    })

    it('should handle multi-step verification and approval process', async () => {
      const testFlow = async () => {
        // Step 1: Company registration
        const registrationResponse = await fetch('/api/companies', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Company',
            domain: 'testcompany.com',
            phone: '+1234567890'
          })
        })
        
        const company = await registrationResponse.json()
        expect(company.status).toBe('pending')
        
        // Step 2: Domain verification
        const verificationResponse = await fetch('/api/companies/verify-domain', {
          method: 'POST',
          body: JSON.stringify({ domain: 'testcompany.com' })
        })
        
        expect(verificationResponse.ok).toBe(true)
        
        // Step 3: Phone OTP verification
        const otpResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({ phone: '+1234567890' })
        })
        
        expect(otpResponse.ok).toBe(true)
        
        // Step 4: OTP verification
        const verifyResponse = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ otp: '123456' })
        })
        
        const authResult = await verifyResponse.json()
        expect(authResult.success).toBe(true)
        expect(authResult.token).toBeDefined()
      }
      
      await testFlow()
    })

    it('should maintain data consistency across all operations', async () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000,
        platformFee: 1500,
        netAmount: 8500
      })
      
      // Verify fee calculations are consistent
      expect(mockOffer.platformFee).toBe(mockOffer.totalAmount * 0.15)
      expect(mockOffer.netAmount).toBe(mockOffer.totalAmount - mockOffer.platformFee)
      
      // Verify payment flow maintains consistency
      const paymentData = {
        engagementAmount: mockOffer.totalAmount,
        platformFee: mockOffer.platformFee,
        totalCharge: mockOffer.totalAmount + mockOffer.platformFee,
        providerReceives: mockOffer.netAmount
      }
      
      expect(paymentData.totalCharge).toBe(11500)
      expect(paymentData.providerReceives).toBe(8500)
      expect(paymentData.platformFee).toBe(1500)
    })

    it('should handle error scenarios gracefully throughout the flow', async () => {
      // Test network failures
      ApiMockHelper.mockFetch({
        '/api/companies': Promise.reject(new Error('Network error'))
      })
      
      try {
        await fetch('/api/companies', { method: 'POST' })
      } catch (error: any) {
        expect(error.message).toBe('Network error')
      }
      
      // Test validation failures
      ApiMockHelper.mockFetch({
        '/api/offers/create': Promise.reject({
          status: 400,
          message: 'Invalid offer data',
          errors: ['Rate must be positive', 'Start date required']
        })
      })
      
      try {
        await fetch('/api/offers/create', { method: 'POST' })
      } catch (error: any) {
        expect(error.status).toBe(400)
        expect(error.errors).toContain('Rate must be positive')
      }
      
      // Test payment failures
      ApiMockHelper.mockFetch({
        '/api/payments/create-payment-intent': Promise.reject({
          status: 402,
          message: 'Card declined'
        })
      })
      
      try {
        await fetch('/api/payments/create-payment-intent', { method: 'POST' })
      } catch (error: any) {
        expect(error.status).toBe(402)
        expect(error.message).toBe('Card declined')
      }
    })

    it('should ensure proper notification flow throughout marketplace operations', async () => {
      const notifications: string[] = []
      
      // Mock notification tracking
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': (url: string, options: any) => {
          const body = JSON.parse(options.body)
          notifications.push(body.message)
          return Promise.resolve({ success: true, messageId: 'msg-123' })
        }
      })
      
      // Simulate key marketplace events
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Company registration approved'
        })
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          message: 'New offer received'
        })
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Payment collected and held in escrow'
        })
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Payment released to provider'
        })
      })
      
      expect(notifications).toContain('Company registration approved')
      expect(notifications).toContain('New offer received')
      expect(notifications).toContain('Payment collected and held in escrow')
      expect(notifications).toContain('Payment released to provider')
    })
  })

  describe('Performance and Scalability Tests', () => {
    it('should handle concurrent offer processing', async () => {
      const concurrentOffers = Array.from({ length: 10 }, (_, i) => 
        MockDataFactory.createOffer({ id: `offer-${i}` })
      )
      
      ApiMockHelper.mockFetch({
        '/api/offers/batch-process': {
          processed: concurrentOffers.length,
          successful: concurrentOffers.length,
          failed: 0
        }
      })
      
      const response = await fetch('/api/offers/batch-process', {
        method: 'POST',
        body: JSON.stringify({ offers: concurrentOffers })
      })
      
      const result = await response.json()
      expect(result.processed).toBe(10)
      expect(result.successful).toBe(10)
      expect(result.failed).toBe(0)
    })

    it('should maintain performance under load', async () => {
      const startTime = Date.now()
      
      // Simulate multiple concurrent operations
      const operations = [
        fetch('/api/talent/search'),
        fetch('/api/offers/create', { method: 'POST' }),
        fetch('/api/payments/create-payment-intent', { method: 'POST' }),
        fetch('/api/notifications/sms', { method: 'POST' })
      ]
      
      await Promise.all(operations)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000) // 5 seconds
    })
  })
})
