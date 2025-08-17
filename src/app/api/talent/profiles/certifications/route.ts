import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/talent/profiles/certifications - Get certifications for a talent profile
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/talent/profiles/certifications',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      requestLogger.warn('Missing profileId in certifications request')
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const certifications = await prisma.certification.findMany({
      where: { talentProfileId: profileId },
      orderBy: { issueDate: 'desc' }
    })

    requestLogger.info('Certifications retrieved successfully', {
      profileId,
      count: certifications.length
    })

    return NextResponse.json({
      certifications
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve certifications', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/talent/profiles/certifications - Add certification to talent profile
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/talent/profiles/certifications',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      talentProfileId,
      name,
      issuer,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    } = body

    if (!talentProfileId || !name || !issuer) {
      requestLogger.warn('Missing required fields in certification creation')
      return NextResponse.json(
        { error: 'Profile ID, name, and issuer are required' },
        { status: 400 }
      )
    }

    const certification = await prisma.certification.create({
      data: {
        talentProfileId,
        name,
        issuer,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialId,
        credentialUrl
      }
    })

    requestLogger.info('Certification created successfully', {
      certificationId: certification.id,
      talentProfileId,
      name
    })

    return NextResponse.json({
      message: 'Certification added successfully',
      certification
    })

  } catch (error) {
    requestLogger.error('Failed to create certification', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
