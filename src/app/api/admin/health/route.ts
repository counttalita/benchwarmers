import { NextRequest, NextResponse } from 'next/server'
import { healthChecker } from '@/lib/monitoring/health-checker'
import { logInfo, logError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// GET /api/admin/health - Get system health status
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    logInfo('Health check requested', { correlationId })

    const healthReport = await healthChecker.performHealthCheck()

    // Set appropriate HTTP status based on health
    let status = 200
    if (healthReport.overall === 'degraded') {
      status = 200 // Still OK but with warnings
    } else if (healthReport.overall === 'unhealthy') {
      status = 503 // Service unavailable
    }

    return NextResponse.json({
      success: true,
      data: {
        ...healthReport,
        uptimeFormatted: healthChecker.getFormattedUptime()
      },
      correlationId
    }, { status })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'health_check' })
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      correlationId
    }, { status: 500 })
  }
}
