import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const respondToOfferSchema = z.object({
  offerId: z.string(),
  response: z.enum(['accept', 'decline', 'counter']),
  message: z.string().optional(),
  counterOffer: z.object({
    amount: z.number().positive(),
    currency: z.string().default('USD'),
    terms: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const body = await request.json()
    const validatedBody = respondToOfferSchema.parse(body)

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the offer
    const offer = await prisma.offer.findUnique({
      where: { id: validatedBody.offerId },
      include: {
        talentRequest: true,
        profile: true
      }
    })

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Check if user can respond to this offer
    if (offer.profile.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if offer is still active
    if (offer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Offer is no longer active' },
        { status: 400 }
      )
    }

    let updatedOffer
    let engagement

    if (validatedBody.response === 'accept') {
      // Accept the offer
      updatedOffer = await prisma.offer.update({
        where: { id: validatedBody.offerId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          responseMessage: validatedBody.message
        }
      })

      // Create engagement
      engagement = await prisma.engagement.create({
        data: {
          talentRequestId: offer.talentRequestId,
          profileId: offer.profileId,
          companyId: offer.talentRequest.companyId,
          status: 'active',
          startDate: new Date(),
          terms: offer.terms,
          budget: offer.budget
        }
      })

      // Update talent request status
      await prisma.talentRequest.update({
        where: { id: offer.talentRequestId },
        data: { status: 'matched' }
      })

    } else if (validatedBody.response === 'decline') {
      // Decline the offer
      updatedOffer = await prisma.offer.update({
        where: { id: validatedBody.offerId },
        data: {
          status: 'declined',
          declinedAt: new Date(),
          responseMessage: validatedBody.message
        }
      })

    } else if (validatedBody.response === 'counter') {
      // Counter offer
      if (!validatedBody.counterOffer) {
        return NextResponse.json(
          { error: 'Counter offer details required' },
          { status: 400 }
        )
      }

      updatedOffer = await prisma.offer.update({
        where: { id: validatedBody.offerId },
        data: {
          status: 'countered',
          counteredAt: new Date(),
          responseMessage: validatedBody.message,
          counterOffer: validatedBody.counterOffer
        }
      })
    }

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
      engagement: engagement || null
    })

  } catch (error) {
    requestLogger.error(error as Error, 'Failed to respond to offer')
    
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
