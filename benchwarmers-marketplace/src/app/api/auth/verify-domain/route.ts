import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/auth/verify-domain?token=<token>
export async function GET(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'GET', 
    path: '/api/auth/verify-domain',
    requestId: crypto.randomUUID()
  })

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      requestLogger.warn('Missing verification token')
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find company by verification token
    const company = await prisma.company.findFirst({
      where: {
        domainVerificationToken: token,
        status: 'pending'
      }
    })

    if (!company) {
      requestLogger.warn('Invalid verification token', { token })
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 404 }
      )
    }

    requestLogger.info('Company info retrieved for verification', { companyId: company.id })
    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        domain: company.domain,
        status: company.status,
        domainVerified: company.domainVerified,
        domainVerifiedAt: company.domainVerifiedAt
      }
    })

  } catch (error) {
    requestLogger.error('Domain verification info error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/auth/verify-domain
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/auth/verify-domain',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      requestLogger.warn('Invalid verification token format')
      return NextResponse.json(
        { error: 'Invalid verification token format' },
        { status: 400 }
      )
    }

    // Find company by verification token
    const company = await prisma.company.findFirst({
      where: {
        domainVerificationToken: token,
        status: 'pending'
      }
    })

    if (!company) {
      requestLogger.warn('Invalid verification token', { token })
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 404 }
      )
    }

    // Check if domain is already verified
    if (company.domainVerified) {
      requestLogger.warn('Domain already verified', { companyId: company.id })
      return NextResponse.json(
        { error: 'Domain is already verified' },
        { status: 400 }
      )
    }

    // Update company to verified status
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: {
        domainVerified: true,
        domainVerifiedAt: new Date(),
        status: 'active'
      }
    })

    requestLogger.info('Domain verified successfully', { 
      companyId: company.id,
      domain: company.domain
    })

    return NextResponse.json({
      message: 'Domain verified successfully',
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        domain: updatedCompany.domain,
        domainVerified: updatedCompany.domainVerified,
        domainVerifiedAt: updatedCompany.domainVerifiedAt,
        status: updatedCompany.status
      }
    })

  } catch (error) {
    requestLogger.error('Domain verification error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}