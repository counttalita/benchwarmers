import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const updateOfferSchema = z.object({
  amount: z.number().min(10, 'Amount must be at least $10').optional(),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  terms: z.string().max(2000, 'Terms must be less than 2000 characters').optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 })
    }

    // Get offer with related data
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        talentRequest: {
          include: {
            company: true
          }
        },
        talentProfile: {
          include: {
            user: true
          }
        },
        company: true
      }
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Check if user has access to this offer
    const hasAccess = 
      user.role === 'admin' ||
      (user.role === 'company' && offer.companyId === user.companyId) ||
      (user.role === 'talent' && offer.talentProfile.userId === user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      offer: {
        id: offer.id,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        startDate: offer.startDate,
        endDate: offer.endDate,
        terms: offer.terms,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        talentRequest: {
          id: offer.talentRequest.id,
          title: offer.talentRequest.title,
          description: offer.talentRequest.description,
          company: {
            id: offer.talentRequest.company.id,
            name: offer.talentRequest.company.name
          }
        },
        talentProfile: {
          id: offer.talentProfile.id,
          title: offer.talentProfile.title,
          user: {
            id: offer.talentProfile.user.id,
            name: offer.talentProfile.user.name
          }
        },
        company: {
          id: offer.company.id,
          name: offer.company.name
        }
      }
    })

  } catch (error) {
    logger.error(error as Error, 'Failed to get offer')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateOfferSchema.parse(body)

    // Get the offer
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        talentProfile: true
      }
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Check if user can update this offer
    const canUpdate = 
      user.role === 'admin' ||
      (user.role === 'company' && offer.companyId === user.companyId) ||
      (user.role === 'talent' && offer.talentProfile.userId === user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow updates if offer is pending
    if (offer.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot update non-pending offer' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.message !== undefined) updateData.message = validatedData.message
    if (validatedData.startDate !== undefined) updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.endDate !== undefined) updateData.endDate = new Date(validatedData.endDate)
    if (validatedData.terms !== undefined) updateData.terms = validatedData.terms
    if (validatedData.status !== undefined) updateData.status = validatedData.status

    // Update the offer
    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: updateData,
      include: {
        talentRequest: {
          include: {
            company: true
          }
        },
        talentProfile: {
          include: {
            user: true
          }
        },
        company: true
      }
    })

    logger.info('Offer updated', { offerId: id, userId: user.id })

    return NextResponse.json({
      success: true,
      offer: {
        id: updatedOffer.id,
        amount: updatedOffer.amount,
        message: updatedOffer.message,
        status: updatedOffer.status,
        startDate: updatedOffer.startDate,
        endDate: updatedOffer.endDate,
        terms: updatedOffer.terms,
        expiresAt: updatedOffer.expiresAt,
        createdAt: updatedOffer.createdAt,
        updatedAt: updatedOffer.updatedAt,
        talentRequest: {
          id: updatedOffer.talentRequest.id,
          title: updatedOffer.talentRequest.title,
          description: updatedOffer.talentRequest.description,
          company: {
            id: updatedOffer.talentRequest.company.id,
            name: updatedOffer.talentRequest.company.name
          }
        },
        talentProfile: {
          id: updatedOffer.talentProfile.id,
          title: updatedOffer.talentProfile.title,
          user: {
            id: updatedOffer.talentProfile.user.id,
            name: updatedOffer.talentProfile.user.name
          }
        },
        company: {
          id: updatedOffer.company.id,
          name: updatedOffer.company.name
        }
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to update offer')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 })
    }

    // Get the offer
    const offer = await prisma.offer.findUnique({
      where: { id }
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Only the company that created the offer can delete it
    if (user.role !== 'admin' && (user.role !== 'company' || offer.companyId !== user.companyId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow deletion if offer is pending
    if (offer.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot delete non-pending offer' }, { status: 400 })
    }

    // Delete the offer
    await prisma.offer.delete({
      where: { id }
    })

    logger.info('Offer deleted', { offerId: id, userId: user.id })

    return NextResponse.json({ success: true }, { status: 204 })

  } catch (error) {
    logger.error(error as Error, 'Failed to delete offer')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
