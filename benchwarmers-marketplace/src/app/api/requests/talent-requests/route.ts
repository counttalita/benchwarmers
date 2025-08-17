import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/requests/talent-requests - Get all talent requests with filtering
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/requests/talent-requests',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const skills = searchParams.get('skills')?.split(',')
    const minBudget = searchParams.get('minBudget') ? parseInt(searchParams.get('minBudget')!) : undefined
    const maxBudget = searchParams.get('maxBudget') ? parseInt(searchParams.get('maxBudget')!) : undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (companyId) {
      where.companyId = companyId
    }

    if (status) {
      where.status = status
    }

    if (skills && skills.length > 0) {
      where.requiredSkills = {
        some: {
          name: {
            in: skills
          }
        }
      }
    }

    if (minBudget || maxBudget) {
      where.budget = {}
      if (minBudget) where.budget.gte = minBudget
      if (maxBudget) where.budget.lte = maxBudget
    }

    // Get talent requests with pagination
    const [requests, total] = await Promise.all([
      prisma.talentRequest.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          },
          requiredSkills: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          offers: {
            select: {
              id: true,
              status: true,
              proposedRate: true,
              proposedDuration: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.talentRequest.count({ where })
    ])

    requestLogger.info('Talent requests retrieved successfully', {
      count: requests.length,
      total,
      page,
      limit,
      filters: { companyId, status, skills, minBudget, maxBudget }
    })

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    requestLogger.error('Failed to retrieve talent requests', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/requests/talent-requests - Create new talent request
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/requests/talent-requests',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const {
      companyId,
      title,
      description,
      requiredSkills,
      budget,
      duration,
      startDate,
      location,
      isRemote,
      urgency,
      additionalRequirements
    } = body

    if (!companyId || !title || !description) {
      requestLogger.warn('Missing required fields in talent request creation')
      return NextResponse.json(
        { error: 'Company ID, title, and description are required' },
        { status: 400 }
      )
    }

    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      requestLogger.warn('Company not found for talent request creation', { companyId })
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Create talent request
    const talentRequest = await prisma.talentRequest.create({
      data: {
        companyId,
        title,
        description,
        budget,
        duration,
        startDate: startDate ? new Date(startDate) : undefined,
        location,
        isRemote: isRemote || false,
        urgency: urgency || 'normal',
        additionalRequirements,
        status: 'open'
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        requiredSkills: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    })

    // Handle required skills if provided
    if (requiredSkills && Array.isArray(requiredSkills)) {
      for (const skill of requiredSkills) {
        await prisma.requestSkill.create({
          data: {
            talentRequestId: talentRequest.id,
            name: skill.name,
            level: skill.level || 'intermediate'
          }
        })
      }
    }

    requestLogger.info('Talent request created successfully', {
      requestId: talentRequest.id,
      companyId,
      title
    })

    return NextResponse.json({
      message: 'Talent request created successfully',
      request: talentRequest
    })

  } catch (error) {
    requestLogger.error('Failed to create talent request', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
