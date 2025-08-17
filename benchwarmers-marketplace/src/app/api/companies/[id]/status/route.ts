import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError, logInfo, logDb } from '@/lib/logger'
import { z } from 'zod'

const companyIdSchema = z.object({
  id: z.string().cuid('Invalid company ID format'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    // Validate company ID
    const validationResult = companyIdSchema.safeParse({ id: params.id })
    if (!validationResult.success) {
      logError('Company status check failed: Invalid ID', null, {
        companyId: params.id,
        validationErrors: validationResult.error.issues
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      )
    }

    const { id: companyId } = validationResult.data

    logInfo('Company status check', { companyId })

    // Find company
    const companyCheckStartTime = Date.now()
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        domain: true,
        type: true,
        status: true,
        domainVerified: true,
        domainVerifiedAt: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    logDb('Company status query', 'company', { 
      companyId, 
      found: !!company,
      duration: Date.now() - companyCheckStartTime
    })

    if (!company) {
      logError('Company status check failed: Company not found', null, { companyId })
      requestLogger.end(404)
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    logInfo('Company status retrieved', {
      companyId: company.id,
      companyName: company.name,
      status: company.status,
      domainVerified: company.domainVerified
    })

    requestLogger.end(200)
    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        domain: company.domain,
        type: company.type,
        status: company.status,
        domainVerified: company.domainVerified,
        domainVerifiedAt: company.domainVerifiedAt,
        verifiedAt: company.verifiedAt,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      }
    })

  } catch (error) {
    logError('Company status check unexpected error', error)
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}