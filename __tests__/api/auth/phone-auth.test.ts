import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as sendOTP } from '@/app/api/auth/send-otp/route'
import { POST as verifyOTP } from '@/app/api/auth/verify-otp/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    oTPCode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    company: {
      findFirst: jest.fn()
    }
  }
}))

// Mock Twilio
jest.mock('@/lib/twilio', () => ({
  sendOTP: jest.fn(() => Promise.resolve(true)),
  generateOTP: jest.fn(() => '123456'),
  validatePhoneNumber: jest.fn(() => true),
  formatPhoneNumber: jest.fn((phone: string) => {
    if (phone.startsWith('+')) return phone
    return `+${phone}`
  }),
  sendSMS: jest.fn(() => Promise.resolve(true))
}))

// Helper function to create NextRequest
function createNextRequest(url: URL|RequestInfo, body: { phoneNumber?: string; otp?: string }) {
  const request = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request as any // Type assertion for test compatibility
}

describe('Phone Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set development environment for OTP testing
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
  })

  describe('POST /api/auth/send-otp', () => {
    it('should send OTP when valid phone number is provided', async () => {
      const request = createNextRequest('http://localhost:3000/api/auth/send-otp', { 
        phoneNumber: '+1234567890' 
      })

      // Mock existing user
      jest.mocked(require('@/lib/prisma').prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+1234567890',
        name: 'Test User',
        role: 'member',
        companyId: 'company-123'
      })

      // Mock OTP creation with specific OTP value
      jest.mocked(require('@/lib/prisma').prisma.oTPCode.create).mockResolvedValue({
        id: 'otp-123',
        userId: 'user-123',
        phoneNumber: '+1234567890',
        code: '123456',
        expiresAt: new Date(),
        verified: false,
        attempts: 0,
        createdAt: new Date()
      })

      // Mock the generateOTP function to return a specific value
      jest.mocked(require('@/lib/twilio').generateOTP).mockReturnValue('123456')

      const response = await sendOTP(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('OTP sent successfully')
      expect(data.phoneNumber).toBe('+1234567890') // formatPhoneNumber returns the formatted number
      expect(data.otp).toBeDefined() // Development mode returns OTP
      expect(typeof data.otp).toBe('string')
      expect(data.otp.length).toBe(6) // OTP should be 6 digits
    })

    it('should reject invalid phone numbers', async () => {
      const request = createNextRequest('http://localhost:3000/api/auth/send-otp', { 
        phoneNumber: 'invalid' 
      })

      // Mock invalid phone number
      jest.mocked(require('@/lib/twilio').validatePhoneNumber).mockReturnValue(false)

      const response = await sendOTP(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid phone number format. Please use international format (+1234567890)')
    })

    it('should handle missing phone number', async () => {
      const request = createNextRequest('http://localhost:3000/api/auth/send-otp', {})

      const response = await sendOTP(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Phone number is required')
    })
  })

  describe('POST /api/auth/verify-otp', () => {
    it('should verify correct OTP and return user data', async () => {
      const request = createNextRequest('http://localhost:3000/api/auth/verify-otp', { 
        phoneNumber: '+1234567890',
        otp: '123456'
      })

      // Mock user
      jest.mocked(require('@/lib/prisma').prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+1234567890',
        name: 'Test User',
        role: 'member',
        companyId: 'company-123',
        company: {
          id: 'company-123',
          name: 'Test Company',
          type: 'provider',
          status: 'active'
        }
      })

      // Mock OTP record
      jest.mocked(require('@/lib/prisma').prisma.oTPCode.findFirst).mockResolvedValue({
        id: 'otp-123',
        userId: 'user-123',
        phoneNumber: '+1234567890',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        verified: false,
        attempts: 0,
        createdAt: new Date()
      })

      const response = await verifyOTP(request)
      const data = await response.json()

      // Log the actual response for debugging
      console.log('Response status:', response.status)
      console.log('Response data:', data)

      expect(response.status).toBe(200)
      expect(data.message).toBe('OTP verified successfully')
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('user-123')
      expect(data.user.company).toBeDefined()
    })

    it('should reject incorrect OTP', async () => {
      const request = createNextRequest('http://localhost:3000/api/auth/verify-otp', { 
        phoneNumber: '+1234567890',
        otp: '000000'
      })

      // Mock user
      jest.mocked(require('@/lib/prisma').prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+1234567890'
      })

      // Mock OTP record
      jest.mocked(require('@/lib/prisma').prisma.oTPCode.findFirst).mockResolvedValue({
        id: 'otp-123',
        userId: 'user-123',
        phoneNumber: '+1234567890',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false,
        attempts: 0,
        createdAt: new Date()
      })

      const response = await verifyOTP(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid OTP. Please try again.')
    })
  })
})
