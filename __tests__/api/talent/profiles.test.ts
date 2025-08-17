import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createProfile, GET as listProfiles } from '@/app/api/talent/profiles/route'
import { PUT as updateProfile } from '@/app/api/talent/profiles/[id]/route'
import { POST as uploadCertification } from '@/app/api/talent/profiles/certifications/route'

// Mock Appwrite
jest.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    listDocuments: jest.fn()
  },
  storage: {
    createFile: jest.fn(),
    getFileView: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn()
}))

describe('Talent Profiles API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/talent/profiles', () => {
    it('should create a talent profile with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          title: 'Senior Developer',
          seniorityLevel: 'senior',
          skills: ['JavaScript', 'React', 'Node.js'],
          location: 'New York, NY',
          remotePreference: 'hybrid',
          rateMin: 80,
          rateMax: 120,
          currency: 'USD'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await createProfile(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.profile).toBeDefined()
      expect(data.profile.name).toBe('John Doe')
      expect(data.profile.isVisible).toBe(true)
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          title: '',
          skills: []
        })
      })

      const response = await createProfile(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors.name).toBe('Name is required')
      expect(data.errors.title).toBe('Title is required')
      expect(data.errors.skills).toBe('At least one skill is required')
    })

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          title: 'Developer'
        })
      })

      // Mock unauthenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue(null)

      const response = await createProfile(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('PUT /api/talent/profiles/[id]', () => {
    it('should update a talent profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles/profile-123', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Lead Developer',
          rateMin: 100,
          rateMax: 150
        })
      })

      // Mock authenticated user and existing profile
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'profile-123',
        companyId: 'company-123'
      })

      const response = await updateProfile(request, { params: { id: 'profile-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.profile.title).toBe('Lead Developer')
    })

    it('should prevent updating other company profiles', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles/profile-123', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Lead Developer'
        })
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      // Mock profile from different company
      jest.mocked(require('@/lib/appwrite').databases.getDocument).mockResolvedValue({
        $id: 'profile-123',
        companyId: 'different-company'
      })

      const response = await updateProfile(request, { params: { id: 'profile-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('GET /api/talent/profiles', () => {
    it('should list visible talent profiles', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles?skills=JavaScript&location=New York')

      const response = await listProfiles(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.profiles).toBeDefined()
      expect(Array.isArray(data.profiles)).toBe(true)
    })

    it('should filter profiles by skills and location', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles?skills=React&location=Remote')

      const response = await listProfiles(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.filters).toBeDefined()
      expect(data.filters.skills).toBe('React')
      expect(data.filters.location).toBe('Remote')
    })
  })

  describe('POST /api/talent/profiles/certifications', () => {
    it('should upload certification file', async () => {
      const formData = new FormData()
      const file = new File(['certificate content'], 'certificate.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('profileId', 'profile-123')
      formData.append('name', 'AWS Certified Developer')

      const request = new NextRequest('http://localhost:3000/api/talent/profiles/certifications', {
        method: 'POST',
        body: formData
      })

      // Mock authenticated user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-123',
        companyId: 'company-123'
      })

      const response = await uploadCertification(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.certification).toBeDefined()
      expect(data.certification.name).toBe('AWS Certified Developer')
    })

    it('should reject files larger than 10MB', async () => {
      const formData = new FormData()
      // Create a large file (simulated)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      formData.append('file', largeFile)
      formData.append('profileId', 'profile-123')

      const request = new NextRequest('http://localhost:3000/api/talent/profiles/certifications', {
        method: 'POST',
        body: formData
      })

      const response = await uploadCertification(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File size exceeds 10MB limit')
    })

    it('should reject unsupported file types', async () => {
      const formData = new FormData()
      const unsupportedFile = new File(['content'], 'file.exe', { type: 'application/x-msdownload' })
      formData.append('file', unsupportedFile)
      formData.append('profileId', 'profile-123')

      const request = new NextRequest('http://localhost:3000/api/talent/profiles/certifications', {
        method: 'POST',
        body: formData
      })

      const response = await uploadCertification(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unsupported file type. Only PDF, DOC, DOCX, JPG, PNG allowed')
    })
  })
})
