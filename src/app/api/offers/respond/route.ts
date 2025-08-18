import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const respondToOfferSchema = z.object({
  offerId: z.string().min(1),
  response: z.enum(['accept', 'decline', 'counter']),
  counterAmount: z.number().positive().optional(),
  counterMessage: z.string().max(1000).optional(),
  message: z.string().max(1000).optional()
})

// POST /api/offers/respond - Respond to an offer
export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = respondToOfferSchema.parse(body)

    // Check if offer exists
    const offer = await prisma.offer.findUnique({
      where: { id: validatedBody.offerId },
      include: {
        talentProfile: {
          include: { user: true }
        },
        talentRequest: {
          include: { company: true }
        }
      }
    })

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Check if user is the talent who received the offer
    if (offer.talentProfile.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if offer is still pending
    if (offer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Offer is no longer pending' },
        { status: 400 }
      )
    }

    // Validate counter offer
    if (validatedBody.response === 'counter') {
      if (!validatedBody.counterAmount) {
        return NextResponse.json(
          { error: 'Counter amount is required for counter offers' },
          { status: 400 }
        )
      }
    }

    // Update offer status
    const updatedOffer = await prisma.offer.update({
      where: { id: validatedBody.offerId },
      data: {
        status: validatedBody.response === 'accept' ? 'accepted' : 
               validatedBody.response === 'decline' ? 'declined' : 'countered',
        counterAmount: validatedBody.counterAmount,
        counterMessage: validatedBody.counterMessage,
        responseMessage: validatedBody.message,
        respondedAt: new Date()
      },
      include: {
        talentProfile: {
          include: { user: true }
        },
        talentRequest: {
          include: { company: true }
        }
      }
    })

    // If accepted, create engagement
    if (validatedBody.response === 'accept') {
      await prisma.engagement.create({
        data: {
          title: offer.talentRequest.title,
          description: offer.talentRequest.description,
          startDate: new Date(),
          endDate: offer.talentRequest.deadline,
          budget: offer.amount,
          status: 'pending',
          talentProfileId: offer.talentProfileId,
          companyId: offer.talentRequest.companyId,
          talentRequestId: offer.talentRequestId
        }
      })
    }

    logger.info('Offer response processed successfully', {
      offerId: validatedBody.offerId,
      response: validatedBody.response,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
      engagementCreated: validatedBody.response === 'accept'
    })

  } catch (error) {
    logger.error('Failed to respond to offer', {
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
