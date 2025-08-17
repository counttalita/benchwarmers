import { NextRequest, NextResponse } from 'next/server'
import { logRequest, logInfo, logPerformance } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    // Check database connectivity
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbDuration = Date.now() - dbStartTime

    logPerformance('Database health check', dbDuration, {
      endpoint: '/api/health',
      success: true
    })

    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
    ]

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingEnvVars.length > 0) {
      logInfo('Health check: Missing environment variables', {
        missing: missingEnvVars
      })
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: 'healthy',
          responseTime: dbDuration,
        },
        environment: {
          status: missingEnvVars.length === 0 ? 'healthy' : 'warning',
          missingVariables: missingEnvVars,
        },
      },
    }

    logInfo('Health check completed', {
      status: healthStatus.status,
      dbDuration,
      missingEnvVars: missingEnvVars.length
    })

    const totalDuration = Date.now() - startTime
    logPerformance('Health check total', totalDuration, {
      endpoint: '/api/health'
    })

    requestLogger.end(200)
    return NextResponse.json(healthStatus)

  } catch (error) {
    logInfo('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/health'
    })

    requestLogger.error(error as Error, 503)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable',
      },
      { status: 503 }
    )
  }
}
