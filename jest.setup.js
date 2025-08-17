require('@testing-library/jest-dom')

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for ReadableStream
const { ReadableStream, WritableStream, TransformStream } = require('web-streams-polyfill')
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Polyfill for Web APIs needed by Next.js
require('whatwg-fetch')

// Mock Prisma globally
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
            user: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        talentRequest: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          count: jest.fn(),
        },
                    talentProfile: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          count: jest.fn(),
        },
        certification: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
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
    certification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
    oTPCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    otpCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    engagement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    escrowPayment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dispute: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    talentRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    talentProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      // Mock transaction by calling the callback with a mock transaction object
      const mockTx = {
        company: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        user: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        oTPCode: {
          create: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        otpCode: {
          create: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        engagement: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        escrowPayment: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        dispute: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        }
      }
      return callback(mockTx)
    })
  }
}))

// Mock resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null
      })
    }
  }))
}))

// Mock @/lib/twilio
jest.mock('@/lib/twilio', () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
  sendSMS: jest.fn().mockResolvedValue(true),
  generateOTP: jest.fn().mockReturnValue('123456'),
  validatePhoneNumber: jest.fn().mockReturnValue(true),
  formatPhoneNumber: jest.fn((phone) => phone.startsWith('+') ? phone : `+${phone}`),
  twilioClient: null,
  TWILIO_CONFIG: {
    accountSid: 'test-sid',
    phoneNumber: '+1234567890'
  }
}))

// Mock Twilio before any imports
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent'
      })
    }
  }))
})

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: global.Request,
  NextResponse: {
    json: (data, options) => new global.Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: options?.status || 200,
      ...options
    })
  }
}))

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  }
}))

// Mock environment variables
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1'
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'test-project-id'
process.env.APPWRITE_API_KEY = 'test-api-key'
process.env.TWILIO_ACCOUNT_SID = 'ACtestaccountsid123456789'
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token'
process.env.TWILIO_PHONE_NUM = '+1234567890'
process.env.STRIPE_SECRET_KEY = 'test-stripe-key'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock navigator for domain verification tests
global.navigator = {
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
  userAgent: 'test-user-agent',
  language: 'en-US',
  languages: ['en-US'],
  onLine: true,
  cookieEnabled: true,
  doNotTrack: null,
  maxTouchPoints: 0,
  hardwareConcurrency: 4,
  deviceMemory: 8,
  platform: 'test-platform',
  vendor: 'test-vendor',
  product: 'test-product',
  productSub: 'test-product-sub',
  userAgentData: {
    brands: [],
    mobile: false,
    platform: 'test-platform'
  }
}

// Mock @/lib/logger
jest.mock('@/lib/logger', () => ({
  logger: {
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    })),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logRequest: jest.fn(() => ({
    end: jest.fn(),
    error: jest.fn()
  })),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logAuth: jest.fn(),
  logDb: jest.fn(),
  logPerformance: jest.fn(),
  logBusiness: jest.fn(),
  logSecurity: jest.fn(),
  logWarning: jest.fn(),
  logApi: jest.fn(),
  logPayment: jest.fn(),
  default: {
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    })),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock navigator and clipboard
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: jest.fn(() => Promise.resolve()),
      readText: jest.fn(() => Promise.resolve('')),
    },
    userAgent: 'jest',
  },
  writable: true,
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }))
})
