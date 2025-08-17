import { NextRequest, NextResponse } from 'next/server'
import { MatchingEngine, ProjectRequirement, TalentProfile, MatchScore } from '@/lib/matching/matching-engine'
import { logger } from '@/lib/logger'

const matchingEngine = new MatchingEngine()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    if (!body.projectRequirement || !body.availableTalent) {
      return NextResponse.json(
        { error: 'Missing required fields: projectRequirement and availableTalent' },
        { status: 400 }
      )
    }

    const { projectRequirement, availableTalent, options = {} } = body

    // Validate project requirement structure
    if (!projectRequirement.id || !projectRequirement.requiredSkills || !projectRequirement.budget) {
      return NextResponse.json(
        { error: 'Invalid project requirement structure' },
        { status: 400 }
      )
    }

    // Validate talent profiles
    if (!Array.isArray(availableTalent) || availableTalent.length === 0) {
      return NextResponse.json(
        { error: 'Available talent must be a non-empty array' },
        { status: 400 }
      )
    }

    // Convert dates from strings to Date objects
    const processedRequirement: ProjectRequirement = {
      ...projectRequirement,
      startDate: new Date(projectRequirement.startDate),
      duration: {
        ...projectRequirement.duration,
        startDate: new Date(projectRequirement.duration.startDate),
        endDate: new Date(projectRequirement.duration.endDate)
      }
    }

    const processedTalent: TalentProfile[] = availableTalent.map(talent => ({
      ...talent,
      availability: talent.availability.map(avail => ({
        ...avail,
        startDate: new Date(avail.startDate),
        endDate: new Date(avail.endDate)
      }))
    }))

    // Find matches using the matching engine
    const matches = await matchingEngine.findMatches(
      processedRequirement,
      processedTalent,
      options
    )

    logger.info('Matching algorithm completed', {
      projectId: processedRequirement.id,
      talentCount: processedTalent.length,
      matchCount: matches.length,
      topScore: matches[0]?.totalScore || 0
    })

    return NextResponse.json({
      success: true,
      matches,
      metadata: {
        totalTalent: processedTalent.length,
        matchedTalent: matches.length,
        algorithmVersion: '1.0.0',
        processingTime: Date.now() - request.headers.get('x-request-start') || Date.now()
      }
    })

  } catch (error) {
    logger.error('Matching algorithm error', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json(
      { error: 'Internal server error during matching process' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // For GET requests, we would typically fetch the project requirement and available talent from the database
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'GET endpoint for matching algorithm - use POST for actual matching',
      projectId,
      note: 'This endpoint would fetch project requirements and available talent from database'
    })

  } catch (error) {
    logger.error('Matching algorithm GET error', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
