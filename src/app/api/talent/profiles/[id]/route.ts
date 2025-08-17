import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// PUT /api/talent/profiles/[id] - Update a talent profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = params.id
    const body = await request.json()
    const { 
      name, 
      skills, 
      experience, 
      hourlyRate, 
      location, 
      availability,
      preferences,
      userId 
    } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the existing profile
    const existingProfile = await prisma.talentProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user owns this profile
    if (existingProfile.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only update your own profile' },
        { status: 403 }
      )
    }

    // Validate hourly rate if provided
    if (hourlyRate && (hourlyRate < 10 || hourlyRate > 1000)) {
      return NextResponse.json(
        { error: 'Hourly rate must be between $10 and $1000' },
        { status: 400 }
      )
    }

    // Update the profile
    const updatedProfile = await prisma.talentProfile.update({
      where: { id: profileId },
      data: {
        ...(name && { name }),
        ...(skills && { skills }),
        ...(experience && { experience }),
        ...(hourlyRate && { hourlyRate }),
        ...(location && { location }),
        ...(availability && { availability }),
        ...(preferences && { preferences }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    logger.info('Talent profile updated successfully', { profileId, userId })

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    logger.error('Failed to update talent profile', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
