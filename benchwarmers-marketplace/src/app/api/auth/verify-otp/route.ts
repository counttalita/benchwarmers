import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPhoneNumber } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Find the user
    const user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
      include: { company: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find the OTP code
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        userId: user.id,
        phoneNumber: formattedPhone,
        verified: false,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'No valid OTP found. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (otpRecord.code !== otp) {
      // Increment attempts
      await prisma.oTPCode.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 }
      })

      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    })

    // Update user verification status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      }
    })

    // Clean up old OTP codes
    await prisma.oTPCode.deleteMany({
      where: {
        userId: user.id,
        id: { not: otpRecord.id }
      }
    })

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
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}