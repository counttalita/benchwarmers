import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registrationSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input data
    const validationResult = registrationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { companyName, companyEmail, phoneNumber, contactName, companyType } = validationResult.data

    // Check if company email already exists
    const existingCompany = await prisma.company.findFirst({
      where: { email: companyEmail }
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'A company with this email is already registered' },
        { status: 400 }
      )
    }

    // Check if phone number is already registered
    const existingUser = await prisma.user.findFirst({
      where: { phone: phoneNumber }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 400 }
      )
    }

    // Create company and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
          email: companyEmail,
          type: companyType,
          status: 'pending',
        }
      })

      // Create user
      const user = await tx.user.create({
        data: {
          name: contactName,
          email: companyEmail,
          phone: phoneNumber,
          role: 'admin',
          companyId: company.id,
          isPhoneVerified: false,
        }
      })

      return { company, user }
    })

    return NextResponse.json({
      message: 'Company registered successfully',
      company: {
        id: result.company.id,
        name: result.company.name,
        email: result.company.email,
        type: result.company.type,
        status: result.company.status,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

