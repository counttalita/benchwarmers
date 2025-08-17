import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'

const matchingRequestSchema = z.object({
  requestId: z.string(),
  options: z.object({
    maxResults: z.number().min(1).max(50).default(10),
    minScore: z.number().min(0).max(1).default(0.7),
    includeInactive: z.boolean().default(false)
  }).optional()
})

export async function POST(request: NextRequest) {
  const correlationId = `run-matching-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId } })

    const body = await request.json()
    const validatedBody = matchingRequestSchema.parse(body)
    
    // Get the talent request
    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: validatedBody.requestId },
      include: {
        company: {
          select: {
            id: true,
            name: true
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

    // Get available talent profiles
    const profiles = await prisma.talentProfile.findMany({
      where: {
        status: 'active',
        isVisible: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (profiles.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        message: 'No matching profiles found'
      })
    }

    // TODO: Implement actual matching algorithm
    // For now, return a simple mock result
    const mockMatches = profiles.slice(0, 3).map((profile, index) => ({
      profileId: profile.id,
      score: 0.9 - (index * 0.1),
      reasons: [`Profile matches ${talentRequest.requiredSkills?.[0]?.name || 'requirements'}`],
      concerns: []
    }))

    return NextResponse.json({
      success: true,
      matches: mockMatches,
      request: {
        id: talentRequest.id,
        title: talentRequest.title
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
