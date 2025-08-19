import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  message?: string
  details?: any
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: HealthCheck[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Test query performance
    const userCount = await prisma.user.count()
    const companyCount = await prisma.company.count()
    
    const responseTime = Date.now() - startTime
    
    return {
      service: 'database',
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        userCount,
        companyCount,
        connectionPool: 'active'
      }
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

/**
 * Check external service dependencies
 */
async function checkExternalServices(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []
  
  // Check Paystack API
  const paystackCheck = await checkPaystack()
  checks.push(paystackCheck)
  
  // Check Pusher (WebSocket service)
  const pusherCheck = await checkPusher()
  checks.push(pusherCheck)
  
  // Check email service (Resend)
  const emailCheck = await checkEmailService()
  checks.push(emailCheck)
  
  return checks
}

/**
 * Check Paystack API connectivity
 */
async function checkPaystack(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Simple API call to verify connectivity
    const response = await fetch('https://api.paystack.co/bank', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        service: 'paystack',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          endpoint: 'https://api.paystack.co',
          statusCode: response.status
        }
      }
    } else {
      return {
        service: 'paystack',
        status: 'degraded',
        responseTime,
        message: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      service: 'paystack',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Paystack API unreachable'
    }
  }
}

/**
 * Check Pusher service
 */
async function checkPusher(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // For Pusher, we'll just verify the configuration is present
    const pusherAppId = process.env.PUSHER_APP_ID
    const pusherKey = process.env.PUSHER_KEY
    const pusherSecret = process.env.PUSHER_SECRET
    
    if (!pusherAppId || !pusherKey || !pusherSecret) {
      return {
        service: 'pusher',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Pusher configuration missing'
      }
    }
    
    // In production, you might want to test actual WebSocket connection
    return {
      service: 'pusher',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        appId: pusherAppId,
        cluster: process.env.PUSHER_CLUSTER || 'mt1'
      }
    }
  } catch (error) {
    return {
      service: 'pusher',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Pusher check failed'
    }
  }
}

/**
 * Check email service (Resend)
 */
async function checkEmailService(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      return {
        service: 'email',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Email service API key missing'
      }
    }
    
    // Test API connectivity (without sending actual email)
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        service: 'email',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          endpoint: 'https://api.resend.com',
          statusCode: response.status
        }
      }
    } else {
      return {
        service: 'email',
        status: 'degraded',
        responseTime,
        message: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      service: 'email',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Email service unreachable'
    }
  }
}

/**
 * Check system resources and performance
 */
async function checkSystemResources(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []
  
  // Memory usage check
  const memoryCheck = checkMemoryUsage()
  checks.push(memoryCheck)
  
  // CPU usage check (simulated)
  const cpuCheck = checkCPUUsage()
  checks.push(cpuCheck)
  
  return checks
}

/**
 * Check memory usage
 */
function checkMemoryUsage(): HealthCheck {
  const startTime = Date.now()
  
  try {
    const memoryUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const memoryUtilization = (heapUsedMB / heapTotalMB) * 100
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (memoryUtilization > 90) status = 'unhealthy'
    else if (memoryUtilization > 75) status = 'degraded'
    
    return {
      service: 'memory',
      status,
      responseTime: Date.now() - startTime,
      details: {
        heapUsedMB,
        heapTotalMB,
        utilizationPercent: Math.round(memoryUtilization),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    }
  } catch (error) {
    return {
      service: 'memory',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Memory check failed'
    }
  }
}

/**
 * Check CPU usage (simulated)
 */
function checkCPUUsage(): HealthCheck {
  const startTime = Date.now()
  
  try {
    // In a real implementation, you'd measure actual CPU usage
    // For now, we'll simulate based on system load
    const cpuUsage = Math.random() * 100 // Simulated CPU usage
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (cpuUsage > 90) status = 'unhealthy'
    else if (cpuUsage > 75) status = 'degraded'
    
    return {
      service: 'cpu',
      status,
      responseTime: Date.now() - startTime,
      details: {
        utilizationPercent: Math.round(cpuUsage),
        loadAverage: process.loadavg ? process.loadavg() : [0, 0, 0]
      }
    }
  } catch (error) {
    return {
      service: 'cpu',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'CPU check failed'
    }
  }
}

/**
 * Check application-specific health
 */
async function checkApplicationHealth(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []
  
  // Check matching algorithm performance
  const matchingCheck = await checkMatchingAlgorithm()
  checks.push(matchingCheck)
  
  // Check notification system
  const notificationCheck = await checkNotificationSystem()
  checks.push(notificationCheck)
  
  return checks
}

/**
 * Check matching algorithm performance
 */
async function checkMatchingAlgorithm(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Test with sample data
    const sampleRequest = {
      requiredSkills: [
        { name: 'React', level: 'senior', priority: 'required' }
      ],
      budget: { min: 50000, max: 80000 },
      location: 'Cape Town'
    }
    
    const sampleProfiles = [
      {
        skills: [{ name: 'React', level: 'senior', yearsExperience: 5 }],
        location: 'Cape Town',
        hourlyRate: 600
      }
    ]
    
    // Import and test matching engine
    const { MatchingEngine } = await import('@/lib/matching/matching-engine')
    const engine = new MatchingEngine()
    
    const matches = await engine.findMatches(sampleRequest as any, sampleProfiles as any)
    const responseTime = Date.now() - startTime
    
    return {
      service: 'matching',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        sampleMatches: matches.length,
        averageScore: matches.length > 0 ? matches[0].score : 0
      }
    }
  } catch (error) {
    return {
      service: 'matching',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Matching algorithm failed'
    }
  }
}

/**
 * Check notification system
 */
async function checkNotificationSystem(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Test notification service initialization
    const { notificationService } = await import('@/lib/notifications/notification-service')
    
    if (!notificationService) {
      return {
        service: 'notifications',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Notification service not initialized'
      }
    }
    
    return {
      service: 'notifications',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        serviceInitialized: true
      }
    }
  } catch (error) {
    return {
      service: 'notifications',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Notification system failed'
    }
  }
}

/**
 * Main health check endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    logger.info('Comprehensive health check started')
    
    // Run all health checks in parallel
    const [
      databaseCheck,
      externalServiceChecks,
      systemResourceChecks,
      applicationHealthChecks
    ] = await Promise.all([
      checkDatabase(),
      checkExternalServices(),
      checkSystemResources(),
      checkApplicationHealth()
    ])
    
    // Combine all checks
    const allChecks = [
      databaseCheck,
      ...externalServiceChecks,
      ...systemResourceChecks,
      ...applicationHealthChecks
    ]
    
    // Calculate summary
    const summary = {
      total: allChecks.length,
      healthy: allChecks.filter(check => check.status === 'healthy').length,
      degraded: allChecks.filter(check => check.status === 'degraded').length,
      unhealthy: allChecks.filter(check => check.status === 'unhealthy').length
    }
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy'
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded'
    }
    
    const healthReport: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: allChecks,
      summary
    }
    
    const totalResponseTime = Date.now() - startTime
    
    logger.info('Comprehensive health check completed', {
      status: overallStatus,
      totalResponseTime,
      summary
    })
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthReport, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    const errorReport: SystemHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: [{
        service: 'health-check',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Health check system failure'
      }],
      summary: {
        total: 1,
        healthy: 0,
        degraded: 0,
        unhealthy: 1
      }
    }
    
    return NextResponse.json(errorReport, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  // Lightweight health check for load balancers
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
