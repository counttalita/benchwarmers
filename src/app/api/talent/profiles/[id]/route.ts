import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError } from '@/lib/logger'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  skills: z.array(z.object({
    name: z.string(),
    level: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
    yearsOfExperience: z.number().min(0).max(50)
  })).optional(),
  rateMin: z.number().positive().optional(),
  rateMax: z.number().positive().optional(),
  currency: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  availability: z.enum(['available', 'partially_available', 'unavailable']).optional(),
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
  })).optional(),
  isVisible: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = `get-profile-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId, profileId: params.id } })

    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!talentProfile) {
      return NextResponse.json(
        { error: 'Talent profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: talentProfile
    })

  } catch (error) {
    logError('Failed to get talent profile', {
      correlationId,
      profileId: params.id,
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
  const correlationId = `update-profile-${Date.now()}`
  
  try {
    logRequest(request, { metadata: { correlationId, profileId: params.id } })

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
    const validatedBody = updateProfileSchema.parse(body)
    
    // Get the existing profile
    const existingProfile = await prisma.talentProfile.findUnique({
      where: { id: params.id },
      include: { company: true }
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Talent profile not found' },
        { status: 404 }
      )
    }

    // Check if user can update this profile
    if (existingProfile.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Validate rate range if both are provided
    if (validatedBody.rateMin && validatedBody.rateMax && validatedBody.rateMax <= validatedBody.rateMin) {
      return NextResponse.json(
        { error: 'Maximum rate must be greater than minimum rate' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedBody.name) updateData.name = validatedBody.name
    if (validatedBody.title) updateData.title = validatedBody.title
    if (validatedBody.skills) updateData.skills = validatedBody.skills
    if (validatedBody.rateMin) updateData.rateMin = validatedBody.rateMin
    if (validatedBody.rateMax) updateData.rateMax = validatedBody.rateMax
    if (validatedBody.currency) updateData.currency = validatedBody.currency
    if (validatedBody.location) updateData.location = validatedBody.location
    if (validatedBody.timezone) updateData.timezone = validatedBody.timezone
    if (validatedBody.availability) updateData.availability = validatedBody.availability
    if (validatedBody.bio) updateData.bio = validatedBody.bio
    if (validatedBody.experience) updateData.experience = validatedBody.experience
    if (validatedBody.education) updateData.education = validatedBody.education
    if (validatedBody.certifications) updateData.certifications = validatedBody.certifications
    if (validatedBody.portfolio) updateData.portfolio = validatedBody.portfolio
    if (validatedBody.languages) updateData.languages = validatedBody.languages
    if (validatedBody.isVisible !== undefined) updateData.isVisible = validatedBody.isVisible
    if (validatedBody.status) updateData.status = validatedBody.status

    const updatedProfile = await prisma.talentProfile.update({
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
      profile: updatedProfile
    })

  } catch (error) {
    logError('Failed to update talent profile', {
      correlationId,
      profileId: params.id,
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
