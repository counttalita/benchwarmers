import { NextRequest, NextResponse } from 'next/server'
import { sentryIntegration } from '@/lib/monitoring/sentry-integration'
import { logInfo, logError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// GET /api/admin/monitoring/performance - Get performance metrics and reports
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'report'

    logInfo('Performance monitoring request', {
      correlationId,
      action
    })

    if (action === 'status') {
      const status = sentryIntegration.getStatus()
      
      return NextResponse.json({
        success: true,
        data: status,
        correlationId
      })
    }

    if (action === 'report') {
      const report = sentryIntegration.generatePerformanceReport()
      
      return NextResponse.json({
        success: true,
        data: report,
        correlationId
      })
    }

    if (action === 'metrics') {
      const endpoint = searchParams.get('endpoint')
      
      if (endpoint) {
        const metrics = sentryIntegration.getMetrics(endpoint)
        return NextResponse.json({
          success: true,
          data: { endpoint, metrics },
          correlationId
        })
      } else {
        const allMetrics = Object.fromEntries(sentryIntegration.getAllMetrics())
        return NextResponse.json({
          success: true,
          data: { metrics: allMetrics },
          correlationId
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action parameter',
      correlationId
    }, { status: 400 })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_performance_metrics' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/admin/monitoring/performance - Initialize or configure Sentry
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    const action = body.action || 'init'

    logInfo('Performance monitoring configuration', {
      correlationId,
      action
    })

    if (action === 'init') {
      sentryIntegration.init()
      
      return NextResponse.json({
        success: true,
        message: 'Sentry integration initialized',
        data: sentryIntegration.getStatus(),
        correlationId
      })
    }

    if (action === 'clear_metrics') {
      sentryIntegration.clearMetrics()
      
      return NextResponse.json({
        success: true,
        message: 'Performance metrics cleared',
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
    logError(appError, { correlationId, operation: 'configure_performance_monitoring' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to configure performance monitoring',
      correlationId
    }, { status: 500 })
  }
}
