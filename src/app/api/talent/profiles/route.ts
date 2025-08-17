import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// POST /api/talent/profiles - Create a talent profile
export async function POST(request: NextRequest) {
  try {
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
    if (!name || !skills || !hourlyRate || !location || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, skills, hourlyRate, location, userId' },
        { status: 400 }
      )
    }

    // Validate hourly rate
    if (hourlyRate < 10 || hourlyRate > 1000) {
      return NextResponse.json(
        { error: 'Hourly rate must be between $10 and $1000' },
        { status: 400 }
      )
    }

    // Check if user already has a profile
    const existingProfile = await prisma.talentProfile.findFirst({
      where: { userId }
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User already has a talent profile' },
        { status: 409 }
      )
    }

    // Create the talent profile
    const profile = await prisma.talentProfile.create({
      data: {
        name,
        skills: skills || [],
        experience: experience || [],
        hourlyRate,
        location,
        availability: availability || [],
        preferences: preferences || {},
        userId,
        isAvailable: true,
        rating: 0,
        totalReviews: 0
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

    logger.info('Talent profile created successfully', { profileId: profile.id, userId })

    return NextResponse.json(
      { 
        success: true, 
        profile,
        message: 'Talent profile created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    logger.error('Failed to create talent profile', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/talent/profiles - List talent profiles with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const skills = searchParams.get('skills')
    const location = searchParams.get('location')
    const minRate = searchParams.get('minRate')
    const maxRate = searchParams.get('maxRate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {
      isAvailable: true
    }

    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim())
      where.skills = {
        some: {
          name: {
            in: skillArray
          }
        }
      }
    }

    if (location) {
      where.location = {
        path: ['city'],
        string_contains: location
      }
    }

    if (minRate || maxRate) {
      where.hourlyRate = {}
      if (minRate) where.hourlyRate.gte = parseInt(minRate)
      if (maxRate) where.hourlyRate.lte = parseInt(maxRate)
    }

    // Get profiles with pagination
    const [profiles, totalCount] = await Promise.all([
      prisma.talentProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          skills: true,
          experience: true
        },
        orderBy: { rating: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.talentProfile.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      profiles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    logger.error('Failed to list talent profiles', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
