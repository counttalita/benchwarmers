import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { z } from 'zod'

const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  skills: z.array(z.object({
    name: z.string(),
    level: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
    yearsOfExperience: z.number().min(0).max(50)
  })).min(1),
  rateMin: z.number().positive(),
  rateMax: z.number().positive(),
  currency: z.string().default('USD'),
  location: z.string().optional(),
  timezone: z.string().optional(),
  availability: z.enum(['available', 'partially_available', 'unavailable']).default('available'),
  bio: z.string().max(2000).optional(),
  experience: z.number().min(0).max(50).optional(),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.number().min(1900).max(new Date().getFullYear())
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    year: z.number().min(1900).max(new Date().getFullYear()),
    expiryDate: z.string().datetime().optional()
  })).optional(),
  portfolio: z.array(z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url().optional(),
    technologies: z.array(z.string()).optional()
  })).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(['basic', 'conversational', 'fluent', 'native'])
  })).optional()
})

export async function POST(request: NextRequest) {
  const correlationId = `create-profile-${Date.now()}`
  
  try {
    logger.info('Creating talent profile', { correlationId })

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
    const validatedBody = createProfileSchema.parse(body)
    
    // Verify company is a provider
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    if (company.type !== 'provider' && company.type !== 'both') {
      return NextResponse.json(
        { error: 'Only provider companies can create talent profiles' },
        { status: 403 }
      )
    }

    // Validate rate range
    if (validatedBody.rateMax <= validatedBody.rateMin) {
      return NextResponse.json(
        { error: 'Maximum rate must be greater than minimum rate' },
        { status: 400 }
      )
    }

    const talentProfile = await prisma.talentProfile.create({
      data: {
        userId,
        name: validatedBody.name,
        title: validatedBody.title,
        skills: validatedBody.skills,
        rateMin: validatedBody.rateMin,
        rateMax: validatedBody.rateMax,
        currency: validatedBody.currency,
        location: validatedBody.location,
        timezone: validatedBody.timezone,
        availability: validatedBody.availability,
        bio: validatedBody.bio,
        experience: validatedBody.experience,
        education: validatedBody.education,
        certifications: validatedBody.certifications,
        portfolio: validatedBody.portfolio,
        languages: validatedBody.languages,
        companyId,
        status: 'active',
        isVisible: true
      }
    })

    return NextResponse.json({
      success: true,
      profile: talentProfile
    }, { status: 201 })

  } catch (error) {
    logger.error('Failed to create talent profile', {
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
  const correlationId = `list-profiles-${Date.now()}`
  
  try {
    logger.info('Listing talent profiles', { correlationId })

    const { searchParams } = new URL(request.url)
    const skills = searchParams.get('skills')
    const location = searchParams.get('location')
    const availability = searchParams.get('availability')
    const minRate = searchParams.get('minRate') ? parseInt(searchParams.get('minRate')!) : undefined
    const maxRate = searchParams.get('maxRate') ? parseInt(searchParams.get('maxRate')!) : undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const where: any = {
      status: 'active',
      isVisible: true
    }

    if (skills) {
      where.skills = {
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

    if (availability) {
      where.availability = availability
    }

    if (minRate || maxRate) {
      where.rateMin = {}
      if (minRate) where.rateMin.gte = minRate
      if (maxRate) where.rateMin.lte = maxRate
    }

    const [profiles, total] = await Promise.all([
      prisma.talentProfile.findMany({
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
      prisma.talentProfile.count({ where })
    ])

    return NextResponse.json({
      success: true,
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        skills,
        location,
        availability,
        minRate,
        maxRate
      }
    })

  } catch (error) {
    logError('Failed to list talent profiles', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
