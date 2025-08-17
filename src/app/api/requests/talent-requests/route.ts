import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'

const createRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  requiredSkills: z.array(z.object({
    name: z.string(),
    level: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
    priority: z.enum(['required', 'preferred']),
    yearsRequired: z.number().optional()
  })).min(1),
  budget: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    currency: z.string().default('USD')
  }),
  duration: z.object({
    value: z.number().positive(),
    unit: z.enum(['days', 'weeks', 'months'])
  }),
  startDate: z.string().datetime(),
  location: z.string().optional(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite']).default('remote'),
  timezone: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  projectType: z.string().optional(),
  teamSize: z.number().positive().default(1),
  industry: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise']).optional(),
  communicationStyle: z.string().optional()
})

export async function POST(request: NextRequest) {
  const correlationId = `create-request-${Date.now()}`
  
  try {
    logRequest(request, { correlationId })

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
    const validatedBody = createRequestSchema.parse(body)
    
    // Verify company is a seeker
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (company.type !== 'seeker' && company.type !== 'both') {
      return NextResponse.json(
        { error: 'Only seeker companies can create talent requests' },
        { status: 403 }
      )
    }

    const talentRequest = await prisma.talentRequest.create({
      data: {
        title: validatedBody.title,
        description: validatedBody.description,
        requiredSkills: validatedBody.requiredSkills,
        budget: validatedBody.budget,
        duration: validatedBody.duration,
        startDate: new Date(validatedBody.startDate),
        location: validatedBody.location,
        remotePreference: validatedBody.remotePreference,
        timezone: validatedBody.timezone,
        urgency: validatedBody.urgency,
        projectType: validatedBody.projectType,
        teamSize: validatedBody.teamSize,
        industry: validatedBody.industry,
        companySize: validatedBody.companySize,
        communicationStyle: validatedBody.communicationStyle,
        companyId,
        status: 'open'
      }
    })

    return NextResponse.json({
      success: true,
      request: talentRequest
    }, { status: 201 })

  } catch (error) {
    logError('Failed to create talent request', {
      correlationId,
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

export async function GET(request: NextRequest) {
  const correlationId = `list-requests-${Date.now()}`
  
  try {
    logRequest(request, { correlationId })

    const { searchParams } = new URL(request.url)
    const skills = searchParams.get('skills')
    const location = searchParams.get('location')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const where: any = {
      status: 'open'
    }

    if (skills) {
      where.requiredSkills = {
        path: ['$[*].name'],
        array_contains: skills.split(',').map(s => s.trim())
      }
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      }
    }

    if (status) {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.talentRequest.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.talentRequest.count({ where })
    ])

    return NextResponse.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        skills,
        location,
        status
      }
    })

  } catch (error) {
    logError('Failed to list talent requests', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
