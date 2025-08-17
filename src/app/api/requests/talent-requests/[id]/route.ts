import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError, logInfo } from '@/lib/logger'
import { z } from 'zod'

const updateRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  requiredSkills: z.array(z.object({
    name: z.string(),
    level: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
    priority: z.enum(['required', 'preferred']),
    yearsRequired: z.number().optional()
  })).optional(),
  budget: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    currency: z.string().default('USD')
  }).optional(),
  duration: z.object({
    value: z.number().positive(),
    unit: z.enum(['days', 'weeks', 'months'])
  }).optional(),
  startDate: z.string().datetime().optional(),
  location: z.string().optional(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  timezone: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  projectType: z.string().optional(),
  teamSize: z.number().positive().optional(),
  industry: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise']).optional(),
  communicationStyle: z.string().optional(),
  status: z.enum(['open', 'matching', 'closed']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `get-request-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Getting talent request', { correlationId, requestId: params.id })

    const talentRequest = await prisma.talentRequest.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        matches: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
                title: true,
                skills: true,
                rateMin: true,
                rateMax: true,
                location: true,
                rating: true
              }
            }
          }
        }
      }
    })

    if (!talentRequest) {
      return NextResponse.json(
        { error: 'Talent request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      request: talentRequest
    })

  } catch (error) {
    logError('Failed to get talent request', {
      correlationId,
      requestId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `update-request-${Date.now()}`
  
  try {
    const requestLogger = logRequest(request)
    logInfo('Updating talent request', { correlationId, requestId: params.id })

    // TODO: Get user from session/auth
    const userId = request.headers.get('x-user-id') || 'test-user-id'
    const companyId = request.headers.get('x-company-id')
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedBody = updateRequestSchema.parse(body)
    
    // Get the existing request
    const existingRequest = await prisma.talentRequest.findUnique({
      where: { id: params.id },
      include: { company: true }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Talent request not found' },
        { status: 404 }
      )
    }

    // Check if user can update this request
    if (existingRequest.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Prevent updating closed requests
    if (existingRequest.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot update closed requests' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedBody.title) updateData.title = validatedBody.title
    if (validatedBody.description) updateData.description = validatedBody.description
    if (validatedBody.requiredSkills) updateData.requiredSkills = validatedBody.requiredSkills
    if (validatedBody.budget) updateData.budget = validatedBody.budget
    if (validatedBody.duration) updateData.duration = validatedBody.duration
    if (validatedBody.startDate) updateData.startDate = new Date(validatedBody.startDate)
    if (validatedBody.location) updateData.location = validatedBody.location
    if (validatedBody.remotePreference) updateData.remotePreference = validatedBody.remotePreference
    if (validatedBody.timezone) updateData.timezone = validatedBody.timezone
    if (validatedBody.urgency) updateData.urgency = validatedBody.urgency
    if (validatedBody.projectType) updateData.projectType = validatedBody.projectType
    if (validatedBody.teamSize) updateData.teamSize = validatedBody.teamSize
    if (validatedBody.industry) updateData.industry = validatedBody.industry
    if (validatedBody.companySize) updateData.companySize = validatedBody.companySize
    if (validatedBody.communicationStyle) updateData.communicationStyle = validatedBody.communicationStyle
    if (validatedBody.status) updateData.status = validatedBody.status

    const updatedRequest = await prisma.talentRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })

  } catch (error) {
    logError('Failed to update talent request', {
      correlationId,
      requestId: params.id,
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
