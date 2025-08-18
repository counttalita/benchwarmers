import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOTP, generateOTP, validatePhoneNumber, formatPhoneNumber } from '@/lib/twilio'
import { logRequest, logError, logInfo, logAuth, logDb, logPerformance } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      logError('Send OTP failed: Missing phone number', null, { phoneNumber })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (!validatePhoneNumber(formattedPhone)) {
      logError('Send OTP failed: Invalid phone number format', null, { 
        originalPhone: phoneNumber, 
        formattedPhone 
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (+1234567890)' },
        { status: 400 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    logInfo('OTP generated', { 
      phoneNumber: formattedPhone, 
      expiresAt,
      isDevelopment: process.env.NODE_ENV === 'development'
    })

    // Check if user exists
    const dbStartTime = Date.now()
    let user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone }
    })
    logDb('User lookup', 'user', { 
      phoneNumber: formattedPhone, 
      userFound: !!user,
      duration: Date.now() - dbStartTime
    })

    if (!user) {
      // For testing purposes, we'll create a temporary user record
      // In production, this would be part of the registration flow
      logInfo('Creating temporary user for OTP', { phoneNumber: formattedPhone })
      
      const tempCompany = await prisma.company.findFirst()
      if (!tempCompany) {
        logError('Send OTP failed: No company found for testing', null, { phoneNumber: formattedPhone })
        requestLogger.end(500)
        return NextResponse.json(
          { error: 'No company found for testing. Please run database seed first.' },
          { status: 500 }
        )
      }

      const createUserStartTime = Date.now()
      user = await prisma.user.create({
        data: {
          phoneNumber: formattedPhone,
          name: 'Test User',
          role: 'member',
          companyId: tempCompany.id,
        }
      })
      logDb('User creation', 'user', { 
        phoneNumber: formattedPhone, 
        companyId: tempCompany.id,
        duration: Date.now() - createUserStartTime
      })
    }

    // Delete any existing OTP codes for this user
    const deleteOtpStartTime = Date.now()
    await prisma.oTPCode.deleteMany({
      where: { userId: user.id }
    })
    logDb('OTP cleanup', 'oTPCode', { 
      userId: user.id, 
      duration: Date.now() - deleteOtpStartTime
    })

    // Create new OTP code
    const createOtpStartTime = Date.now()
    await prisma.oTPCode.create({
      data: {
        userId: user.id,
        phoneNumber: formattedPhone,
        code: otp,
        expiresAt,
      }
    })
    logDb('OTP creation', 'oTPCode', { 
      userId: user.id, 
      phoneNumber: formattedPhone,
      expiresAt,
      duration: Date.now() - createOtpStartTime
    })

    // Send OTP via Twilio
    const twilioStartTime = Date.now()
    const sent = await sendOTP(formattedPhone, otp)
    logPerformance('Twilio SMS send', Date.now() - twilioStartTime, {
      phoneNumber: formattedPhone,
      success: sent
    })

    if (!sent) {
      logError('Send OTP failed: Twilio SMS failed', null, { phoneNumber: formattedPhone })
      requestLogger.end(500)
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      )
    }

    // Log successful OTP send
    logAuth('OTP sent successfully', user.id, {
      phoneNumber: formattedPhone,
      userId: user.id,
      companyId: user.companyId
    })

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
      logInfo('Development OTP returned', { otp, phoneNumber: formattedPhone })
    }

    const totalDuration = Date.now() - startTime
    logPerformance('Send OTP total operation', totalDuration, {
      phoneNumber: formattedPhone,
      userId: user.id
    })

    requestLogger.end(200)
    return NextResponse.json(response)

    } catch (error) {
    logError('Send OTP unexpected error', error, {
      phoneNumber: 'unknown'
    })
    logger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}