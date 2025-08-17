import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError, logInfo } from '@/lib/logger'
import { z } from 'zod'

const uploadCertificationSchema = z.object({
  profileId: z.string(),
  certificationName: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  year: z.number().min(1900).max(new Date().getFullYear()),
  expiryDate: z.string().datetime().optional(),
  file: z.any() // File object
})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']

export async function POST(request: NextRequest) {
  const correlationId = `upload-certification-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Uploading certification', { correlationId })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const profileId = formData.get('profileId') as string
    const certificationName = formData.get('certificationName') as string
    const issuer = formData.get('issuer') as string
    const year = parseInt(formData.get('year') as string)
    const expiryDate = formData.get('expiryDate') as string
    const file = formData.get('file') as File

    // Validate required fields
    if (!profileId || !certificationName || !issuer || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: profileId, certificationName, issuer, file' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, DOC, DOCX, JPG, PNG allowed' },
        { status: 400 }
      )
    }

    // Verify profile exists and belongs to the company
    const profile = await prisma.talentProfile.findUnique({
      where: { id: profileId },
      include: { company: true }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Talent profile not found' },
        { status: 404 }
      )
    }

    if (profile.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // TODO: Upload file to storage service (e.g., AWS S3, Cloudinary)
    // For now, we'll just store the file metadata
    const fileUrl = `https://storage.example.com/certifications/${profileId}/${file.name}`

    // Create certification record
    const certification = await prisma.certification.create({
      data: {
        name: certificationName,
        issuer,
        year,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        profileId
      }
    })

    return NextResponse.json({
      success: true,
      certification
    }, { status: 201 })

  } catch (error) {
    logError('Failed to upload certification', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/talent/profiles/certifications - Get certifications for a profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const certifications = await prisma.certification.findMany({
      where: { profileId },
      orderBy: { issueDate: 'desc' }
    })

    return NextResponse.json({
      success: true,
      certifications
    })

  } catch (error) {
    logError('Failed to get certifications', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
