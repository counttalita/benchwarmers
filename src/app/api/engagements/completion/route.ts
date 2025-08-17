import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const completeEngagementSchema = z.object({
  engagementId: z.string(),
  completionDate: z.string().datetime().optional(),
  finalHours: z.number().positive().optional(),
  finalAmount: z.number().positive().optional(),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional()
})

export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const body = await request.json()
    const validatedBody = completeEngagementSchema.parse(body)

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the engagement
    const engagement = await prisma.engagement.findUnique({
      where: { id: validatedBody.engagementId },
      include: {
        talentRequest: true,
        profile: true,
        company: true
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Check if user can complete this engagement
    const companyId = request.headers.get('x-company-id')
    if (engagement.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if engagement is active
    if (engagement.status !== 'active') {
      return NextResponse.json(
        { error: 'Engagement is not active' },
        { status: 400 }
      )
    }

    // Update engagement status
    const updatedEngagement = await prisma.engagement.update({
      where: { id: validatedBody.engagementId },
      data: {
        status: 'completed',
        completionDate: validatedBody.completionDate ? new Date(validatedBody.completionDate) : new Date(),
        finalHours: validatedBody.finalHours,
        finalAmount: validatedBody.finalAmount,
        feedback: validatedBody.feedback
      }
    })

    // Create review if rating provided
    let review = null
    if (validatedBody.rating) {
      review = await prisma.review.create({
        data: {
          engagementId: validatedBody.engagementId,
          reviewerId: userId,
          revieweeId: engagement.profile.userId,
          rating: validatedBody.rating,
          feedback: validatedBody.feedback || '',
          type: 'company_to_talent'
        }
      })
    }

    // Update talent request status
    await prisma.talentRequest.update({
      where: { id: engagement.talentRequestId },
      data: { status: 'completed' }
    })

    return NextResponse.json({
      success: true,
      engagement: updatedEngagement,
      review: review
    })

  } catch (error) {
    requestLogger.error(error as Error, 'Failed to complete engagement')
    
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
