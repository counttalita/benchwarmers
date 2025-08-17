// Integration test setup
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream, WritableStream, TransformStream } from 'stream/web'
import 'whatwg-fetch'

// Polyfills for Node.js test environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Mock external services for integration tests
jest.mock('@/lib/twilio', () => ({
  sendOTP: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  generateOTP: jest.fn().mockReturnValue('123456'),
  validatePhoneNumber: jest.fn().mockResolvedValue(true),
  formatPhoneNumber: jest.fn().mockImplementation((phone) => phone),
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}))

jest.mock('@/lib/stripe', () => ({
  createPaymentIntent: jest.fn().mockResolvedValue({ 
    id: 'pi_test123', 
    client_secret: 'pi_test123_secret',
    amount: 1000,
    currency: 'usd',
    status: 'requires_payment_method'
  }),
  createTransfer: jest.fn().mockResolvedValue({ 
    id: 'tr_test123', 
    amount: 850,
    currency: 'usd',
    status: 'pending'
  }),
  createConnectAccount: jest.fn().mockResolvedValue({ 
    id: 'acct_test123', 
    object: 'account',
    business_type: 'individual',
    charges_enabled: false,
    country: 'US',
    created: 1234567890,
    default_currency: 'usd',
    details_submitted: false,
    payouts_enabled: false,
    requirements: {
      currently_due: ['external_account'],
      eventually_due: [],
      past_due: []
    }
  }),
  createOnboardingLink: jest.fn().mockResolvedValue({
    url: 'https://connect.stripe.com/setup/s/test123'
  }),
  getAccountStatus: jest.fn().mockResolvedValue({
    id: 'acct_test123',
    charges_enabled: true,
    payouts_enabled: true,
    requirements: {
      currently_due: [],
      eventually_due: [],
      past_due: []
    }
  }),
  getPaymentIntentStatus: jest.fn().mockResolvedValue({
    id: 'pi_test123',
    status: 'succeeded',
    amount: 1000,
    currency: 'usd'
  }),
  refundPayment: jest.fn().mockResolvedValue({
    id: 're_test123',
    amount: 1000,
    currency: 'usd',
    status: 'succeeded'
  })
}))

jest.mock('@/lib/resend', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue({ 
    id: 'test-email-id',
    from: 'noreply@benchwarmers.com',
    to: 'test@example.com',
    subject: 'Test Email'
  }),
  sendDomainVerificationEmail: jest.fn().mockResolvedValue({ 
    id: 'test-verification-id',
    from: 'noreply@benchwarmers.com',
    to: 'admin@testcompany.com',
    subject: 'Domain Verification'
  })
}))

jest.mock('@/lib/pusher/config', () => ({
  triggerUserNotification: jest.fn().mockResolvedValue(true),
  triggerCompanyNotification: jest.fn().mockResolvedValue(true),
  EVENTS: {
    NOTIFICATION_CREATED: 'notification-created',
    NOTIFICATION_UPDATED: 'notification-updated',
    OFFER_CREATED: 'offer-created',
    OFFER_ACCEPTED: 'offer-accepted',
    ENGAGEMENT_STARTED: 'engagement-started',
    ENGAGEMENT_COMPLETED: 'engagement-completed',
    PAYMENT_PROCESSED: 'payment-processed',
    REVIEW_CREATED: 'review-created'
  }
}))

// Mock Prisma for integration tests with more realistic responses
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'company-' + Date.now(),
        ...data.data,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockImplementation((where) => {
        if (where.where.id === 'test-company-123') {
          return Promise.resolve({
            id: 'test-company-123',
            name: 'Test Company',
            type: 'seeker',
            status: 'active',
            verifiedAt: new Date()
          })
        }
        return Promise.resolve(null)
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    user: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'user-' + Date.now(),
        ...data.data,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    oTPCode: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'otp-' + Date.now(),
        ...data.data,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        createdAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 })
    },
    talentRequest: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'request-' + Date.now(),
        ...data.data,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    talentProfile: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'profile-' + Date.now(),
        ...data.data,
        status: 'active',
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    offer: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'offer-' + Date.now(),
        ...data.data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    engagement: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'engagement-' + Date.now(),
        ...data.data,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    escrowPayment: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'escrow-' + Date.now(),
        ...data.data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    review: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'review-' + Date.now(),
        ...data.data,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 10 },
        _min: { rating: 1 },
        _max: { rating: 5 }
      }),
      groupBy: jest.fn().mockResolvedValue([
        { rating: 5, _count: { rating: 6 } },
        { rating: 4, _count: { rating: 3 } },
        { rating: 3, _count: { rating: 1 } }
      ])
    },
    notification: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'notification-' + Date.now(),
        ...data.data,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    notificationPreference: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'pref-' + Date.now(),
        ...data.data,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((data) => Promise.resolve({
        ...data.data,
        id: data.where.id,
        updatedAt: new Date()
      })),
      count: jest.fn().mockResolvedValue(0)
    },
    $transaction: jest.fn().mockImplementation((callback) => callback({
      company: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'company-' + Date.now(),
          ...data.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      user: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'user-' + Date.now(),
          ...data.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      oTPCode: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'otp-' + Date.now(),
          ...data.data,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          createdAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
      },
      talentRequest: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'request-' + Date.now(),
          ...data.data,
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      talentProfile: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'profile-' + Date.now(),
          ...data.data,
          status: 'active',
          isVisible: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      offer: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'offer-' + Date.now(),
          ...data.data,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      engagement: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'engagement-' + Date.now(),
          ...data.data,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      escrowPayment: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'escrow-' + Date.now(),
          ...data.data,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      review: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'review-' + Date.now(),
          ...data.data,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { rating: 10 },
          _min: { rating: 1 },
          _max: { rating: 5 }
        }),
        groupBy: jest.fn().mockResolvedValue([
          { rating: 5, _count: { rating: 6 } },
          { rating: 4, _count: { rating: 3 } },
          { rating: 3, _count: { rating: 1 } }
        ])
      },
      notification: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'notification-' + Date.now(),
          ...data.data,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      },
      notificationPreference: {
        create: jest.fn().mockImplementation((data) => Promise.resolve({
          id: 'pref-' + Date.now(),
          ...data.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date()
        })),
        count: jest.fn().mockResolvedValue(0)
      }
    }))
  }
}))

// Mock logger for integration tests
jest.mock('@/lib/logger', () => ({
  logRequest: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logDebug: jest.fn(),
  logAuth: jest.fn(),
  logSecurity: jest.fn(),
  logDb: jest.fn(),
  logApi: jest.fn(),
  logPayment: jest.fn(),
  logPerformance: jest.fn(),
  logBusiness: jest.fn()
}))

// Global test utilities
global.testUtils = {
  createTestCompany: (type = 'seeker') => ({
    id: 'test-company-' + Date.now(),
    name: 'Test Company',
    type,
    status: 'active',
    verifiedAt: new Date()
  }),
  
  createTestUser: (companyId) => ({
    id: 'test-user-' + Date.now(),
    name: 'Test User',
    email: 'test@example.com',
    companyId,
    role: 'admin'
  }),
  
  createTestRequest: (companyId) => ({
    id: 'test-request-' + Date.now(),
    title: 'Test Request',
    description: 'Test description',
    companyId,
    status: 'open',
    budget: { min: 100, max: 200, currency: 'USD' },
    requiredSkills: [{ name: 'React', level: 'senior', priority: 'required' }]
  }),
  
  createTestProfile: (companyId) => ({
    id: 'test-profile-' + Date.now(),
    name: 'Test Profile',
    title: 'Test Title',
    companyId,
    status: 'active',
    skills: [{ name: 'React', level: 'senior', yearsOfExperience: 5 }],
    rateMin: 80,
    rateMax: 120,
    currency: 'USD'
  }),
  
  createTestEngagement: (requestId, offerId) => ({
    id: 'test-engagement-' + Date.now(),
    requestId,
    offerId,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    totalAmount: 1000,
    currency: 'USD'
  })
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
