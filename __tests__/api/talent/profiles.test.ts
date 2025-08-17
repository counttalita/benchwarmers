import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as createProfile, GET as listProfiles } from '@/app/api/talent/profiles/route'
import { PUT as updateProfile } from '@/app/api/talent/profiles/[id]/route'
import { POST as uploadCertification } from '@/app/api/talent/profiles/certifications/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    talentProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    company: {
      findUnique: jest.fn()
    },
    certification: {
      create: jest.fn()
    }
  }
}))

describe('Talent Profiles API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/talent/profiles', () => {
    it('should create a talent profile with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          name: 'John Doe',
          title: 'Senior Developer',
          skills: [
            { name: 'JavaScript', level: 'senior', yearsOfExperience: 5 },
            { name: 'React', level: 'senior', yearsOfExperience: 4 },
            { name: 'Node.js', level: 'senior', yearsOfExperience: 3 }
          ],
          location: 'New York, NY',
          rateMin: 80,
          rateMax: 120,
          currency: 'USD',
          availability: 'available'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.company.findUnique).mockResolvedValue({
        id: 'company-123',
        type: 'provider'
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.talentProfile.create).mockResolvedValue({
        id: 'profile-123',
        name: 'John Doe',
        title: 'Senior Developer',
        isVisible: true
      } as any)

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
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          name: '',
          title: '',
          skills: []
        })
      })

      const response = await createProfile(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.details).toBeDefined()
    })

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          title: 'Developer'
        })
      })

      const response = await createProfile(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Company ID is required')
    })
  })

  describe('PUT /api/talent/profiles/[id]', () => {
    it('should update a talent profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles/profile-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Lead Developer',
          rateMin: 100,
          rateMax: 150
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        companyId: 'company-123',
        title: 'Senior Developer',
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.talentProfile.update).mockResolvedValue({
        id: 'profile-123',
        title: 'Lead Developer',
        rateMax: 150
      } as any)

      const response = await updateProfile(request, { params: { id: 'profile-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.profile.title).toBe('Lead Developer')
    })

    it('should prevent updating other company profiles', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles/profile-123', {
        method: 'PUT',
        headers: {
          'x-company-id': 'company-123'
        },
        body: JSON.stringify({
          title: 'Lead Developer'
        })
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        companyId: 'different-company',
        title: 'Senior Developer',
        company: { id: 'different-company', name: 'Other Company' }
      } as any)

      const response = await updateProfile(request, { params: { id: 'profile-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('GET /api/talent/profiles', () => {
    it('should list visible talent profiles', async () => {
      const request = new NextRequest('http://localhost:3000/api/talent/profiles?skills=JavaScript&location=New York')

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findMany).mockResolvedValue([
        { id: 'profile-1', name: 'John Doe', company: { id: 'company-1', name: 'Company 1' } }
      ] as any)
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.count).mockResolvedValue(1)

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
      formData.append('certificationName', 'AWS Certified Developer')
      formData.append('issuer', 'AWS')
      formData.append('year', '2023')

      const request = new NextRequest('http://localhost:3000/api/talent/profiles/certifications', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: formData
      })

      // Mock Prisma responses
      jest.mocked(require('@/lib/prisma').prisma.talentProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        companyId: 'company-123',
        company: { id: 'company-123', name: 'Test Company' }
      } as any)

      jest.mocked(require('@/lib/prisma').prisma.certification.create).mockResolvedValue({
        id: 'cert-123',
        name: 'AWS Certified Developer',
        issuer: 'AWS',
        year: 2023
      } as any)

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
      formData.append('certificationName', 'Test Cert')
      formData.append('issuer', 'Test Issuer')
      formData.append('year', '2023')

      const request = new NextRequest('http://localhost:3000/api/talent/profiles/certifications', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
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
      formData.append('certificationName', 'Test Cert')
      formData.append('issuer', 'Test Issuer')
      formData.append('year', '2023')

      const request = new NextRequest('http://localhost:3000/api/talent/profiles/certifications', {
        method: 'POST',
        headers: {
          'x-company-id': 'company-123'
        },
        body: formData
      })

      const response = await uploadCertification(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unsupported file type. Only PDF, DOC, DOCX, JPG, PNG allowed')
    })
  })
})
