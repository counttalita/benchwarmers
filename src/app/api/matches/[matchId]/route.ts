import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

const updateMatchStatusSchema = z.object({
  status: z.enum(['viewed', 'interested', 'not_interested', 'contacted', 'hired']),
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
        talent: {
          select: {
            id: true,
            name: true,
            title: true,
            bio: true,
            skills: true,
            experience: true,
            rate: true,
            location: true,
            timezone: true,
            rating: true,
            reviewCount: true,
            completedProjects: true,
            responseTime: true,
            isVerified: true,
            isPremium: true,
            availability: true,
            languages: true,
            certifications: true
          }
        },
        talentRequest: {
          select: {
            id: true,
            title: true,
            description: true,
            requiredSkills: true,
            budget: true,
            startDate: true,
            endDate: true,
            urgency: true,
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
      talentId: match.talentId,
      score: match.score
    })

    return NextResponse.json({
      success: true,
      data: match,
      correlationId
    })

  } catch (error) {
    logError('Error fetching match details', error, { correlationId, matchId: params.matchId })
    
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
        talentRequest: {
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
    if (existingMatch.talentRequest.status === 'cancelled' || existingMatch.talentRequest.status === 'completed') {
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
        notes: validatedData.notes,
        feedback: validatedData.feedback,
        updatedAt: new Date(),
        // Track when certain statuses were first set
        ...(validatedData.status === 'viewed' && !existingMatch.viewedAt && {
          viewedAt: new Date()
        }),
        ...(validatedData.status === 'interested' && !existingMatch.interestedAt && {
          interestedAt: new Date()
        }),
        ...(validatedData.status === 'contacted' && !existingMatch.contactedAt && {
          contactedAt: new Date()
        })
      },
      include: {
        talent: {
          select: {
            id: true,
            name: true,
            title: true
          }
        }
      }
    })

    // Log status change for analytics
    await prisma.matchStatusHistory.create({
      data: {
        matchId,
        fromStatus: existingMatch.status,
        toStatus: validatedData.status,
        notes: validatedData.notes,
        changedAt: new Date()
      }
    }).catch(error => {
      // Don't fail the main operation if history logging fails
      logError('Failed to log match status history', error, { correlationId, matchId })
    })

    // Trigger notifications based on status change
    await this.handleStatusChangeNotifications(updatedMatch, validatedData.status, correlationId)

    logInfo('Successfully updated match status', {
      correlationId,
      matchId,
      oldStatus: existingMatch.status,
      newStatus: validatedData.status,
      talentId: updatedMatch.talentId
    })

    return NextResponse.json({
      success: true,
      data: updatedMatch,
      message: `Match status updated to ${validatedData.status}`,
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logError('Validation error updating match status', error, { correlationId })
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    logError('Error updating match status', error, { correlationId, matchId: params.matchId })
    
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
        notes: 'Removed by user',
        updatedAt: new Date(),
        deletedAt: new Date()
      }
    })

    logInfo('Successfully removed match', {
      correlationId,
      matchId,
      talentId: existingMatch.talentId
    })

    return NextResponse.json({
      success: true,
      message: 'Match removed successfully',
      correlationId
    })

  } catch (error) {
    logError('Error removing match', error, { correlationId, matchId: params.matchId })
    
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
    // Send notification to talent when they're contacted or hired
    if (newStatus === 'contacted' || newStatus === 'hired') {
      logInfo('Triggering talent notification', {
        correlationId,
        matchId: match.id,
        talentId: match.talentId,
        status: newStatus
      })
      
      // TODO: Implement notification system
      // await notificationService.sendTalentMatchNotification({
      //   talentId: match.talentId,
      //   matchId: match.id,
      //   status: newStatus,
      //   companyName: match.talentRequest.company.name
      // })
    }

    // Send notification to company when talent responds (if we had talent responses)
    if (newStatus === 'interested') {
      logInfo('Triggering company notification', {
        correlationId,
        matchId: match.id,
        companyId: match.talentRequest.companyId
      })
      
      // TODO: Implement notification system
      // await notificationService.sendCompanyMatchNotification({
      //   companyId: match.talentRequest.companyId,
      //   matchId: match.id,
      //   talentName: match.talent.name
      // })
    }

  } catch (error) {
    logError('Error sending match status notifications', error, { correlationId })
    // Don't throw - notifications are not critical
  }
}
