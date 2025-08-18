import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

// POST /api/offers/[id]/respond - Respond to an offer (accept, decline, counter)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLogger = logger

  try {
    const { id: offerId } = params
    const body = await request.json()
    const { action, counterRate, counterDuration, message } = body

    if (!action || !['accept', 'decline', 'counter'].includes(action)) {
      logger.warn('Invalid action in offer response')
      return NextResponse.json(
        { error: 'Action must be accept, decline, or counter' },
        { status: 400 }
      )
    }

    // Validate offer exists
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        talent: true,
        talentRequest: {
          include: {
            company: true
          }
        }
      }
    })

    if (!offer) {
      logger.warn('Offer not found for response', { offerId })
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    if (offer.status !== 'pending') {
      logger.warn('Offer already responded to', { offerId, status: offer.status })
      return NextResponse.json(
        { error: 'Offer has already been responded to' },
        { status: 400 }
      )
    }

    let updatedOffer
    let engagement

    switch (action) {
      case 'accept':
        // Accept the offer
        updatedOffer = await prisma.offer.update({
          where: { id: offerId },
          data: {
            status: 'accepted',
            acceptedAt: new Date()
          },
          include: {
            talent: true,
            talentRequest: {
              include: {
                company: true
              }
            }
          }
        })

        // Create engagement
        engagement = await prisma.engagement.create({
          data: {
            talentId: offer.talentId,
            companyId: offer.talentRequest.companyId,
            talentRequestId: offer.talentRequestId,
            offerId: offer.id,
            startDate: offer.talentRequest.startDate || new Date(),
            endDate: offer.talentRequest.startDate 
              ? new Date(offer.talentRequest.startDate.getTime() + (offer.proposedDuration * 24 * 60 * 60 * 1000))
              : new Date(Date.now() + (offer.proposedDuration * 24 * 60 * 60 * 1000)),
            rate: offer.proposedRate,
            status: 'active'
          }
        })

        // Update talent request status
        await prisma.talentRequest.update({
          where: { id: offer.talentRequestId },
          data: { status: 'assigned' }
        })

        // Reject other offers for this request
        await prisma.offer.updateMany({
          where: {
            talentRequestId: offer.talentRequestId,
            id: { not: offerId },
            status: 'pending'
          },
          data: {
            status: 'rejected',
            rejectedAt: new Date()
          }
        })

        logger.info('Offer accepted and engagement created', {
          offerId,
          engagementId: engagement.id,
          talentId: offer.talentId,
          companyId: offer.talentRequest.companyId
        })

        break

      case 'decline':
        // Decline the offer
        updatedOffer = await prisma.offer.update({
          where: { id: offerId },
          data: {
            status: 'rejected',
            rejectedAt: new Date()
          },
          include: {
            talent: true,
            talentRequest: {
              include: {
                company: true
              }
            }
          }
        })

        logger.info('Offer declined', { offerId })

        break

      case 'counter':
        // Counter the offer
        if (!counterRate) {
          logger.warn('Counter rate required for counter offer')
          return NextResponse.json(
            { error: 'Counter rate is required for counter offer' },
            { status: 400 }
          )
        }

        updatedOffer = await prisma.offer.update({
          where: { id: offerId },
          data: {
            status: 'countered',
            counterRate,
            counterDuration: counterDuration || offer.proposedDuration,
            counterMessage: message,
            counteredAt: new Date()
          },
          include: {
            talent: true,
            talentRequest: {
              include: {
                company: true
              }
            }
          }
        })

        logger.info('Offer countered', {
          offerId,
          originalRate: offer.proposedRate,
          counterRate
        })

        break
    }

    return NextResponse.json({
      message: `Offer ${action}ed successfully`,
      offer: updatedOffer,
      ...(engagement && { engagement })
    })

  } catch (error) {
    logger.error('Failed to respond to offer', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
