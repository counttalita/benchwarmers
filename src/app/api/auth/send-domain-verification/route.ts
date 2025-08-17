import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/auth/send-domain-verification
export async function POST(request: NextRequest) {
        const requestLogger = logger

  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId || typeof companyId !== 'string') {
      requestLogger.warn('Invalid company ID format')
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      )
    }

    // Find company by ID
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { role: 'admin' },
          take: 1
        }
      }
    })

    if (!company) {
      requestLogger.warn('Company not found', { companyId })
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if domain is already verified
    if (company.domainVerified) {
      requestLogger.warn('Domain already verified', { companyId })
      return NextResponse.json(
        { error: 'Domain is already verified' },
        { status: 400 }
      )
    }

    // Get admin user email
    if (company.users.length === 0) {
      requestLogger.warn('No admin user found', { companyId })
      return NextResponse.json(
        { error: 'No admin user found for company' },
        { status: 400 }
      )
    }

    const adminUser = company.users[0]
    const adminEmail = adminUser.email

    // Generate new verification token if not exists
    let verificationToken = company.domainVerificationToken
    if (!verificationToken) {
      verificationToken = crypto.randomUUID()
      await prisma.company.update({
        where: { id: companyId },
        data: { domainVerificationToken: verificationToken }
      })
    }

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-domain?token=${verificationToken}`
    
    const emailResult = await resend.emails.send({
      from: 'noreply@benchwarmers.com',
      to: adminEmail,
      subject: `Verify your domain ownership - ${company.domain}`,
      html: `
        <h2>Verify Your Domain Ownership</h2>
        <p>Hello ${adminUser.name},</p>
        <p>Please verify your domain ownership for <strong>${company.domain}</strong> to complete your company registration.</p>
        <p>Click the link below to verify your domain:</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
          Verify Domain
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The BenchWarmers Team</p>
      `
    })

    if (emailResult.error) {
      requestLogger.error('Failed to send verification email', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    requestLogger.info('Domain verification email sent successfully', {
      companyId,
      domain: company.domain,
      email: adminEmail
    })

    return NextResponse.json({
      message: 'Domain verification email sent successfully',
      email: adminEmail
    })

  } catch (error) {
    requestLogger.error('Send domain verification error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

