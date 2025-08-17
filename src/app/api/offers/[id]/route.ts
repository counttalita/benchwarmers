import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const updateOfferStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'countered']),
  counterOffer: z.object({
    rate: z.number().positive().optional(),
    startDate: z.string().transform(str => new Date(str)).optional(),
    durationWeeks: z.number().positive().optional(),
    terms: z.string().optional(),
    message: z.string().optional()
  }).optional(),
  declineReason: z.string().optional(),
  message: z.string().optional()
})

// GET /api/offers/[id] - Get specific offer details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = uuidv4()
  
  try {
    const { id } = params
    
    logInfo('Fetching offer details', {
      correlationId,
      offerId: id
    })

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
                title: true,
                rating: true,
                reviewCount: true,
                location: true,
                skills: true
              }
            },
            request: {
              select: {
                id: true,
                title: true,
                description: true,
                budgetMin: true,
                budgetMax: true,
                durationWeeks: true,
                requiredSkills: true,
                startDate: true
              }
            }
          }
        },
        seekerCompany: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        providerCompany: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true
          }
        }
      }
    })

    if (!offer) {
      return NextResponse.json({
        success: false,
        error: 'Offer not found',
        correlationId
      }, { status: 404 })
    }

    logInfo('Successfully fetched offer details', {
      correlationId,
      offerId: id,
      status: offer.status
    })

    return NextResponse.json({
      success: true,
      data: offer,
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_offer_details' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch offer details',
      correlationId
    }, { status: 500 })
  }
}

// PATCH /api/offers/[id] - Update offer status (accept/decline/counter)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = uuidv4()
  
  try {
    const { id } = params
    const body = await request.json()
    
    logInfo('Updating offer status', {
      correlationId,
      offerId: id,
      requestBody: body
    })

    // Validate request data
    const validatedData = updateOfferStatusSchema.parse(body)

    // Check if offer exists
    const existingOffer = await prisma.offer.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            request: {
              select: {
                companyId: true,
                title: true
              }
            },
            profile: {
              select: {
                companyId: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!existingOffer) {
      return NextResponse.json({
        success: false,
        error: 'Offer not found',
        correlationId
      }, { status: 404 })
    }

    // Check if offer is still pending
    if (existingOffer.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Cannot update offer with status: ${existingOffer.status}`,
        correlationId
      }, { status: 400 })
    }

    let updatedOffer

    if (validatedData.status === 'accepted') {
      // Accept the offer - trigger payment collection
      updatedOffer = await prisma.offer.update({
        where: { id },
        data: {
          status: 'accepted',
          updatedAt: new Date()
        },
        include: {
          match: {
            include: {
              profile: true,
              request: true
            }
          }
        }
      })

      // TODO: Trigger Stripe payment collection
      // await collectPaymentForOffer(updatedOffer)
      
      logInfo('Offer accepted - payment collection triggered', {
        correlationId,
        offerId: id,
        totalAmount: updatedOffer.totalAmount
      })

    } else if (validatedData.status === 'declined') {
      // Decline the offer
      updatedOffer = await prisma.offer.update({
        where: { id },
        data: {
          status: 'declined',
          updatedAt: new Date()
        }
      })

      logInfo('Offer declined', {
        correlationId,
        offerId: id,
        reason: validatedData.declineReason
      })

    } else if (validatedData.status === 'countered' && validatedData.counterOffer) {
      // Create counter offer
      const counterOffer = validatedData.counterOffer
      
      // Calculate new totals if rate changed
      let newTotalAmount = existingOffer.totalAmount
      let newPlatformFee = existingOffer.platformFee
      let newProviderAmount = existingOffer.providerAmount

      if (counterOffer.rate) {
        const durationWeeks = counterOffer.durationWeeks || existingOffer.durationWeeks
        newTotalAmount = counterOffer.rate * durationWeeks * 40 // Assuming 40 hours/week
        newPlatformFee = newTotalAmount * 0.15
        newProviderAmount = newTotalAmount - newPlatformFee
      }

      updatedOffer = await prisma.offer.update({
        where: { id },
        data: {
          status: 'countered',
          rate: counterOffer.rate || existingOffer.rate,
          startDate: counterOffer.startDate || existingOffer.startDate,
          durationWeeks: counterOffer.durationWeeks || existingOffer.durationWeeks,
          terms: counterOffer.terms || existingOffer.terms,
          totalAmount: newTotalAmount,
          platformFee: newPlatformFee,
          providerAmount: newProviderAmount,
          updatedAt: new Date()
        }
      })

      logInfo('Counter offer created', {
        correlationId,
        offerId: id,
        newRate: counterOffer.rate,
        newTotalAmount
      })
    }

    // TODO: Send notifications to relevant parties
    // await sendOfferStatusNotification(updatedOffer, validatedData.status)

    return NextResponse.json({
      success: true,
      data: updatedOffer,
      message: `Offer ${validatedData.status} successfully`,
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'OFFER_UPDATE_VALIDATION_ERROR',
        'Validation error updating offer',
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
    logError(appError, { correlationId, operation: 'update_offer_status' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update offer status',
      correlationId
    }, { status: 500 })
  }
}

// DELETE /api/offers/[id] - Cancel/withdraw offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = uuidv4()
  
  try {
    const { id } = params
    
    logInfo('Cancelling offer', {
      correlationId,
      offerId: id
    })

    // Check if offer exists and can be cancelled
    const existingOffer = await prisma.offer.findUnique({
      where: { id }
    })

    if (!existingOffer) {
      return NextResponse.json({
        success: false,
        error: 'Offer not found',
        correlationId
      }, { status: 404 })
    }

    if (existingOffer.status === 'accepted') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel accepted offer',
        correlationId
      }, { status: 400 })
    }

    // Soft delete by updating status
    await prisma.offer.update({
      where: { id },
      data: {
        status: 'declined',
        updatedAt: new Date()
      }
    })

    logInfo('Successfully cancelled offer', {
      correlationId,
      offerId: id
    })

    return NextResponse.json({
      success: true,
      message: 'Offer cancelled successfully',
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'cancel_offer' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel offer',
      correlationId
    }, { status: 500 })
  }
}
