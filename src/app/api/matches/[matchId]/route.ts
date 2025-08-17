import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

const updateMatchStatusSchema = z.object({
  status: z.enum(['pending', 'viewed', 'interested', 'not_interested']),
  notes: z.string().optional(),
  feedback: z.string().optional()
})

// GET /api/matches/[matchId] - Get match details
export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const correlationId = uuidv4()
  
  try {
    const { matchId } = params
    
    logInfo('Fetching match details', {
      correlationId,
      matchId
    })

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            title: true,
            seniorityLevel: true,
            skills: true,
            rateMin: true,
            rateMax: true,
            currency: true,
            location: true,
            timezone: true,
            rating: true,
            reviewCount: true,
            remotePreference: true,
            availabilityCalendar: true,
            pastProjects: true,
            languages: true,
            certifications: true,
            isVisible: true
          }
        },
        request: {
          select: {
            id: true,
            title: true,
            description: true,
            requiredSkills: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            startDate: true,
            durationWeeks: true,
            status: true
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({
        success: false,
        error: 'Match not found',
        correlationId
      }, { status: 404 })
    }

    logInfo('Successfully fetched match details', {
      correlationId,
      matchId,
      profileId: match.profileId,
      score: match.score
    })

    return NextResponse.json({
      success: true,
      data: match,
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'fetch_match_details' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch match details',
      correlationId
    }, { status: 500 })
  }
}

// PATCH /api/matches/[matchId] - Update match status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const correlationId = uuidv4()
  
  try {
    const { matchId } = params
    const body = await request.json()
    
    logInfo('Updating match status', {
      correlationId,
      matchId,
      newStatus: body.status
    })

    // Validate request data
    const validatedData = updateMatchStatusSchema.parse(body)
    
    // TODO: Get user from session/JWT and verify they own this match
    
    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        request: {
          select: {
            companyId: true,
            status: true
          }
        }
      }
    })

    if (!existingMatch) {
      return NextResponse.json({
        success: false,
        error: 'Match not found',
        correlationId
      }, { status: 404 })
    }

    // Check if talent request is still active
    if (existingMatch.request.status === 'closed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot update match for inactive talent request',
        correlationId
      }, { status: 400 })
    }

    // Update match status
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: validatedData.status,
        updatedAt: new Date()
      },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            title: true
          }
        }
      }
    })

    // Log status change for analytics (commented out until model is added)
    // await prisma.matchStatusHistory.create({
    //   data: {
    //     matchId,
    //     fromStatus: existingMatch.status,
    //     toStatus: validatedData.status,
    //     notes: validatedData.notes,
    //     changedAt: new Date()
    //   }
    // }).catch((error: any) => {
    //   // Don't fail the main operation if history logging fails
    //   logError('Failed to log match status history', error)
    // })

    // Trigger notifications based on status change
    await handleStatusChangeNotifications(updatedMatch, validatedData.status, correlationId)

    logInfo('Successfully updated match status', {
      correlationId,
      matchId,
      oldStatus: existingMatch.status,
      newStatus: validatedData.status,
      profileId: updatedMatch.profileId
    })

    return NextResponse.json({
      success: true,
      data: updatedMatch,
      message: `Match status updated to ${validatedData.status}`,
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'MATCH_STATUS_VALIDATION_ERROR',
        'Validation error updating match status',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'update_match_status' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update match status',
      correlationId
    }, { status: 500 })
  }
}

// DELETE /api/matches/[matchId] - Remove match (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const correlationId = uuidv4()
  
  try {
    const { matchId } = params
    
    logInfo('Removing match', {
      correlationId,
      matchId
    })

    // TODO: Get user from session/JWT and verify they own this match
    
    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId }
    })

    if (!existingMatch) {
      return NextResponse.json({
        success: false,
        error: 'Match not found',
        correlationId
      }, { status: 404 })
    }

    // Soft delete by updating status
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'not_interested',
        updatedAt: new Date()
      }
    })

    logInfo('Successfully removed match', {
      correlationId,
      matchId,
      profileId: existingMatch.profileId
    })

    return NextResponse.json({
      success: true,
      message: 'Match removed successfully',
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'remove_match' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to remove match',
      correlationId
    }, { status: 500 })
  }
}

/**
 * Handle notifications when match status changes
 */
async function handleStatusChangeNotifications(
  match: any,
  newStatus: string,
  correlationId: string
) {
  try {
    // Send notification to talent when they're interested
    if (newStatus === 'interested') {
      logInfo('Triggering talent notification', {
        correlationId,
        matchId: match.id,
        profileId: match.profileId,
        status: newStatus
      })
      
      // TODO: Implement notification system
      // await notificationService.sendTalentMatchNotification({
      //   profileId: match.profileId,
      //   matchId: match.id,
      //   status: newStatus,
      //   companyName: match.request.company.name
      // })
    }

    // Send notification to company when match is viewed
    if (newStatus === 'viewed') {
      logInfo('Triggering company notification', {
        correlationId,
        matchId: match.id,
        companyId: match.request.companyId
      })
      
      // TODO: Implement notification system
      // await notificationService.sendCompanyMatchNotification({
      //   companyId: match.request.companyId,
      //   matchId: match.id,
      //   talentName: match.profile.name
      // })
    }

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'send_match_notifications' })
    // Don't throw - notifications are not critical
  }
}
