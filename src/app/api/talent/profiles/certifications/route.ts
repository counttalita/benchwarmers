import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// POST /api/talent/profiles/certifications - Upload certification file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const profileId = formData.get('profileId') as string
    const certificationName = formData.get('certificationName') as string
    const issuer = formData.get('issuer') as string
    const issueDate = formData.get('issueDate') as string

    // Validate required fields
    if (!file || !profileId || !certificationName || !issuer) {
      return NextResponse.json(
        { error: 'Missing required fields: file, profileId, certificationName, issuer' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Please upload PDF, JPEG, or PNG files' },
        { status: 400 }
      )
    }

    // Check if profile exists
    const profile = await prisma.talentProfile.findUnique({
      where: { id: profileId }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // TODO: Upload file to cloud storage (AWS S3, etc.)
    // For now, we'll just store the file metadata
    const fileUrl = `https://storage.example.com/certifications/${profileId}/${file.name}`

    // Create certification record
    const certification = await prisma.certification.create({
      data: {
        name: certificationName,
        issuer,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        profileId
      }
    })

    logger.info('Certification uploaded successfully', { 
      certificationId: certification.id, 
      profileId,
      fileName: file.name,
      fileSize: file.size
    })

    return NextResponse.json(
      { 
        success: true, 
        certification,
        message: 'Certification uploaded successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    logger.error('Failed to upload certification', { error: error instanceof Error ? error.message : 'Unknown error' })
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
    logger.error('Failed to get certifications', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
