import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'
import { MatchingEngine } from '@/lib/matching/matching-engine'

const matchingRequestSchema = z.object({
  requestId: z.string(),
  options: z.object({
    maxResults: z.number().min(1).max(50).default(10),
    minScore: z.number().min(0).max(1).default(0.7),
    includeInactive: z.boolean().default(false),
    enableML: z.boolean().default(true),
    customWeights: z.object({
      skills: z.number().min(0).max(1).optional(),
      experience: z.number().min(0).max(1).optional(),
      availability: z.number().min(0).max(1).optional(),
      budget: z.number().min(0).max(1).optional(),
      location: z.number().min(0).max(1).optional(),
      culture: z.number().min(0).max(1).optional(),
      velocity: z.number().min(0).max(1).optional(),
      reliability: z.number().min(0).max(1).optional()
    }).optional()
  }).optional()
})

const matchingEngine = new MatchingEngine()

export async function POST(request: NextRequest) {
  const correlationId = `run-matching-${Date.now()}`
  
  try {
    const startTime = Date.now()

    const body = await request.json()
    const validatedBody = matchingRequestSchema.parse(body)
    
    // Get the talent request with full details
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: validatedBody.requestId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            type: true,
            industry: true,
            size: true
          }
        }
      }
    })

    if (!talentRequest) {
      return NextResponse.json(
        { error: 'Talent request not found' },
        { status: 404 }
      )
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
            type: true,
            industry: true,
            size: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        skills: true,
        experience: true,
        certifications: true,
        ratings: true,
        pastProjects: true
      }
    })

    if (availableTalent.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        message: 'No available talent found'
      })
    }

    // Convert talent request to matching engine format
    const projectRequirement = {
      id: talentRequest.id,
      title: talentRequest.title,
      description: talentRequest.description,
      requiredSkills: talentRequest.requiredSkills.map((skill: any) => ({
        name: skill.name,
        level: skill.level,
        weight: skill.priority === 'required' ? 10 : 5,
        yearsRequired: skill.yearsRequired,
        isRequired: skill.priority === 'required'
      })),
      preferredSkills: talentRequest.requiredSkills
        .filter((skill: any) => skill.priority === 'preferred')
        .map((skill: any) => ({
          name: skill.name,
          level: skill.level,
          weight: 3,
          yearsRequired: skill.yearsRequired,
          isRequired: false
        })),
      budget: {
        min: Number(talentRequest.budgetMin),
        max: Number(talentRequest.budgetMax),
        currency: talentRequest.currency
      },
      duration: {
        weeks: talentRequest.durationWeeks,
        startDate: talentRequest.startDate,
        endDate: new Date(talentRequest.startDate.getTime() + (talentRequest.durationWeeks * 7 * 24 * 60 * 60 * 1000))
      },
      startDate: talentRequest.startDate,
      location: {
        type: talentRequest.remotePreference,
        timezone: talentRequest.timezone,
        country: talentRequest.location
      },
      urgency: talentRequest.urgency,
      projectType: talentRequest.projectType || 'development',
      teamSize: talentRequest.teamSize || 1,
      clientIndustry: talentRequest.industry || 'technology',
      companySize: talentRequest.companySize || 'medium',
      workStyle: talentRequest.workStyle || 'agile'
    }

    // Convert talent profiles to matching engine format
    const talentProfiles = availableTalent.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      skills: profile.skills.map((skill: any) => ({
        name: skill.name,
        level: skill.level,
        yearsOfExperience: skill.yearsOfExperience,
        category: skill.category || 'other'
      })),
      experience: profile.experience.map((exp: any) => ({
        company: exp.company,
        role: exp.role,
        duration: exp.duration,
        industry: exp.industry,
        technologies: exp.technologies || [],
        achievements: exp.achievements || []
      })),
      availability: [{
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        capacity: profile.availability === 'available' ? 100 : 
                 profile.availability === 'partially_available' ? 50 : 0,
        timezone: profile.timezone || 'UTC'
      }],
      hourlyRate: Number(profile.rateMax),
      location: {
        country: profile.location || 'Unknown',
        city: profile.location || 'Unknown',
        timezone: profile.timezone || 'UTC',
        remotePreference: profile.remotePreference || 'remote'
      },
      languages: profile.languages || [],
      certifications: profile.certifications || [],
      pastProjects: profile.pastProjects || [],
      ratings: profile.ratings || [],
      companyId: profile.companyId,
      timezone: profile.timezone || 'UTC',
      preferences: {
        preferredCompanySize: profile.preferredCompanySize || 'medium',
        workStyle: profile.workStyle || 'agile',
        communicationStyle: profile.communicationStyle || 'casual',
        preferredRate: Number(profile.rateMax),
        minimumRate: Number(profile.rateMin)
      },
      isAvailable: profile.status === 'active',
      rating: profile.rating || 0,
      totalReviews: profile.totalReviews || 0
    }))

    // Run the matching algorithm
    const matches = await matchingEngine.findMatches(
      projectRequirement,
      talentProfiles,
      {
        maxResults: validatedBody.options?.maxResults || 10,
        minScore: validatedBody.options?.minScore || 0.7,
        enableML: validatedBody.options?.enableML || true,
        customWeights: validatedBody.options?.customWeights
      }
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
          company: profile?.company,
          user: profile?.user
        }
      }
    })

    logRequest(request, startTime)

    return NextResponse.json({
      success: true,
      matches: enhancedMatches,
      request: {
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
        algorithmVersion: '2.0.0',
        mlEnabled: validatedBody.options?.enableML || true,
        correlationId
      }
    })

  } catch (error) {
    logError('Failed to run matching algorithm', {
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
