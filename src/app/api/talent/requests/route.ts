import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

const talentRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  projectType: z.enum(['short-term', 'long-term', 'contract', 'full-time']),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  
  requiredSkills: z.array(z.object({
    name: z.string().min(1, 'Skill name is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    priority: z.enum(['required', 'preferred', 'nice-to-have'])
  })).min(1, 'At least one skill is required'),
  
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  teamSize: z.number().min(1).max(50),
  
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  duration: z.object({
    value: z.number().min(1),
    unit: z.enum(['days', 'weeks', 'months'])
  }),
  hoursPerWeek: z.number().min(1).max(168),
  timezone: z.string().min(1, 'Timezone is required'),
  
  budget: z.object({
    type: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'fixed']),
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD')
  }).refine(data => data.max >= data.min, {
    message: 'Maximum budget must be greater than or equal to minimum'
  }),
  
  location: z.string().optional(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'flexible']),
  
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  industryExperience: z.array(z.string()).optional(),
  
  communicationStyle: z.enum(['formal', 'casual', 'collaborative', 'independent']),
  meetingFrequency: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'as-needed']),
  reportingStructure: z.string().optional(),
  
  backgroundCheck: z.boolean().default(false),
  nda: z.boolean().default(false),
  clientFacing: z.boolean().default(false),
  
  autoMatch: z.boolean().default(true),
  maxMatches: z.number().min(1).max(20).default(10),
  responseTimeRequirement: z.enum(['immediate', '2-hours', '24-hours', '48-hours'])
})

// GET /api/talent/requests - List talent requests with filtering
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const skip = (page - 1) * limit
    
    // Filters
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const projectType = searchParams.get('projectType')
    const remotePreference = searchParams.get('remotePreference')
    const minBudget = searchParams.get('minBudget')
    const maxBudget = searchParams.get('maxBudget')
    const skills = searchParams.get('skills')?.split(',').filter(Boolean)
    const companyId = searchParams.get('companyId')
    
    logInfo('Fetching talent requests', {
      correlationId,
      filters: { status, urgency, projectType, remotePreference, minBudget, maxBudget, skills, companyId },
      pagination: { page, limit }
    })

    // Build where clause
    const where: any = {}
    
    if (status) where.status = status
    if (urgency) where.urgency = urgency
    if (projectType) where.projectType = projectType
    if (remotePreference) where.remotePreference = remotePreference
    if (companyId) where.companyId = companyId
    
    // Budget filtering
    if (minBudget || maxBudget) {
      where.budget = {}
      if (minBudget) {
        where.budget.path = ['min']
        where.budget.gte = parseFloat(minBudget)
      }
      if (maxBudget) {
        where.budget.path = ['max']
        where.budget.lte = parseFloat(maxBudget)
      }
    }
    
    // Skills filtering
    if (skills && skills.length > 0) {
      where.requiredSkills = {
        path: '$[*].name',
        array_contains: skills
      }
    }

    // Fetch requests with pagination
    const [requests, totalCount] = await Promise.all([
      prisma.talentRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { urgency: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          matches: {
            select: {
              id: true,
              status: true,
              score: true
            }
          },
          _count: {
            select: {
              matches: true
            }
          }
        }
      }),
      prisma.talentRequest.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    logInfo('Successfully fetched talent requests', {
      correlationId,
      count: requests.length,
      totalCount,
      page,
      totalPages
    })

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      correlationId
    })

  } catch (error) {
    logError('Error fetching talent requests', error, { correlationId })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch talent requests',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/talent/requests - Create new talent request
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()
  
  try {
    const body = await request.json()
    
    logInfo('Creating talent request', {
      correlationId,
      title: body.title,
      projectType: body.projectType,
      urgency: body.urgency
    })

    // Validate request data
    const validatedData = talentRequestSchema.parse(body)
    
    // TODO: Get user from session/JWT
    // For now, using a placeholder company ID
    const companyId = 'cm0123456789abcdef' // This should come from authenticated user
    
    // Calculate end date if not provided
    let endDate = validatedData.endDate
    if (!endDate && validatedData.duration) {
      const startDate = new Date(validatedData.startDate)
      const { value, unit } = validatedData.duration
      
      switch (unit) {
        case 'days':
          endDate = new Date(startDate.getTime() + value * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'weeks':
          endDate = new Date(startDate.getTime() + value * 7 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'months':
          const endDateCalc = new Date(startDate)
          endDateCalc.setMonth(endDateCalc.getMonth() + value)
          endDate = endDateCalc.toISOString()
          break
      }
    }

    // Create talent request
    const talentRequest = await prisma.talentRequest.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        projectType: validatedData.projectType,
        urgency: validatedData.urgency,
        status: 'open',
        
        requiredSkills: validatedData.requiredSkills,
        seniorityLevel: validatedData.seniorityLevel,
        teamSize: validatedData.teamSize,
        
        startDate: new Date(validatedData.startDate),
        endDate: endDate ? new Date(endDate) : null,
        duration: validatedData.duration,
        hoursPerWeek: validatedData.hoursPerWeek,
        timezone: validatedData.timezone,
        
        budget: validatedData.budget,
        location: validatedData.location,
        remotePreference: validatedData.remotePreference,
        
        languages: validatedData.languages || [],
        certifications: validatedData.certifications || [],
        industryExperience: validatedData.industryExperience || [],
        
        communicationStyle: validatedData.communicationStyle,
        meetingFrequency: validatedData.meetingFrequency,
        reportingStructure: validatedData.reportingStructure,
        
        backgroundCheck: validatedData.backgroundCheck,
        nda: validatedData.nda,
        clientFacing: validatedData.clientFacing,
        
        autoMatch: validatedData.autoMatch,
        maxMatches: validatedData.maxMatches,
        responseTimeRequirement: validatedData.responseTimeRequirement,
        
        companyId,
        
        // Set matching deadline (24 hours from now if auto-match is enabled)
        matchingDeadline: validatedData.autoMatch 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        }
      }
    })

    logInfo('Successfully created talent request', {
      correlationId,
      requestId: talentRequest.id,
      title: talentRequest.title,
      autoMatch: talentRequest.autoMatch
    })

    // TODO: Trigger matching algorithm if auto-match is enabled
    if (talentRequest.autoMatch) {
      // This would typically be handled by a background job or queue
      logInfo('Auto-match enabled, triggering matching process', {
        correlationId,
        requestId: talentRequest.id
      })
    }

    return NextResponse.json({
      success: true,
      data: talentRequest,
      message: 'Talent request created successfully',
      correlationId
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logError('Validation error creating talent request', error, { correlationId })
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    logError('Error creating talent request', error, { correlationId })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create talent request',
      correlationId
    }, { status: 500 })
  }
}
