import { logInfo, logError, createError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

export interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  message?: string
  details?: Record<string, any>
  timestamp: Date
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: HealthCheckResult[]
  uptime: number
  timestamp: Date
}

export class HealthChecker {
  private startTime = Date.now()

  /**
   * Check database health
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      // Simple query to test database connectivity
      await prisma.$queryRaw`SELECT 1`
      
      // Check active connections
      const connections = await prisma.$queryRaw<[{ count: number }]>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `
      
      const responseTime = Date.now() - start
      const activeConnections = Number(connections[0]?.count || 0)
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      let message = 'Database is healthy'
      
      if (activeConnections > 50) {
        status = 'degraded'
        message = 'High number of active connections'
      } else if (activeConnections > 100) {
        status = 'unhealthy'
        message = 'Critical number of active connections'
      }
      
      if (responseTime > 1000) {
        status = 'degraded'
        message = 'Slow database response time'
      }

      return {
        service: 'database',
        status,
        responseTime,
        message,
        details: {
          activeConnections,
          maxConnections: 100 // Configure based on your setup
        },
        timestamp: new Date()
      }

    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Check external API health
   */
  async checkExternalAPIs(): Promise<HealthCheckResult[]> {
    const checks = [
      this.checkStripeAPI(),
      this.checkSendGridAPI(),
      this.checkTwilioAPI(),
      this.checkDocuSignAPI()
    ]

    return await Promise.all(checks)
  }

  /**
   * Check Stripe API health
   */
  private async checkStripeAPI(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      // Mock Stripe health check - replace with actual Stripe API call
      const response = await fetch('https://status.stripe.com/api/v2/status.json', {
        method: 'GET',
        timeout: 5000
      })
      
      const responseTime = Date.now() - start
      
      if (response.ok) {
        return {
          service: 'stripe',
          status: 'healthy',
          responseTime,
          message: 'Stripe API is accessible',
          timestamp: new Date()
        }
      } else {
        return {
          service: 'stripe',
          status: 'degraded',
          responseTime,
          message: `Stripe API returned ${response.status}`,
          timestamp: new Date()
        }
      }

    } catch (error) {
      return {
        service: 'stripe',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'Stripe API unreachable',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Check SendGrid API health
   */
  private async checkSendGridAPI(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      // Mock SendGrid health check
      const apiKey = process.env.SENDGRID_API_KEY
      
      if (!apiKey) {
        return {
          service: 'sendgrid',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          message: 'SendGrid API key not configured',
          timestamp: new Date()
        }
      }

      // In production, make actual API call to SendGrid
      return {
        service: 'sendgrid',
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'SendGrid API configured',
        timestamp: new Date()
      }

    } catch (error) {
      return {
        service: 'sendgrid',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'SendGrid API check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Check Twilio API health
   */
  private async checkTwilioAPI(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      
      if (!accountSid || !authToken) {
        return {
          service: 'twilio',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          message: 'Twilio credentials not configured',
          timestamp: new Date()
        }
      }

      // In production, make actual API call to Twilio
      return {
        service: 'twilio',
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'Twilio API configured',
        timestamp: new Date()
      }

    } catch (error) {
      return {
        service: 'twilio',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'Twilio API check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Check DocuSign API health
   */
  private async checkDocuSignAPI(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
      const userId = process.env.DOCUSIGN_USER_ID
      
      if (!integrationKey || !userId) {
        return {
          service: 'docusign',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          message: 'DocuSign credentials not configured',
          timestamp: new Date()
        }
      }

      // In production, make actual API call to DocuSign
      return {
        service: 'docusign',
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'DocuSign API configured',
        timestamp: new Date()
      }

    } catch (error) {
      return {
        service: 'docusign',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'DocuSign API check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      const memoryUsage = process.memoryUsage()
      const totalMemory = memoryUsage.heapTotal
      const usedMemory = memoryUsage.heapUsed
      const memoryPercent = (usedMemory / totalMemory) * 100
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      let message = 'Memory usage is normal'
      
      if (memoryPercent > 80) {
        status = 'degraded'
        message = 'High memory usage'
      } else if (memoryPercent > 95) {
        status = 'unhealthy'
        message = 'Critical memory usage'
      }

      return {
        service: 'memory',
        status,
        responseTime: Date.now() - start,
        message,
        details: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          usagePercent: Math.round(memoryPercent)
        },
        timestamp: new Date()
      }

    } catch (error) {
      return {
        service: 'memory',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'Memory check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Check disk space (if applicable)
   */
  async checkDiskSpace(): Promise<HealthCheckResult> {
    const start = Date.now()
    
    try {
      // Mock disk space check - in production, use actual disk space monitoring
      const freeSpacePercent = 75 // Mock value
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      let message = 'Disk space is adequate'
      
      if (freeSpacePercent < 20) {
        status = 'degraded'
        message = 'Low disk space'
      } else if (freeSpacePercent < 10) {
        status = 'unhealthy'
        message = 'Critical disk space'
      }

      return {
        service: 'disk',
        status,
        responseTime: Date.now() - start,
        message,
        details: {
          freeSpacePercent,
          totalSpace: '100GB', // Mock values
          freeSpace: `${freeSpacePercent}GB`
        },
        timestamp: new Date()
      }

    } catch (error) {
      return {
        service: 'disk',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: 'Disk space check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthReport> {
    try {
      logInfo('Starting system health check')

      const [
        databaseHealth,
        externalAPIsHealth,
        memoryHealth,
        diskHealth
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkExternalAPIs(),
        this.checkMemoryUsage(),
        this.checkDiskSpace()
      ])

      const allServices = [
        databaseHealth,
        ...externalAPIsHealth,
        memoryHealth,
        diskHealth
      ]

      // Determine overall system health
      const unhealthyServices = allServices.filter(s => s.status === 'unhealthy')
      const degradedServices = allServices.filter(s => s.status === 'degraded')
      
      let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (unhealthyServices.length > 0) {
        overall = 'unhealthy'
      } else if (degradedServices.length > 0) {
        overall = 'degraded'
      }

      const uptime = Date.now() - this.startTime
      
      const report: SystemHealthReport = {
        overall,
        services: allServices,
        uptime,
        timestamp: new Date()
      }

      logInfo('System health check completed', {
        overall,
        servicesChecked: allServices.length,
        unhealthyCount: unhealthyServices.length,
        degradedCount: degradedServices.length
      })

      return report

    } catch (error) {
      logError(createError.internal('HEALTH_CHECK_ERROR', 'Health check failed', { error }))
      
      return {
        overall: 'unhealthy',
        services: [{
          service: 'health-checker',
          status: 'unhealthy',
          responseTime: 0,
          message: 'Health check system failed',
          timestamp: new Date()
        }],
        uptime: Date.now() - this.startTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * Get system uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime
  }

  /**
   * Get formatted uptime string
   */
  getFormattedUptime(): string {
    const uptime = this.getUptime()
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker()
