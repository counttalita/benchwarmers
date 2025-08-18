import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import logger from '@/lib/logger'
import { MatchingEngine } from '@/lib/matching/matching-engine'

const matchingEngine = new MatchingEngine()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = resolvedParams.id

    // Get the talent request
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: requestId },
      include: {
        company: true
      }
    })

    if (!talentRequest) {
      return NextResponse.json({ error: 'Talent request not found' }, { status: 404 })
    }

    // Verify user belongs to seeker company
    if (talentRequest.companyId !== user.companyId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify company is a seeker
    const seekerUsers = talentRequest.company.users.filter((user: any) => user.role === 'seeker')
    if (seekerUsers.length === 0 && talentRequest.company.type !== 'both') {
      return NextResponse.json({ 
        error: 'Only seeker companies can view matches' 
      }, { status: 403 })
    }

    // Get available talent profiles from provider companies
    const availableTalent = await prisma.talentProfile.findMany({
      where: {
        status: 'active',
        isVisible: true,
        company: {
          type: {
            in: ['provider', 'both']
          },
          status: 'active'
        }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    if (availableTalent.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        message: 'No available talent found'
      })
    }

    // Convert to matching engine format
    const projectRequirement = {
      id: talentRequest.id,
      title: talentRequest.title,
      description: talentRequest.description,
      requiredSkills: talentRequest.requiredSkills as any,
      preferredSkills: [],
      budget: {
        min: Number(talentRequest.budgetMin),
        max: Number(talentRequest.budgetMax),
        currency: talentRequest.currency
      },
      startDate: talentRequest.startDate,
      duration: {
        weeks: talentRequest.durationWeeks,
        startDate: talentRequest.startDate,
        endDate: new Date(talentRequest.startDate.getTime() + (talentRequest.durationWeeks * 7 * 24 * 60 * 60 * 1000))
      },
      location: talentRequest.locationPreference,
      urgency: talentRequest.urgency,
      industry: talentRequest.industry,
      projectType: 'contract',
      teamSize: 1,
      communicationStyle: 'professional',
      timezone: 'UTC'
    } as any

    const talentProfiles = availableTalent.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      skills: profile.skills as any,
      rate: {
        min: Number(profile.rateMin),
        max: Number(profile.rateMax),
        currency: profile.currency
      },
      location: profile.location,
      availability: [{
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        hoursPerWeek: 40
      }],
      experience: profile.experience || 0,
      company: profile.company
    }))

    // Find matches using the matching engine
    const matches = await matchingEngine.findMatches(
      projectRequirement,
      talentProfiles
    )

    // Enhance matches with additional profile data
    const enhancedMatches = matches.map(match => {
      const profile = availableTalent.find((p: any) => p.id === match.talentId)
      return {
        ...match,
        profile: {
          id: profile?.id,
          name: profile?.name,
          title: profile?.title,
          bio: profile?.bio,
          skills: profile?.skills,
          rateMin: profile?.rateMin,
          rateMax: profile?.rateMax,
          currency: profile?.currency,
          location: profile?.location,
          availability: profile?.availability,
          experience: profile?.experience,
          company: profile?.company
        }
      }
    })

    logger.info('Talent matches retrieved', {
      requestId,
      companyId: user.companyId,
      matchCount: enhancedMatches.length,
      topScore: enhancedMatches[0]?.totalScore || 0
    })

    return NextResponse.json({
      success: true,
      matches: enhancedMatches,
      talentRequest: {
        id: talentRequest.id,
        title: talentRequest.title,
        description: talentRequest.description,
        requiredSkills: talentRequest.requiredSkills,
        budgetMin: talentRequest.budgetMin,
        budgetMax: talentRequest.budgetMax,
        currency: talentRequest.currency,
        startDate: talentRequest.startDate,
        durationWeeks: talentRequest.durationWeeks
      },
      metadata: {
        totalAvailableTalent: availableTalent.length,
        matchedTalent: enhancedMatches.length,
        algorithmVersion: '1.0.0'
      }
    })

  } catch (error) {
    logger.error('Failed to get talent matches', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
