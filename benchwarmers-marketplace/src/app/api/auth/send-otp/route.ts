import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOTP, generateOTP, validatePhoneNumber, formatPhoneNumber } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (!validatePhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (+1234567890)' },
        { status: 400 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone }
    })

    if (!user) {
      // For testing purposes, we'll create a temporary user record
      // In production, this would be part of the registration flow
      const tempCompany = await prisma.company.findFirst()
      if (!tempCompany) {
        return NextResponse.json(
          { error: 'No company found for testing. Please run database seed first.' },
          { status: 500 }
        )
      }

      user = await prisma.user.create({
        data: {
          phoneNumber: formattedPhone,
          name: 'Test User',
          role: 'member',
          companyId: tempCompany.id,
        }
      })
    }

    // Delete any existing OTP codes for this user
    await prisma.oTPCode.deleteMany({
      where: { userId: user.id }
    })

    // Create new OTP code
    await prisma.oTPCode.create({
      data: {
        userId: user.id,
        phoneNumber: formattedPhone,
        code: otp,
        expiresAt,
      }
    })

    // Send OTP via Twilio
    const sent = await sendOTP(formattedPhone, otp)

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      )
    }

    // In development, return the OTP for testing
    const response: { 
      message: string
      phoneNumber: string
      otp?: string 
    } = { 
      message: 'OTP sent successfully',
      phoneNumber: formattedPhone 
    }
    
    if (process.env.NODE_ENV === 'development') {
      response.otp = otp
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}