import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createCertificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  credentialId: z.string().optional(),
  url: z.string().url().optional(),
  description: z.string().max(1000).optional()
})

const updateCertificationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  issuer: z.string().min(1).max(200).optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  credentialId: z.string().optional(),
  url: z.string().url().optional(),
  description: z.string().max(1000).optional()
})

// POST /api/talent/profiles/certifications - Create a new certification
export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = createCertificationSchema.parse(body)

    // Get user's talent profile
    const talentProfile = await prisma.talentProfile.findFirst({
      where: { userId: user.id }
    })

    if (!talentProfile) {
      return NextResponse.json(
        { error: 'Talent profile not found' },
        { status: 404 }
      )
    }

    // Create certification
    const certification = await prisma.certification.create({
      data: {
        ...validatedBody,
        talentProfileId: talentProfile.id
      }
    })

    logger.info('Certification created successfully', {
      userId: user.id,
      certificationId: certification.id
    })

    return NextResponse.json({
      success: true,
      certification
    })

  } catch (error) {
    logger.error('Failed to create certification', {
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

// GET /api/talent/profiles/certifications - Get certifications for a user
export async function GET(request: NextRequest) {
  const requestLogger = logger

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's talent profile
    const talentProfile = await prisma.talentProfile.findFirst({
      where: { userId }
    })

    if (!talentProfile) {
      return NextResponse.json(
        { error: 'Talent profile not found' },
        { status: 404 }
      )
    }

    // Get certifications
    const certifications = await prisma.certification.findMany({
      where: { talentProfileId: talentProfile.id },
      orderBy: { issueDate: 'desc' }
    })

    logger.info('Certifications retrieved successfully', {
      userId,
      count: certifications.length
    })

    return NextResponse.json({
      success: true,
      certifications
    })

  } catch (error) {
    logger.error('Failed to get certifications', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/talent/profiles/certifications/[id] - Update a certification
export async function PUT(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Certification ID is required' },
        { status: 400 }
      )
    }

    const validatedBody = updateCertificationSchema.parse(updateData)

    // Check if certification exists and belongs to user
    const existingCertification = await prisma.certification.findFirst({
      where: {
        id,
        talentProfile: { userId: user.id }
      }
    })

    if (!existingCertification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      )
    }

    // Update certification
    const updatedCertification = await prisma.certification.update({
      where: { id },
      data: validatedBody
    })

    logger.info('Certification updated successfully', {
      userId: user.id,
      certificationId: id
    })

    return NextResponse.json({
      success: true,
      certification: updatedCertification
    })

  } catch (error) {
    logger.error('Failed to update certification', {
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

// DELETE /api/talent/profiles/certifications/[id] - Delete a certification
export async function DELETE(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Certification ID is required' },
        { status: 400 }
      )
    }

    // Check if certification exists and belongs to user
    const existingCertification = await prisma.certification.findFirst({
      where: {
        id,
        talentProfile: { userId: user.id }
      }
    })

    if (!existingCertification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      )
    }

    // Delete certification
    await prisma.certification.delete({
      where: { id }
    })

    logger.info('Certification deleted successfully', {
      userId: user.id,
      certificationId: id
    })

    return NextResponse.json({
      success: true,
      message: 'Certification deleted successfully'
    })

  } catch (error) {
    logger.error('Failed to delete certification', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
