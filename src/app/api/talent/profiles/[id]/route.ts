import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateProfileSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  bio: z.string().min(1).max(1000).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().min(0).max(50).optional(),
  hourlyRate: z.number().min(0).optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional()
})

// GET /api/talent/profiles/[id] - Get a specific talent profile
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestLogger = logger

  try {
    const profile = await prisma.talentProfile.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        certifications: true,
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true }
            }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            reviews: true,
            engagements: true
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: { revieweeId: profile.userId },
      _avg: { rating: true }
    })

    logger.info('Talent profile retrieved successfully', {
      profileId: resolvedParams.id
    })

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        averageRating: avgRating._avg.rating || 0
      }
    })

  } catch (error) {
    logger.error('Failed to get talent profile', {
      profileId: resolvedParams.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/talent/profiles/[id] - Update a talent profile
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestLogger = logger

  try {
    const resolvedParams = await params
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if profile exists
    const existingProfile = await prisma.talentProfile.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user owns this profile
    if (existingProfile.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedBody = updateProfileSchema.parse(body)

    // Update profile
    const updatedProfile = await prisma.talentProfile.update({
      where: { id: resolvedParams.id },
      data: validatedBody,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        certifications: true
      }
    })

    logger.info('Talent profile updated successfully', {
      profileId: resolvedParams.id,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })

  } catch (error) {
    logger.error('Failed to update talent profile', {
      profileId: resolvedParams.id,
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

// DELETE /api/talent/profiles/[id] - Delete a talent profile
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestLogger = logger

  try {
    const resolvedParams = await params
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if profile exists
    const existingProfile = await prisma.talentProfile.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user owns this profile
    if (existingProfile.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if profile has active engagements
    const activeEngagements = await prisma.engagement.count({
      where: {
        talentProfileId: resolvedParams.id,
        status: { in: ['active', 'pending'] }
      }
    })

    if (activeEngagements > 0) {
      return NextResponse.json(
        { error: 'Cannot delete profile with active engagements' },
        { status: 400 }
      )
    }

    // Delete profile
    await prisma.talentProfile.delete({
      where: { id: resolvedParams.id }
    })

    logger.info('Talent profile deleted successfully', {
      profileId: resolvedParams.id,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    })

  } catch (error) {
    logger.error('Failed to delete talent profile', {
      profileId: resolvedParams.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
