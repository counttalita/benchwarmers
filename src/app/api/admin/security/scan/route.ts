import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { vulnerabilityScanner } from '@/lib/security/vulnerability-scanner'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const securityScanSchema = z.object({
  scanType: z.enum(['full', 'quick', 'targeted']).default('quick'),
  targetEndpoints: z.array(z.string()).optional(),
  scheduledScan: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional()
})

const vulnerabilityUpdateSchema = z.object({
  vulnerabilityId: z.string().min(1, 'Vulnerability ID is required'),
  status: z.enum(['open', 'acknowledged', 'fixed', 'false_positive']),
  notes: z.string().optional()
})

// GET /api/admin/security/scan - Get scan results and reports
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'report'
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date()

    logInfo('Security scan request', {
      correlationId,
      action,
      startDate,
      endDate
    })

    if (action === 'report') {
      const report = await vulnerabilityScanner.generateSecurityReport(startDate, endDate)
      
      return NextResponse.json({
        success: true,
        data: {
          report,
          period: { startDate, endDate }
        },
        correlationId
      })
    }

    if (action === 'vulnerability') {
      const vulnerabilityId = searchParams.get('id')
      if (!vulnerabilityId) {
        return NextResponse.json({
          success: false,
          error: 'Vulnerability ID is required',
          correlationId
        }, { status: 400 })
      }

      const vulnerability = await vulnerabilityScanner.getVulnerability(vulnerabilityId)
      
      return NextResponse.json({
        success: true,
        data: vulnerability,
        correlationId
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action parameter',
      correlationId
    }, { status: 400 })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_security_data' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve security data',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/admin/security/scan - Start security scan or update vulnerability
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    const action = body.action || 'scan'

    logInfo('Security scan action', {
      correlationId,
      action
    })

    if (action === 'scan') {
      // Validate scan request
      const validatedData = securityScanSchema.parse(body)

      // Handle scheduled scan setup
      if (validatedData.scheduledScan && validatedData.frequency) {
        const scheduleId = await vulnerabilityScanner.scheduleAutomatedScan(
          validatedData.frequency,
          validatedData.scanType,
          correlationId
        )

        return NextResponse.json({
          success: true,
          data: {
            scheduleId,
            message: `Automated ${validatedData.frequency} ${validatedData.scanType} scans scheduled`
          },
          correlationId
        })
      }

      // Perform immediate scan
      const scanResult = await vulnerabilityScanner.performSecurityScan(
        validatedData.scanType,
        validatedData.targetEndpoints,
        correlationId
      )

      return NextResponse.json({
        success: true,
        data: scanResult,
        message: 'Security scan completed',
        correlationId
      })
    }

    if (action === 'update_vulnerability') {
      // Validate vulnerability update
      const validatedData = vulnerabilityUpdateSchema.parse(body)

      await vulnerabilityScanner.updateVulnerabilityStatus(
        validatedData.vulnerabilityId,
        validatedData.status,
        validatedData.notes,
        correlationId
      )

      return NextResponse.json({
        success: true,
        message: 'Vulnerability status updated',
        correlationId
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action parameter',
      correlationId
    }, { status: 400 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'SECURITY_SCAN_VALIDATION_ERROR',
        'Validation error in security scan request',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'security_scan_action' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute security scan action',
      correlationId
    }, { status: 500 })
  }
}
