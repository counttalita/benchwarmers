import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

// Integration tests using real database with test containers
describe('Database Integration Tests', () => {
  let prisma: PrismaClient
  let testDbUrl: string

  beforeAll(async () => {
    // Set up test database URL (using Docker test container)
    testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/benchwarmers_test'
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl
        }
      }
    })

    // Run migrations on test database
    try {
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDbUrl }
      })
    } catch (error) {
      console.warn('Migration failed, continuing with existing schema')
    }

    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData()
  })

  async function cleanupTestData() {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `
    
    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
        } catch (error) {
          console.log(`Could not truncate ${tablename}, continuing...`)
        }
      }
    }
  }

  describe('Company and User Management', () => {
    it('should create company with users and maintain relationships', async () => {
      const companyId = randomUUID()
      const userId = randomUUID()

      // Create company
      const company = await prisma.company.create({
        data: {
          id: companyId,
          name: 'Test Corp',
          email: 'test@testcorp.com',
          type: 'seeker',
          status: 'active',
          domainVerified: true,
          domain: 'testcorp.com'
        }
      })

      // Create user associated with company
      const user = await prisma.user.create({
        data: {
          id: userId,
          email: 'user@testcorp.com',
          name: 'Test User',
          role: 'company_admin',
          companyId: companyId
        }
      })

      // Verify relationships
      const companyWithUsers = await prisma.company.findUnique({
        where: { id: companyId },
        include: { users: true }
      })

      expect(companyWithUsers).toBeTruthy()
      expect(companyWithUsers!.users).toHaveLength(1)
      expect(companyWithUsers!.users[0].id).toBe(userId)

      const userWithCompany = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true }
      })

      expect(userWithCompany!.company!.id).toBe(companyId)
    })

    it('should enforce unique email constraints', async () => {
      const email = 'duplicate@test.com'

      await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          name: 'First User',
          role: 'talent'
        }
      })

      // Attempt to create another user with same email
      await expect(
        prisma.user.create({
          data: {
            id: randomUUID(),
            email,
            name: 'Second User',
            role: 'talent'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Talent Request and Profile Matching', () => {
    let seekerCompanyId: string
    let providerUserId: string
    let talentProfileId: string

    beforeEach(async () => {
      seekerCompanyId = randomUUID()
      providerUserId = randomUUID()
      talentProfileId = randomUUID()

      // Create seeker company
      await prisma.company.create({
        data: {
          id: seekerCompanyId,
          name: 'Seeker Corp',
          email: 'seeker@corp.com',
          type: 'seeker',
          status: 'active',
          domainVerified: true,
          domain: 'seekercorp.com'
        }
      })

      // Create provider user
      await prisma.user.create({
        data: {
          id: providerUserId,
          email: 'provider@talent.com',
          name: 'Talented Provider',
          role: 'talent'
        }
      })

      // Create talent profile
      await prisma.talentProfile.create({
        data: {
          id: talentProfileId,
          userId: providerUserId,
          title: 'Senior React Developer',
          bio: 'Experienced React developer',
          skills: ['React', 'TypeScript', 'Node.js'],
          experienceLevel: 'senior',
          hourlyRate: 85,
          availability: 'available',
          location: 'Remote',
          yearsOfExperience: 6,
          languages: ['English'],
          timezone: 'UTC',
          isActive: true
        }
      })
    })

    it('should create talent request and find matching profiles', async () => {
      const requestId = randomUUID()

      // Create talent request
      const talentRequest = await prisma.talentRequest.create({
        data: {
          id: requestId,
          companyId: seekerCompanyId,
          title: 'Senior React Developer Needed',
          description: 'Looking for experienced React developer',
          budget: 5000,
          duration: 30,
          skillsRequired: ['React', 'TypeScript'],
          experienceLevel: 'senior',
          projectType: 'contract',
          urgency: 'medium',
          location: 'Remote',
          status: 'active'
        }
      })

      // Find matching profiles (simulate matching algorithm)
      const matchingProfiles = await prisma.talentProfile.findMany({
        where: {
          AND: [
            { experienceLevel: talentRequest.experienceLevel },
            { availability: 'available' },
            { isActive: true },
            {
              skills: {
                hasSome: talentRequest.skillsRequired
              }
            }
          ]
        },
        include: {
          user: true
        }
      })

      expect(matchingProfiles).toHaveLength(1)
      expect(matchingProfiles[0].id).toBe(talentProfileId)
      expect(matchingProfiles[0].skills).toEqual(
        expect.arrayContaining(['React', 'TypeScript'])
      )
    })
  })

  describe('Offer and Engagement Lifecycle', () => {
    let seekerCompanyId: string
    let providerUserId: string
    let talentRequestId: string
    let offerId: string

    beforeEach(async () => {
      seekerCompanyId = randomUUID()
      providerUserId = randomUUID()
      talentRequestId = randomUUID()
      offerId = randomUUID()

      // Set up base data
      await prisma.company.create({
        data: {
          id: seekerCompanyId,
          name: 'Seeker Corp',
          email: 'seeker@corp.com',
          type: 'seeker',
          status: 'active',
          domainVerified: true,
          domain: 'seekercorp.com'
        }
      })

      await prisma.user.create({
        data: {
          id: providerUserId,
          email: 'provider@talent.com',
          name: 'Talented Provider',
          role: 'talent'
        }
      })

      await prisma.talentRequest.create({
        data: {
          id: talentRequestId,
          companyId: seekerCompanyId,
          title: 'React Developer',
          description: 'Need React developer',
          budget: 5000,
          duration: 30,
          skillsRequired: ['React'],
          experienceLevel: 'senior',
          projectType: 'contract',
          urgency: 'medium',
          status: 'active'
        }
      })
    })

    it('should complete full offer to engagement lifecycle', async () => {
      const engagementId = randomUUID()

      // 1. Create offer
      const offer = await prisma.offer.create({
        data: {
          id: offerId,
          talentRequestId,
          providerUserId,
          proposedRate: 80,
          proposedDuration: 30,
          message: 'I would love to work on this project',
          status: 'pending'
        }
      })

      expect(offer.status).toBe('pending')

      // 2. Accept offer
      const acceptedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: { status: 'accepted' }
      })

      expect(acceptedOffer.status).toBe('accepted')

      // 3. Create engagement from accepted offer
      const engagement = await prisma.engagement.create({
        data: {
          id: engagementId,
          offerId,
          seekerCompanyId,
          providerUserId,
          title: 'React Development Project',
          description: 'Development work based on accepted offer',
          totalAmount: 2400, // 30 days * 80/hour
          startDate: new Date(),
          status: 'active'
        }
      })

      // 4. Verify relationships
      const engagementWithDetails = await prisma.engagement.findUnique({
        where: { id: engagementId },
        include: {
          offer: {
            include: {
              talentRequest: true,
              providerUser: true
            }
          },
          seekerCompany: true
        }
      })

      expect(engagementWithDetails).toBeTruthy()
      expect(engagementWithDetails!.offer.id).toBe(offerId)
      expect(engagementWithDetails!.seekerCompany.id).toBe(seekerCompanyId)
      expect(engagementWithDetails!.offer.providerUser.id).toBe(providerUserId)
    })
  })

  describe('Payment and Transaction Flow', () => {
    let engagementId: string
    let transactionId: string

    beforeEach(async () => {
      engagementId = randomUUID()
      transactionId = randomUUID()

      // Create minimal engagement for payment testing
      const seekerCompanyId = randomUUID()
      const providerUserId = randomUUID()

      await prisma.company.create({
        data: {
          id: seekerCompanyId,
          name: 'Payer Corp',
          email: 'payer@corp.com',
          type: 'seeker',
          status: 'active',
          domainVerified: true,
          domain: 'payercorp.com'
        }
      })

      await prisma.user.create({
        data: {
          id: providerUserId,
          email: 'payee@talent.com',
          name: 'Payee User',
          role: 'talent'
        }
      })

      await prisma.engagement.create({
        data: {
          id: engagementId,
          seekerCompanyId,
          providerUserId,
          title: 'Payment Test Engagement',
          description: 'For testing payments',
          totalAmount: 5000,
          startDate: new Date(),
          status: 'active'
        }
      })
    })

    it('should handle complete payment flow with escrow', async () => {
      const escrowPaymentId = randomUUID()

      // 1. Create initial payment transaction
      const transaction = await prisma.transaction.create({
        data: {
          id: transactionId,
          engagementId,
          amount: 2500, // Milestone payment
          type: 'milestone',
          status: 'pending',
          stripePaymentIntentId: 'pi_test123',
          metadata: { milestone: 1, description: 'First milestone' }
        }
      })

      // 2. Create escrow payment
      const escrowPayment = await prisma.escrowPayment.create({
        data: {
          id: escrowPaymentId,
          transactionId,
          amount: 2500,
          status: 'held',
          releaseConditions: { milestoneCompleted: true },
          holdUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })

      // 3. Complete milestone and release payment
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'completed' }
      })

      await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: { 
          status: 'released',
          releasedAt: new Date()
        }
      })

      // 4. Verify final state
      const finalTransaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          escrowPayments: true,
          engagement: true
        }
      })

      expect(finalTransaction!.status).toBe('completed')
      expect(finalTransaction!.escrowPayments[0].status).toBe('released')
      expect(finalTransaction!.escrowPayments[0].releasedAt).toBeTruthy()
    })

    it('should handle dispute creation and resolution', async () => {
      const disputeId = randomUUID()

      // Create transaction first
      await prisma.transaction.create({
        data: {
          id: transactionId,
          engagementId,
          amount: 2500,
          type: 'milestone',
          status: 'disputed'
        }
      })

      // Create dispute
      const dispute = await prisma.dispute.create({
        data: {
          id: disputeId,
          transactionId,
          raisedBy: 'seeker',
          reason: 'Work not completed as specified',
          description: 'The delivered work does not meet requirements',
          status: 'open',
          evidence: { screenshots: ['evidence1.png'], messages: ['msg1'] }
        }
      })

      // Resolve dispute
      const resolvedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved',
          resolution: 'Partial refund issued',
          resolvedAt: new Date(),
          resolvedBy: 'admin'
        }
      })

      expect(resolvedDispute.status).toBe('resolved')
      expect(resolvedDispute.resolvedAt).toBeTruthy()
    })
  })

  describe('Performance and Constraints', () => {
    it('should handle large dataset queries efficiently', async () => {
      const companyId = randomUUID()
      
      // Create company
      await prisma.company.create({
        data: {
          id: companyId,
          name: 'Big Corp',
          email: 'big@corp.com',
          type: 'seeker',
          status: 'active',
          domainVerified: true,
          domain: 'bigcorp.com'
        }
      })

      // Create multiple talent requests
      const requests = Array.from({ length: 50 }, (_, i) => ({
        id: randomUUID(),
        companyId,
        title: `Request ${i + 1}`,
        description: `Description for request ${i + 1}`,
        budget: 1000 + i * 100,
        duration: 30,
        skillsRequired: ['React', 'TypeScript'],
        experienceLevel: 'senior' as const,
        projectType: 'contract' as const,
        urgency: 'medium' as const,
        status: 'active' as const
      }))

      await prisma.talentRequest.createMany({
        data: requests
      })

      // Test pagination performance
      const startTime = Date.now()
      const paginatedResults = await prisma.talentRequest.findMany({
        where: { companyId },
        take: 10,
        skip: 20,
        orderBy: { createdAt: 'desc' }
      })
      const queryTime = Date.now() - startTime

      expect(paginatedResults).toHaveLength(10)
      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should enforce foreign key constraints', async () => {
      // Attempt to create offer with non-existent talent request
      await expect(
        prisma.offer.create({
          data: {
            id: randomUUID(),
            talentRequestId: 'non-existent-request',
            providerUserId: randomUUID(),
            proposedRate: 80,
            proposedDuration: 30,
            message: 'Test offer',
            status: 'pending'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain referential integrity during cascading deletes', async () => {
      const companyId = randomUUID()
      const userId = randomUUID()
      const requestId = randomUUID()

      // Create company with user and talent request
      await prisma.company.create({
        data: {
          id: companyId,
          name: 'Delete Test Corp',
          email: 'delete@test.com',
          type: 'seeker',
          status: 'active',
          domainVerified: true,
          domain: 'deletetest.com'
        }
      })

      await prisma.user.create({
        data: {
          id: userId,
          email: 'user@deletetest.com',
          name: 'Delete Test User',
          role: 'company_admin',
          companyId
        }
      })

      await prisma.talentRequest.create({
        data: {
          id: requestId,
          companyId,
          title: 'Delete Test Request',
          description: 'This will be deleted',
          budget: 1000,
          duration: 30,
          skillsRequired: ['React'],
          experienceLevel: 'junior',
          projectType: 'contract',
          urgency: 'low',
          status: 'active'
        }
      })

      // Delete company (should cascade to users and requests)
      await prisma.company.delete({
        where: { id: companyId }
      })

      // Verify cascading delete worked
      const deletedUser = await prisma.user.findUnique({
        where: { id: userId }
      })
      const deletedRequest = await prisma.talentRequest.findUnique({
        where: { id: requestId }
      })

      expect(deletedUser).toBeNull()
      expect(deletedRequest).toBeNull()
    })
  })
})
