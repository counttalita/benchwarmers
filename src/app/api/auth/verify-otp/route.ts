import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPhoneNumber } from '@/lib/twilio'
import { logRequest, logError, logAuth, logDb, logPerformance, logSecurity } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      logError('Verify OTP failed: Missing required fields', null, { 
        hasPhoneNumber: !!phoneNumber, 
        hasOtp: !!otp 
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Find the user
    const userLookupStartTime = Date.now()
    const user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
      include: { company: true }
    })
    logDb('User lookup for OTP verification', 'user', { 
      phoneNumber: formattedPhone, 
      userFound: !!user,
      duration: Date.now() - userLookupStartTime
    })

    if (!user) {
      logSecurity('OTP verification failed: User not found', {
        phoneNumber: formattedPhone,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      requestLogger.end(404)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find the OTP code
    const otpLookupStartTime = Date.now()
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        userId: user.id,
        phoneNumber: formattedPhone,
        verified: false,
      },
      orderBy: { createdAt: 'desc' }
    })
    logDb('OTP record lookup', 'oTPCode', { 
      userId: user.id, 
      phoneNumber: formattedPhone,
      otpFound: !!otpRecord,
      duration: Date.now() - otpLookupStartTime
    })

    if (!otpRecord) {
      logSecurity('OTP verification failed: No valid OTP found', {
        userId: user.id,
        phoneNumber: formattedPhone,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'No valid OTP found. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      logSecurity('OTP verification failed: Expired OTP', {
        userId: user.id,
        phoneNumber: formattedPhone,
        expiresAt: otpRecord.expiresAt,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      logSecurity('OTP verification failed: Too many attempts', {
        userId: user.id,
        phoneNumber: formattedPhone,
        attempts: otpRecord.attempts,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (otpRecord.code !== otp) {
      // Increment attempts
      const updateAttemptsStartTime = Date.now()
      await prisma.oTPCode.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 }
      })
      logDb('OTP attempts increment', 'oTPCode', { 
        otpId: otpRecord.id, 
        newAttempts: otpRecord.attempts + 1,
        duration: Date.now() - updateAttemptsStartTime
      })

      logSecurity('OTP verification failed: Invalid OTP', {
        userId: user.id,
        phoneNumber: formattedPhone,
        attempts: otpRecord.attempts + 1,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })

      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    const verifyOtpStartTime = Date.now()
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    })
    logDb('OTP verification', 'oTPCode', { 
      otpId: otpRecord.id, 
      duration: Date.now() - verifyOtpStartTime
    })

    // Update user verification status
    const updateUserStartTime = Date.now()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      }
    })
    logDb('User verification update', 'user', { 
      userId: user.id, 
      duration: Date.now() - updateUserStartTime
    })

    // Clean up old OTP codes
    const cleanupStartTime = Date.now()
    await prisma.oTPCode.deleteMany({
      where: {
        userId: user.id,
        id: { not: otpRecord.id }
      }
    })
    logDb('OTP cleanup after verification', 'oTPCode', { 
      userId: user.id, 
      duration: Date.now() - cleanupStartTime
    })

    // Log successful authentication
    logAuth('User authenticated successfully', user.id, {
      phoneNumber: formattedPhone,
      userId: user.id,
      companyId: user.company?.id,
      companyName: user.company?.name,
      companyStatus: user.company?.status
    })

    const totalDuration = Date.now() - startTime
    logPerformance('OTP verification total operation', totalDuration, {
      userId: user.id,
      phoneNumber: formattedPhone
    })

    requestLogger.end(200)
    return NextResponse.json({
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        company: {
          id: user.company.id,
          name: user.company.name,
          type: user.company.type,
          status: user.company.status,
        }
      }
    })

    } catch (error) {
    logError('Verify OTP unexpected error', error, {
      phoneNumber: 'unknown'
    })
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}