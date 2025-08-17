import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/talent/profiles - Get all talent profiles with filtering
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/talent/profiles',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const skills = searchParams.get('skills')?.split(',')
    const location = searchParams.get('location')
    const minRate = searchParams.get('minRate') ? parseInt(searchParams.get('minRate')!) : undefined
    const maxRate = searchParams.get('maxRate') ? parseInt(searchParams.get('maxRate')!) : undefined
    const availability = searchParams.get('availability')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {
      user: {
        role: 'talent',
        isActive: true
      }
    }

    if (skills && skills.length > 0) {
      where.skills = {
        some: {
          name: {
            in: skills
          }
        }
      }
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      }
    }

    if (minRate || maxRate) {
      where.hourlyRate = {}
      if (minRate) where.hourlyRate.gte = minRate
      if (maxRate) where.hourlyRate.lte = maxRate
    }

    if (availability) {
      where.availability = availability
    }

    // Get talent profiles with pagination
    const [profiles, total] = await Promise.all([
      prisma.talentProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              avatar: true,
              rating: true,
              totalReviews: true
            }
          },
          skills: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          }
        },
        orderBy: {
          rating: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.talentProfile.count({ where })
    ])

    requestLogger.info('Talent profiles retrieved successfully', {
      count: profiles.length,
      total,
      page,
      limit,
      filters: { skills, location, minRate, maxRate, availability }
    })

    return NextResponse.json({
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve talent profiles', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/talent/profiles - Create or update talent profile
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/talent/profiles',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      userId,
      title,
      bio,
      skills,
      experience,
      education,
      hourlyRate,
      location,
      availability,
      portfolio,
      certifications
    } = body

    if (!userId) {
      requestLogger.warn('Missing userId in talent profile creation')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate user exists and is a talent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    })

    if (!user) {
      requestLogger.warn('User not found for talent profile creation', { userId })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'talent') {
      requestLogger.warn('User is not a talent', { userId, role: user.role })
      return NextResponse.json(
        { error: 'User must be a talent to create profile' },
        { status: 403 }
      )
    }

    // Check if profile already exists
    const existingProfile = await prisma.talentProfile.findUnique({
      where: { userId }
    })

    let profile
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.talentProfile.update({
        where: { userId },
        data: {
          title,
          bio,
          experience,
          education,
          hourlyRate,
          location,
          availability,
          portfolio,
          certifications,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              avatar: true,
              rating: true,
              totalReviews: true
            }
          },
          skills: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          }
        }
      })

      requestLogger.info('Talent profile updated successfully', { userId })
    } else {
      // Create new profile
      profile = await prisma.talentProfile.create({
        data: {
          userId,
          title,
          bio,
          experience,
          education,
          hourlyRate,
          location,
          availability,
          portfolio,
          certifications,
          companyId: user.companyId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              avatar: true,
              rating: true,
              totalReviews: true
            }
          },
          skills: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          }
        }
      })

      requestLogger.info('Talent profile created successfully', { userId })
    }

    // Handle skills if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skills
      await prisma.talentSkill.deleteMany({
        where: { talentProfileId: profile.id }
      })

      // Add new skills
      for (const skill of skills) {
        await prisma.talentSkill.create({
          data: {
            talentProfileId: profile.id,
            name: skill.name,
            level: skill.level || 'intermediate'
          }
        })
      }
    }

    return NextResponse.json({
      message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully',
      profile
    })

  } catch (error) {
    requestLogger.error('Failed to create/update talent profile', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
