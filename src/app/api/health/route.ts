import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { performanceMonitor } from '@/lib/monitoring/performance'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseHealth()
    
    // Check external services
    const externalServices = await checkExternalServices()
    
    // Get system metrics
    const metrics = performanceMonitor.getMetrics()
    
    const responseTime = Date.now() - startTime
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      services: {
        database: dbStatus,
        ...externalServices
      },
      metrics: {
        performance: {
          averageResponseTime: performanceMonitor.getAverageResponseTime(),
          successRate: performanceMonitor.getSuccessRate(),
          totalOperations: metrics.performance.length
        },
        business: {
          totalEvents: metrics.business.length,
          recentEvents: metrics.business.slice(-10)
        }
      }
    }

    // Determine overall health status
    const allHealthy = dbStatus.status === 'healthy' && 
      Object.values(externalServices).every(service => service.status === 'healthy')

    if (!allHealthy) {
      healthStatus.status = 'degraded'
    }

    return NextResponse.json(healthStatus, {
      status: allHealthy ? 200 : 503
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: { status: 'unhealthy', error: 'Database check failed' },
        stripe: { status: 'unknown', error: 'Service check failed' },
        twilio: { status: 'unknown', error: 'Service check failed' },
        pusher: { status: 'unknown', error: 'Service check failed' }
      }
    }, {
      status: 503
    })
  }
}

async function checkDatabaseHealth() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Check if we can perform basic operations
    const userCount = await prisma.user.count()
    const companyCount = await prisma.company.count()
    
    return {
      status: 'healthy',
      details: {
        connection: 'connected',
        userCount,
        companyCount
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

async function checkExternalServices() {
  const services: Record<string, any> = {}
  
  // Check Stripe
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      await stripe.paymentMethods.list({ limit: 1 })
      services.stripe = { status: 'healthy' }
    } else {
      services.stripe = { status: 'not_configured' }
    }
  } catch (error) {
    services.stripe = { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Stripe check failed' 
    }
  }
  
  // Check Twilio
  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await twilio.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
      services.twilio = { status: 'healthy' }
    } else {
      services.twilio = { status: 'not_configured' }
    }
  } catch (error) {
    services.twilio = { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Twilio check failed' 
    }
  }
  
  // Check Pusher
  try {
    if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
      const Pusher = require('pusher')
      const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER
      })
      
      // Test Pusher connection by getting app info
      await pusher.get({ path: '/apps' })
      services.pusher = { status: 'healthy' }
    } else {
      services.pusher = { status: 'not_configured' }
    }
  } catch (error) {
    services.pusher = { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Pusher check failed' 
    }
  }
  
  return services
}
