import { v4 as uuidv4 } from 'uuid'
import { v4 as uuidv4 } from 'uuid'
import { NextRequest, NextResponse } from 'next/server'
const resolvedParams = await params
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { paymentManager } from '@/lib/payments/payment-manager'
import { v4 as uuidv4 } from 'uuid'

// Validation schema
const completeEngagementSchema = z.object({
  deliverables: z.array(z.string()).min(1, 'At least one deliverable is required'),
  approvedBy: z.string().min(1, 'Approver is required'),
  notes: z.string().optional(),
  releasePayment: z.boolean().default(true),
  partialAmount: z.number().positive().optional()
})

// POST /api/engagements/[id]/complete - Complete engagement and release payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = uuidv4()

  try {
    const engagementId = resolvedParams.id
    const body = await request.json()
    
    logInfo('Processing engagement completion', {
      correlationId,
      engagementId,
      requestData: body
    })

    // Validate request data
    const validatedData = completeEngagementSchema.parse(body)

    // Get engagement details
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        contract: {
          include: {
            offer: {
              include: {
                seekerCompany: true,
                providerCompany: true
              }
            }
          }
        },
        payments: true,
        verifications: true
      }
    })

    if (!engagement) {
      return NextResponse.json({
        success: false,
        error: 'Engagement not found',
        correlationId
      }, { status: 404 })
    }

    if (engagement.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Only active engagements can be completed',
        correlationId
      }, { status: 400 })
    }

    // Check if already completed
    const existingVerification = engagement.verifications.find(v => v.status === 'approved')
    if (existingVerification) {
      return NextResponse.json({
        success: false,
        error: 'Engagement already completed',
        correlationId
      }, { status: 400 })
    }

    if (validatedData.releasePayment) {
      // Use payment manager to verify completion and release payment
      const result = await paymentManager.verifyCompletionAndRelease(
        engagementId,
        {
          deliverables: validatedData.deliverables,
          approvedBy: validatedData.approvedBy,
          notes: validatedData.notes
        },
        correlationId
      )

      if (result.success) {
        logInfo('Engagement completed successfully', {
          correlationId,
          engagementId,
          paymentReleased: result.paymentReleased
        })

        return NextResponse.json({
          success: true,
          data: {
            engagementId,
            status: 'completed',
            completedAt: new Date(),
            paymentReleased: result.paymentReleased,
            verificationId: `VER-${Date.now()}`
          },
          message: 'Engagement completed successfully',
          correlationId
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
          correlationId
        }, { status: 400 })
      }
    } else {
      // Complete without payment release
      await prisma.engagementVerification.create({
        data: {
          id: `VER-${Date.now()}`,
          engagementId,
          verifiedBy: validatedData.approvedBy,
          verifiedAt: new Date(),
          deliverables: JSON.stringify(validatedData.deliverables),
          notes: validatedData.notes,
          status: 'approved'
        }
      })

      await prisma.engagement.update({
        where: { id: engagementId },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      })

      logInfo('Engagement completed without payment release', {
        correlationId,
        engagementId
      })

      return NextResponse.json({
        success: true,
        data: {
          engagementId,
          status: 'completed',
          completedAt: new Date(),
          paymentReleased: false
        },
        message: 'Engagement completed (payment not released)',
        correlationId
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'ENGAGEMENT_COMPLETION_VALIDATION_ERROR',
        'Validation error completing engagement',
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
    logError(appError, { correlationId, operation: 'complete_engagement' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to complete engagement',
      correlationId
    }, { status: 500 })
  }
}
