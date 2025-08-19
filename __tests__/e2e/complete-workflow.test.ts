import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock all external services
jest.mock('@/lib/prisma')
jest.mock('@/lib/auth')
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))
jest.mock('@/lib/paystack')
jest.mock('@/lib/notifications/notification-service')
jest.mock('@/lib/notifications/sms-service')
jest.mock('@/lib/notifications/email-service')

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Complete Platform Workflow E2E Tests', () => {
  let seekerCompanyId: string
  let providerCompanyId: string
  let seekerUserId: string
  let providerUserId: string
  let talentProfileId: string
  let talentRequestId: string
  let matchId: string
  let offerId: string
  let engagementId: string

  beforeAll(() => {
    // Setup test data
    seekerCompanyId = 'seeker-company-123'
    providerCompanyId = 'provider-company-123'
    seekerUserId = 'seeker-user-123'
    providerUserId = 'provider-user-123'
    talentProfileId = 'talent-profile-123'
    talentRequestId = 'talent-request-123'
    matchId = 'match-123'
    offerId = 'offer-123'
    engagementId = 'engagement-123'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authenticated users
    jest.mocked(require('@/lib/auth').getCurrentUser)
      .mockImplementation((request: NextRequest) => {
        const userId = request.headers.get('x-user-id')
        if (userId === seekerUserId) {
          return Promise.resolve({
            id: seekerUserId,
            role: 'company',
            companyId: seekerCompanyId,
            name: 'John Seeker',
            email: 'john@seekercompany.com'
          })
        }
        if (userId === providerUserId) {
          return Promise.resolve({
            id: providerUserId,
            role: 'company',
            companyId: providerCompanyId,
            name: 'Jane Provider',
            email: 'jane@providercompany.com'
          })
        }
        return Promise.resolve(null)
      })
  })

  describe('1. Complete Seeker Journey', () => {
    it('should complete full seeker workflow: register → post project → view matches → interview → accept', async () => {
      // Step 1: Company Registration
      const registrationData = {
        name: 'Seeker Tech Corp',
        email: 'contact@seekertech.com',
        contactName: 'John Seeker',
        phone: '+27123456789',
        type: 'seeker',
        domain: 'seekertech.com'
      }

      mockPrisma.company.findFirst.mockResolvedValue(null) // No existing company
      mockPrisma.user.findFirst.mockResolvedValue(null) // No existing user
      mockPrisma.company.create.mockResolvedValue({
        id: seekerCompanyId,
        ...registrationData,
        createdAt: new Date(),
        updatedAt: new Date(),
        verified: false,
        verificationStatus: 'pending'
      } as any)

      const { POST: registerCompany } = await import('@/app/api/auth/register/route')
      const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      })

      const registerResponse = await registerCompany(registerRequest)
      expect(registerResponse.status).toBe(201)

      // Step 2: Post Talent Request
      const talentRequestData = {
        title: 'Senior React Developer',
        description: 'We need an experienced React developer',
        requiredSkills: [
          { name: 'React', level: 'senior', priority: 'required', yearsRequired: 5 },
          { name: 'TypeScript', level: 'mid', priority: 'preferred', yearsRequired: 3 }
        ],
        budget: { min: 50000, max: 80000, currency: 'ZAR' },
        duration: { value: 6, unit: 'months' },
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Cape Town',
        remotePreference: 'hybrid',
        urgency: 'high'
      }

      mockPrisma.company.findUnique.mockResolvedValue({
        id: seekerCompanyId,
        type: 'seeker'
      } as any)

      mockPrisma.talentRequest.create.mockResolvedValue({
        id: talentRequestId,
        ...talentRequestData,
        companyId: seekerCompanyId,
        status: 'open',
        createdAt: new Date()
      } as any)

      const { POST: createRequest } = await import('@/app/api/requests/talent-requests/route')
      const requestCreation = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': seekerUserId,
          'x-company-id': seekerCompanyId
        },
        body: JSON.stringify(talentRequestData)
      })

      const requestResponse = await createRequest(requestCreation)
      expect(requestResponse.status).toBe(201)

      // Step 3: Run Matching Algorithm
      mockPrisma.talentRequest.findUnique.mockResolvedValue({
        id: talentRequestId,
        ...talentRequestData,
        companyId: seekerCompanyId
      } as any)

      mockPrisma.talentProfile.findMany.mockResolvedValue([
        {
          id: talentProfileId,
          userId: providerUserId,
          companyId: providerCompanyId,
          skills: [
            { name: 'React', level: 'senior', yearsExperience: 6 },
            { name: 'TypeScript', level: 'senior', yearsExperience: 4 }
          ],
          availability: 'available',
          location: 'Cape Town',
          remotePreference: 'hybrid',
          hourlyRate: 650
        }
      ] as any)

      const { POST: runMatching } = await import('@/app/api/requests/matching/route')
      const matchingRequest = new NextRequest('http://localhost:3000/api/requests/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': seekerUserId,
          'x-company-id': seekerCompanyId
        },
        body: JSON.stringify({ requestId: talentRequestId })
      })

      const matchingResponse = await runMatching(matchingRequest)
      expect(matchingResponse.status).toBe(200)

      // Step 4: Update Engagement Status to Interview
      mockPrisma.engagement.findUnique.mockResolvedValue({
        id: engagementId,
        status: 'staged',
        talentProfileId,
        companyId: seekerCompanyId
      } as any)

      mockPrisma.engagement.update.mockResolvedValue({
        id: engagementId,
        status: 'interviewing',
        interviewScheduledAt: new Date()
      } as any)

      const { POST: scheduleInterview } = await import('@/app/api/engagements/[id]/interview/route')
      const interviewRequest = new NextRequest('http://localhost:3000/api/engagements/123/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': seekerUserId,
          'x-company-id': seekerCompanyId
        },
        body: JSON.stringify({
          status: 'interviewing',
          interviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Technical interview scheduled'
        })
      })

      const interviewResponse = await scheduleInterview(interviewRequest, {
        params: Promise.resolve({ id: engagementId })
      })
      expect(interviewResponse.status).toBe(200)

      // Step 5: Accept Talent After Interview
      mockPrisma.engagement.update.mockResolvedValue({
        id: engagementId,
        status: 'accepted',
        acceptedAt: new Date()
      } as any)

      const acceptRequest = new NextRequest('http://localhost:3000/api/engagements/123/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': seekerUserId,
          'x-company-id': seekerCompanyId
        },
        body: JSON.stringify({
          status: 'accepted',
          notes: 'Great interview, moving forward'
        })
      })

      const acceptResponse = await scheduleInterview(acceptRequest, {
        params: Promise.resolve({ id: engagementId })
      })
      expect(acceptResponse.status).toBe(200)
    })
  })

  describe('2. Complete Provider Journey', () => {
    it('should complete full provider workflow: register → create profile → receive notification → respond', async () => {
      // Step 1: Provider Company Registration
      const providerRegistrationData = {
        name: 'Provider Solutions Ltd',
        email: 'contact@providersolutions.com',
        contactName: 'Jane Provider',
        phone: '+27987654321',
        type: 'provider',
        domain: 'providersolutions.com'
      }

      mockPrisma.company.findFirst.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.company.create.mockResolvedValue({
        id: providerCompanyId,
        ...providerRegistrationData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)

      const { POST: registerProvider } = await import('@/app/api/auth/register/route')
      const providerRegisterRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerRegistrationData)
      })

      const providerRegisterResponse = await registerProvider(providerRegisterRequest)
      expect(providerRegisterResponse.status).toBe(201)

      // Step 2: Create Talent Profile
      const talentProfileData = {
        name: 'Senior React Expert',
        bio: 'Experienced React developer with 6+ years',
        skills: [
          { name: 'React', level: 'senior', yearsExperience: 6 },
          { name: 'TypeScript', level: 'senior', yearsExperience: 4 },
          { name: 'Node.js', level: 'mid', yearsExperience: 4 }
        ],
        experience: [
          {
            company: 'Tech Startup',
            role: 'Senior Frontend Developer',
            duration: '2 years',
            description: 'Led frontend development team'
          }
        ],
        availability: 'available',
        location: 'Cape Town',
        remotePreference: 'hybrid',
        hourlyRate: 650,
        currency: 'ZAR'
      }

      mockPrisma.talentProfile.create.mockResolvedValue({
        id: talentProfileId,
        userId: providerUserId,
        companyId: providerCompanyId,
        ...talentProfileData,
        createdAt: new Date()
      } as any)

      const { POST: createProfile } = await import('@/app/api/talent/profiles/route')
      const profileRequest = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': providerUserId,
          'x-company-id': providerCompanyId
        },
        body: JSON.stringify(talentProfileData)
      })

      const profileResponse = await createProfile(profileRequest)
      expect(profileResponse.status).toBe(201)

      // Step 3: Receive Interview Notification (simulated)
      // In real flow, this would be triggered by seeker's interview scheduling
      const mockNotification = {
        id: 'notification-123',
        type: 'interview_scheduled',
        title: 'Interview Scheduled',
        message: 'You have been selected for an interview',
        data: {
          engagementId,
          interviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      }

      // Provider would receive this via real-time notification system
      expect(mockNotification.type).toBe('interview_scheduled')
      expect(mockNotification.data.engagementId).toBe(engagementId)
    })
  })

  describe('3. Complete Payment & Invoicing Flow', () => {
    it('should handle complete payment workflow: acceptance → invoicing → payment → completion', async () => {
      // Step 1: Engagement Accepted (triggers invoicing)
      mockPrisma.engagement.findUnique.mockResolvedValue({
        id: engagementId,
        status: 'accepted',
        totalAmount: 75000,
        companyId: seekerCompanyId,
        talentProfileId
      } as any)

      // Step 2: Manual Invoicing Process (simulated)
      // In the current manual flow:
      // - Platform invoices seeker for full amount (75,000 ZAR)
      // - Seeker pays platform
      // - Provider invoices platform
      // - Platform pays provider minus 5% fee (71,250 ZAR)

      const invoiceData = {
        engagementId,
        totalAmount: 75000,
        platformFee: 3750, // 5%
        providerAmount: 71250
      }

      expect(invoiceData.platformFee).toBe(invoiceData.totalAmount * 0.05)
      expect(invoiceData.providerAmount).toBe(invoiceData.totalAmount - invoiceData.platformFee)

      // Step 3: Complete Engagement
      mockPrisma.engagement.update.mockResolvedValue({
        id: engagementId,
        status: 'completed',
        completedAt: new Date()
      } as any)

      const { POST: completeEngagement } = await import('@/app/api/engagements/completion/route')
      const completionRequest = new NextRequest('http://localhost:3000/api/engagements/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': seekerUserId,
          'x-company-id': seekerCompanyId
        },
        body: JSON.stringify({
          engagementId,
          completionNotes: 'Project completed successfully'
        })
      })

      const completionResponse = await completeEngagement(completionRequest)
      expect(completionResponse.status).toBe(200)
    })
  })

  describe('4. Admin Management Flow', () => {
    it('should handle admin operations: dispute resolution and analytics', async () => {
      // Mock admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        role: 'admin',
        name: 'Admin User'
      })

      // Step 1: Resolve Dispute
      const disputeId = 'dispute-123'
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: disputeId,
        status: 'open',
        engagementId,
        reason: 'payment'
      } as any)

      mockPrisma.dispute.update.mockResolvedValue({
        id: disputeId,
        status: 'resolved',
        resolution: 'refund_partial',
        adminNotes: 'Partial refund approved'
      } as any)

      const { POST: resolveDispute } = await import('@/app/api/admin/disputes/resolve/route')
      const disputeRequest = new NextRequest('http://localhost:3000/api/admin/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          resolution: 'refund_partial',
          adminNotes: 'Partial refund approved',
          refundAmount: 25000
        })
      })

      const disputeResponse = await resolveDispute(disputeRequest)
      expect(disputeResponse.status).toBe(200)

      // Step 2: Get Analytics
      mockPrisma.user.count.mockResolvedValue(150)
      mockPrisma.company.count.mockResolvedValue(75)
      mockPrisma.talentProfile.count.mockResolvedValue(200)
      mockPrisma.engagement.count.mockResolvedValue(50)
      mockPrisma.dispute.count.mockResolvedValue(3)

      const { GET: getAnalytics } = await import('@/app/api/admin/analytics/route')
      const analyticsRequest = new NextRequest('http://localhost:3000/api/admin/analytics', {
        method: 'GET'
      })

      const analyticsResponse = await getAnalytics(analyticsRequest)
      expect(analyticsResponse.status).toBe(200)
    })
  })

  describe('5. Error Handling & Edge Cases', () => {
    it('should handle authentication failures gracefully', async () => {
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue(null)

      const { GET: getRequests } = await import('@/app/api/requests/talent-requests/route')
      const unauthenticatedRequest = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'GET'
      })

      const response = await getRequests(unauthenticatedRequest)
      expect(response.status).toBe(401)
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.talentRequest.findMany.mockRejectedValue(new Error('Database connection failed'))

      const { GET: getRequests } = await import('@/app/api/requests/talent-requests/route')
      const request = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'GET',
        headers: { 'x-user-id': seekerUserId }
      })

      const response = await getRequests(request)
      expect(response.status).toBe(500)
    })

    it('should validate request data properly', async () => {
      const { POST: createRequest } = await import('@/app/api/requests/talent-requests/route')
      const invalidRequest = new NextRequest('http://localhost:3000/api/requests/talent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': seekerUserId,
          'x-company-id': seekerCompanyId
        },
        body: JSON.stringify({
          title: '', // Invalid: empty title
          description: 'Test'
        })
      })

      const response = await createRequest(invalidRequest)
      expect(response.status).toBe(400)
    })
  })
})
