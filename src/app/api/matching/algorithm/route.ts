import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// POST /api/matching/algorithm - Find talent matches for a request
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/matching/algorithm',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      requestId,
      requiredSkills,
      budget,
      location,
      duration,
      isRemote
    } = body

    if (!requestId) {
      requestLogger.warn('Missing requestId in matching algorithm')
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Validate talent request exists
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: requestId },
      include: {
        requiredSkills: true
      }
    })

    if (!talentRequest) {
      requestLogger.warn('Talent request not found for matching', { requestId })
      return NextResponse.json(
        { error: 'Talent request not found' },
        { status: 404 }
      )
    }

    // Build matching criteria
    const matchingCriteria = {
      requiredSkills: requiredSkills || talentRequest.requiredSkills.map(s => s.name),
      budget: budget || talentRequest.budget,
      location: location || talentRequest.location,
      duration: duration || talentRequest.duration,
      isRemote: isRemote !== undefined ? isRemote : talentRequest.isRemote
    }

    // Find matching talent profiles
    const matchingProfiles = await prisma.talentProfile.findMany({
      where: {
        user: {
          role: 'talent',
          isActive: true
        },
        // Skill matching
        skills: {
          some: {
            name: {
              in: matchingCriteria.requiredSkills
            }
          }
        },
        // Budget matching (within 20% range)
        hourlyRate: {
          gte: matchingCriteria.budget * 0.8,
          lte: matchingCriteria.budget * 1.2
        },
        // Location matching (if not remote)
        ...(matchingCriteria.isRemote ? {} : {
          location: {
            contains: matchingCriteria.location,
            mode: 'insensitive'
          }
        }),
        // Availability matching
        availability: {
          in: ['available', 'part_time']
        }
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

    // Calculate match scores
    const scoredMatches = matchingProfiles.map(profile => {
      let score = 0
      const maxScore = 100

      // Skill match (40 points)
      const profileSkills = profile.skills.map(s => s.name)
      const skillMatches = matchingCriteria.requiredSkills.filter(skill => 
        profileSkills.includes(skill)
      )
      score += (skillMatches.length / matchingCriteria.requiredSkills.length) * 40

      // Budget match (25 points)
      const budgetDiff = Math.abs(profile.hourlyRate - matchingCriteria.budget)
      const budgetScore = Math.max(0, 25 - (budgetDiff / matchingCriteria.budget) * 25)
      score += budgetScore

      // Location match (20 points)
      if (matchingCriteria.isRemote) {
        score += 20 // Full points for remote work
      } else if (profile.location && matchingCriteria.location) {
        const locationMatch = profile.location.toLowerCase().includes(matchingCriteria.location.toLowerCase())
        score += locationMatch ? 20 : 10
      }

      // Rating match (15 points)
      if (profile.user.rating) {
        score += (profile.user.rating / 5) * 15
      }

      return {
        ...profile,
        matchScore: Math.round(score),
        skillMatches: skillMatches.length,
        totalRequiredSkills: matchingCriteria.requiredSkills.length
      }
    })

    // Sort by match score (descending)
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore)

    // Take top 10 matches
    const topMatches = scoredMatches.slice(0, 10)

    requestLogger.info('Matching algorithm completed', {
      requestId,
      totalMatches: matchingProfiles.length,
      topMatches: topMatches.length,
      criteria: matchingCriteria
    })

    return NextResponse.json({
      message: 'Matches found successfully',
      matches: topMatches,
      totalMatches: matchingProfiles.length,
      criteria: matchingCriteria
    })

  } catch (error) {
    requestLogger.error('Failed to run matching algorithm', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/matching/algorithm - Get matching statistics
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/matching/algorithm',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      requestLogger.warn('Missing requestId in matching statistics request')
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Get matching statistics
    const [totalTalent, availableTalent, skillMatches] = await Promise.all([
      prisma.user.count({
        where: {
          role: 'talent',
          isActive: true
        }
      }),
      prisma.talentProfile.count({
        where: {
          user: {
            role: 'talent',
            isActive: true
          },
          availability: {
            in: ['available', 'part_time']
          }
        }
      }),
      prisma.talentSkill.count({
        where: {
          talentProfile: {
            user: {
              role: 'talent',
              isActive: true
            }
          }
        }
      })
    ])

    requestLogger.info('Matching statistics retrieved', {
      requestId,
      totalTalent,
      availableTalent,
      skillMatches
    })

    return NextResponse.json({
      statistics: {
        totalTalent,
        availableTalent,
        skillMatches,
        availabilityRate: totalTalent > 0 ? (availableTalent / totalTalent) * 100 : 0
      }
    })

  } catch (error) {
    requestLogger.error('Failed to get matching statistics', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
