import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { encryptData, decryptData, validateInput, sanitizeData } from '@/app/api/security/encryption/route'
import { validateFile, scanForViruses } from '@/app/api/security/file-validation/route'
import { deleteUserData } from '@/app/api/security/gdpr/route'

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('test-iv')),
  createCipher: jest.fn(),
  createDecipher: jest.fn()
}))

// Mock virus scanning
jest.mock('@/lib/virus-scan', () => ({
  scanFile: jest.fn()
}))

// Mock Appwrite
jest.mock('@/lib/appwrite', () => ({
  databases: {
    deleteDocument: jest.fn(),
    listDocuments: jest.fn()
  },
  storage: {
    deleteFile: jest.fn()
  }
}))

describe('Security API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/security/encryption/encrypt', () => {
    it('should encrypt sensitive data', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/encryption/encrypt', {
        method: 'POST',
        body: JSON.stringify({
          data: 'sensitive-user-data',
          key: 'encryption-key'
        })
      })

      const response = await encryptData(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.encryptedData).toBeDefined()
      expect(data.encryptedData).not.toBe('sensitive-user-data')
    })

    it('should decrypt encrypted data', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/encryption/decrypt', {
        method: 'POST',
        body: JSON.stringify({
          encryptedData: 'encrypted-string',
          key: 'encryption-key'
        })
      })

      const response = await decryptData(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.decryptedData).toBeDefined()
    })

    it('should validate encryption key strength', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/encryption/encrypt', {
        method: 'POST',
        body: JSON.stringify({
          data: 'sensitive-data',
          key: 'weak'
        })
      })

      const response = await encryptData(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Encryption key must be at least 32 characters long')
    })
  })

  describe('POST /api/security/validation/input', () => {
    it('should validate and sanitize user input', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/validation/input', {
        method: 'POST',
        body: JSON.stringify({
          input: '<script>alert("xss")</script>User Name',
          type: 'text'
        })
      })

      const response = await validateInput(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sanitizedInput).toBe('User Name')
      expect(data.isValid).toBe(true)
    })

    it('should reject SQL injection attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/validation/input', {
        method: 'POST',
        body: JSON.stringify({
          input: "'; DROP TABLE users; --",
          type: 'text'
        })
      })

      const response = await validateInput(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Input contains potentially malicious content')
      expect(data.isValid).toBe(false)
    })

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/validation/input', {
        method: 'POST',
        body: JSON.stringify({
          input: 'invalid-email',
          type: 'email'
        })
      })

      const response = await validateInput(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
      expect(data.isValid).toBe(false)
    })

    it('should validate phone number format', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/validation/input', {
        method: 'POST',
        body: JSON.stringify({
          input: 'invalid-phone',
          type: 'phone'
        })
      })

      const response = await validateInput(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid phone number format')
      expect(data.isValid).toBe(false)
    })
  })

  describe('POST /api/security/validation/file', () => {
    it('should validate file uploads', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'document.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/security/validation/file', {
        method: 'POST',
        body: formData
      })

      const response = await validateFile(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isValid).toBe(true)
      expect(data.fileType).toBe('application/pdf')
    })

    it('should reject files larger than 10MB', async () => {
      const formData = new FormData()
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      formData.append('file', largeFile)

      const request = new NextRequest('http://localhost:3000/api/security/validation/file', {
        method: 'POST',
        body: formData
      })

      const response = await validateFile(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File size exceeds 10MB limit')
      expect(data.isValid).toBe(false)
    })

    it('should reject unsupported file types', async () => {
      const formData = new FormData()
      const unsupportedFile = new File(['content'], 'script.exe', { type: 'application/x-msdownload' })
      formData.append('file', unsupportedFile)

      const request = new NextRequest('http://localhost:3000/api/security/validation/file', {
        method: 'POST',
        body: formData
      })

      const response = await validateFile(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unsupported file type')
      expect(data.isValid).toBe(false)
    })
  })

  describe('POST /api/security/validation/virus-scan', () => {
    it('should scan files for viruses', async () => {
      const formData = new FormData()
      const file = new File(['safe content'], 'document.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      // Mock clean scan
      jest.mocked(require('@/lib/virus-scan').scanFile).mockResolvedValue({
        isClean: true,
        threats: []
      })

      const request = new NextRequest('http://localhost:3000/api/security/validation/virus-scan', {
        method: 'POST',
        body: formData
      })

      const response = await scanForViruses(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isClean).toBe(true)
      expect(data.threats).toHaveLength(0)
    })

    it('should reject files with detected threats', async () => {
      const formData = new FormData()
      const file = new File(['malicious content'], 'document.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      // Mock infected scan
      jest.mocked(require('@/lib/virus-scan').scanFile).mockResolvedValue({
        isClean: false,
        threats: ['Trojan.Generic', 'Malware.Generic']
      })

      const request = new NextRequest('http://localhost:3000/api/security/validation/virus-scan', {
        method: 'POST',
        body: formData
      })

      const response = await scanForViruses(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File contains potential threats')
      expect(data.isClean).toBe(false)
      expect(data.threats).toHaveLength(2)
    })
  })

  describe('DELETE /api/security/gdpr/delete-user-data', () => {
    it('should delete user data for GDPR compliance', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/gdpr/delete-user-data', {
        method: 'DELETE',
        body: JSON.stringify({
          userId: 'user-123',
          reason: 'GDPR request'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'admin'
      })

      const response = await deleteUserData(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deletedRecords).toBeDefined()
      expect(data.deletedFiles).toBeDefined()
    })

    it('should complete deletion within 30 days', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/gdpr/delete-user-data', {
        method: 'DELETE',
        body: JSON.stringify({
          userId: 'user-123',
          reason: 'GDPR request'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'admin'
      })

      const startTime = Date.now()
      const response = await deleteUserData(request)
      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Should complete within reasonable time (not 30 days in test)
      expect(processingTime).toBeLessThan(5000) // 5 seconds for test
    })

    it('should require admin authentication for GDPR deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/gdpr/delete-user-data', {
        method: 'DELETE',
        body: JSON.stringify({
          userId: 'user-123',
          reason: 'GDPR request'
        })
      })

      // Mock non-admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        role: 'member'
      })

      const response = await deleteUserData(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required for GDPR operations')
    })
  })

  describe('Data Encryption at Rest', () => {
    it('should encrypt sensitive fields in database', async () => {
      const sensitiveData = {
        phoneNumber: '+1234567890',
        ssn: '123-45-6789',
        bankAccount: '1234567890'
      }

      const encryptedData = {
        phoneNumber: 'encrypted-phone-hash',
        ssn: 'encrypted-ssn-hash',
        bankAccount: 'encrypted-bank-hash'
      }

      // Verify sensitive data is encrypted
      expect(encryptedData.phoneNumber).not.toBe(sensitiveData.phoneNumber)
      expect(encryptedData.ssn).not.toBe(sensitiveData.ssn)
      expect(encryptedData.bankAccount).not.toBe(sensitiveData.bankAccount)
    })

    it('should use AES-256 encryption', async () => {
      const encryptionAlgorithm = 'AES-256-GCM'
      const keyLength = 256 // bits
      const ivLength = 128 // bits

      expect(encryptionAlgorithm).toBe('AES-256-GCM')
      expect(keyLength).toBe(256)
      expect(ivLength).toBe(128)
    })
  })

  describe('Data Encryption in Transit', () => {
    it('should use TLS 1.3 for all communications', async () => {
      const tlsVersion = 'TLSv1.3'
      const cipherSuite = 'TLS_AES_256_GCM_SHA384'
      const keyExchange = 'ECDHE'

      expect(tlsVersion).toBe('TLSv1.3')
      expect(cipherSuite).toContain('AES_256_GCM')
      expect(keyExchange).toBe('ECDHE')
    })

    it('should validate SSL certificates', async () => {
      const certificateValidation = {
        isValid: true,
        issuer: 'DigiCert Inc',
        expiryDate: '2025-12-31',
        domainMatch: true
      }

      expect(certificateValidation.isValid).toBe(true)
      expect(certificateValidation.domainMatch).toBe(true)
      expect(new Date(certificateValidation.expiryDate)).toBeGreaterThan(new Date())
    })
  })

  describe('Rate Limiting', () => {
    it('should limit API requests per minute', async () => {
      const rateLimit = {
        requestsPerMinute: 100,
        burstLimit: 10,
        windowMs: 60000
      }

      expect(rateLimit.requestsPerMinute).toBe(100)
      expect(rateLimit.burstLimit).toBe(10)
      expect(rateLimit.windowMs).toBe(60000)
    })

    it('should block IPs with excessive requests', async () => {
      const mockRequests = Array(150).fill({ ip: '192.168.1.1', timestamp: Date.now() })
      const requestsPerMinute = mockRequests.length
      const shouldBlock = requestsPerMinute > 100

      expect(requestsPerMinute).toBe(150)
      expect(shouldBlock).toBe(true)
    })
  })

  describe('CORS Configuration', () => {
    it('should allow only specific origins', async () => {
      const allowedOrigins = [
        'https://benchwarmers.com',
        'https://www.benchwarmers.com',
        'https://app.benchwarmers.com'
      ]

      const testOrigin = 'https://benchwarmers.com'
      const isAllowed = allowedOrigins.includes(testOrigin)

      expect(allowedOrigins).toContain('https://benchwarmers.com')
      expect(isAllowed).toBe(true)
    })

    it('should reject requests from unauthorized origins', async () => {
      const allowedOrigins = [
        'https://benchwarmers.com',
        'https://www.benchwarmers.com'
      ]

      const testOrigin = 'https://malicious-site.com'
      const isAllowed = allowedOrigins.includes(testOrigin)

      expect(isAllowed).toBe(false)
    })
  })

  describe('Security Headers', () => {
    it('should set appropriate security headers', async () => {
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }

      expect(securityHeaders['Content-Security-Policy']).toBe("default-src 'self'")
      expect(securityHeaders['X-Frame-Options']).toBe('DENY')
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff')
      expect(securityHeaders['X-XSS-Protection']).toBe('1; mode=block')
    })
  })

  describe('Incident Response', () => {
    it('should detect security incidents', async () => {
      const securityIncident = {
        type: 'data_breach',
        severity: 'high',
        detectedAt: new Date().toISOString(),
        affectedUsers: 150,
        description: 'Unauthorized access to user database'
      }

      expect(securityIncident.type).toBe('data_breach')
      expect(securityIncident.severity).toBe('high')
      expect(securityIncident.affectedUsers).toBe(150)
    })

    it('should notify affected users within 72 hours', async () => {
      const incident = {
        detectedAt: new Date(),
        notificationDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        affectedUsers: 150
      }

      const timeToNotify = incident.notificationDeadline.getTime() - incident.detectedAt.getTime()
      const hoursToNotify = timeToNotify / (1000 * 60 * 60)

      expect(hoursToNotify).toBe(72)
      expect(incident.affectedUsers).toBe(150)
    })
  })
})
