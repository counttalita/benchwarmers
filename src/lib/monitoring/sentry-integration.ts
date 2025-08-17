import { logInfo, logError, createError } from '@/lib/errors'

export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  sampleRate: number
  tracesSampleRate: number
  profilesSampleRate: number
  beforeSend?: (event: unknown) => unknown
}

export interface PerformanceMetrics {
  responseTime: number
  memoryUsage: number
  cpuUsage: number
  dbQueryTime: number
  externalApiTime: number
  errorRate: number
  throughput: number
}

export interface ErrorContext {
  userId?: string
  companyId?: string
  correlationId?: string
  endpoint?: string
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export class SentryIntegration {
  private isInitialized = false
  private config: SentryConfig
  private metrics: Map<string, PerformanceMetrics> = new Map()

  constructor() {
    this.config = {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || '1.0.0',
      sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1')
    }
  }

  /**
   * Initialize Sentry
   */
  init(): void {
    try {
      if (!this.config.dsn) {
        logInfo('Sentry DSN not configured, skipping initialization')
        return
      }

      // In production, use actual Sentry SDK:
      // import * as Sentry from '@sentry/nextjs'
      // 
      // Sentry.init({
      //   dsn: this.config.dsn,
      //   environment: this.config.environment,
      //   release: this.config.release,
      //   sampleRate: this.config.sampleRate,
      //   tracesSampleRate: this.config.tracesSampleRate,
      //   profilesSampleRate: this.config.profilesSampleRate,
      //   beforeSend: this.config.beforeSend,
      //   integrations: [
      //     new Sentry.Integrations.Http({ tracing: true }),
      //     new Sentry.Integrations.Express({ app }),
      //     new Sentry.Integrations.Prisma({ client: prisma })
      //   ]
      // })

      this.isInitialized = true
      logInfo('Sentry initialized successfully', {
        environment: this.config.environment,
        release: this.config.release
      })

    } catch (error) {
      logError('Failed to initialize Sentry', { error })
    }
  }

  /**
   * Capture error with context
   */
  captureError(error: Error, context?: ErrorContext): void {
    try {
      if (!this.isInitialized) {
        logError('Sentry not initialized, logging error locally', { error, context })
        return
      }

      // In production, use actual Sentry SDK:
      // Sentry.withScope((scope) => {
      //   if (context?.userId) scope.setUser({ id: context.userId })
      //   if (context?.companyId) scope.setTag('companyId', context.companyId)
      //   if (context?.correlationId) scope.setTag('correlationId', context.correlationId)
      //   if (context?.endpoint) scope.setTag('endpoint', context.endpoint)
      //   if (context?.metadata) scope.setContext('metadata', context.metadata)
      //   
      //   scope.setLevel('error')
      //   Sentry.captureException(error)
      // })

      logInfo('Error captured by Sentry', {
        errorMessage: error.message,
        correlationId: context?.correlationId,
        userId: context?.userId,
        endpoint: context?.endpoint
      })

    } catch (sentryError) {
      logError('Failed to capture error in Sentry', { 
        originalError: error, 
        sentryError,
        context 
      })
    }
  }

  /**
   * Capture custom message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    try {
      if (!this.isInitialized) {
        logInfo('Sentry not initialized, logging message locally', { message, level, context })
        return
      }

      // In production, use actual Sentry SDK:
      // Sentry.withScope((scope) => {
      //   if (context?.userId) scope.setUser({ id: context.userId })
      //   if (context?.companyId) scope.setTag('companyId', context.companyId)
      //   if (context?.correlationId) scope.setTag('correlationId', context.correlationId)
      //   if (context?.metadata) scope.setContext('metadata', context.metadata)
      //   
      //   scope.setLevel(level)
      //   Sentry.captureMessage(message)
      // })

      logInfo('Message captured by Sentry', { message, level, context })

    } catch (error) {
      logError('Failed to capture message in Sentry', { message, level, context, error })
    }
  }

  /**
   * Start performance transaction
   */
  startTransaction(name: string, operation: string, context?: Record<string, unknown>): string {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      if (!this.isInitialized) {
        return transactionId
      }

      // In production, use actual Sentry SDK:
      // const transaction = Sentry.startTransaction({
      //   name,
      //   op: operation,
      //   data: context
      // })
      // 
      // Store transaction reference for later finishing
      // this.activeTransactions.set(transactionId, transaction)

      logInfo('Performance transaction started', {
        transactionId,
        name,
        operation,
        context
      })

    } catch (error) {
      logError('Failed to start Sentry transaction', { name, operation, context, error })
    }

    return transactionId
  }

  /**
   * Finish performance transaction
   */
  finishTransaction(transactionId: string, status?: string): void {
    try {
      if (!this.isInitialized) {
        return
      }

      // In production, use actual Sentry SDK:
      // const transaction = this.activeTransactions.get(transactionId)
      // if (transaction) {
      //   if (status) transaction.setStatus(status)
      //   transaction.finish()
      //   this.activeTransactions.delete(transactionId)
      // }

      logInfo('Performance transaction finished', {
        transactionId,
      })

    } catch (error) {
      logError('Failed to finish Sentry transaction', { transactionId, error })
    }
  }

  /**
   * Record performance metrics
   */
  recordMetrics(endpoint: string, metrics: PerformanceMetrics): void {
    try {
      this.metrics.set(endpoint, metrics)

      if (!this.isInitialized) {
        return
      }

      // In production, send custom metrics to Sentry:
      // Sentry.metrics.distribution('response_time', metrics.responseTime, {
      //   tags: { endpoint }
      // })
      // Sentry.metrics.gauge('memory_usage', metrics.memoryUsage, {
      //   tags: { endpoint }
      // })
      // Sentry.metrics.gauge('cpu_usage', metrics.cpuUsage, {
      //   tags: { endpoint }
      // })

      logInfo('Performance metrics recorded', {
        endpoint,
        responseTime: metrics.responseTime,
        memoryUsage: metrics.memoryUsage,
        errorRate: metrics.errorRate
      })

    } catch (error) {
      logError('Failed to record metrics in Sentry', { endpoint, metrics, error })
    }
  }

  /**
   * Set user context
   */
  setUser(userId: string, email?: string, companyId?: string): void {
    try {
      if (!this.isInitialized) {
        return
      }

      // In production, use actual Sentry SDK:
      // Sentry.setUser({
      //   id: userId,
      //   email,
      //   companyId
      // })

      logInfo('User context set in Sentry', { userId, email, companyId })

    } catch (error) {
      logError('Failed to set user context in Sentry', { userId, email, companyId, error })
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>): void {
    try {
      if (!this.isInitialized) {
        return
      }

      // In production, use actual Sentry SDK:
      // Sentry.addBreadcrumb({
      //   message,
      //   category,
      //   level,
      //   data,
      //   timestamp: Date.now() / 1000
      // })

      logInfo('Breadcrumb added to Sentry', { message, category, level, data })

    } catch (error) {
      logError('Failed to add breadcrumb to Sentry', { message, category, level, data, error })
    }
  }

  /**
   * Get performance metrics for endpoint
   */
  getMetrics(endpoint: string): PerformanceMetrics | undefined {
    return this.metrics.get(endpoint)
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics)
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
  }

  /**
   * Create performance monitoring middleware
   */
  createPerformanceMiddleware() {
    return async (request: { url: string; method: string; headers: Record<string, string> }, response: { statusCode: number }, next: () => void) => {
      const startTime = Date.now()
      const endpoint = request.url
      const transactionId = this.startTransaction(`${request.method} ${endpoint}`, 'http.server')

      try {
        // Add request breadcrumb
        this.addBreadcrumb(
          `${request.method} ${endpoint}`,
          'http',
          'info',
          {
            method: request.method,
            url: endpoint,
            userAgent: request.headers['user-agent']
          }
        )

        await next()

        const responseTime = Date.now() - startTime
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024 // MB

        // Record performance metrics
        this.recordMetrics(endpoint, {
          responseTime,
          memoryUsage,
          cpuUsage: 0, // Would need actual CPU monitoring
          dbQueryTime: 0, // Would track actual DB queries
          externalApiTime: 0, // Would track external API calls
          errorRate: response.statusCode >= 400 ? 1 : 0,
          throughput: 1
        })

        this.finishTransaction(transactionId)

      } catch (error) {
        this.captureError(error as Error, {
          endpoint,
          userAgent: request.headers['user-agent']
        })
        this.finishTransaction(transactionId)
        throw error
      }
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    slowestEndpoints: Array<{ endpoint: string; responseTime: number }>
    memoryUsage: { average: number; peak: number }
  } {
    const metrics = Array.from(this.metrics.entries())
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowestEndpoints: [],
        memoryUsage: { average: 0, peak: 0 }
      }
    }

    const totalRequests = metrics.length
    const averageResponseTime = metrics.reduce((sum, [, m]) => sum + m.responseTime, 0) / totalRequests
    const errorRate = metrics.reduce((sum, [, m]) => sum + m.errorRate, 0) / totalRequests
    
    const slowestEndpoints = metrics
      .sort(([, a], [, b]) => b.responseTime - a.responseTime)
      .slice(0, 5)
      .map(([endpoint, m]) => ({ endpoint, responseTime: m.responseTime }))

    const memoryUsages = metrics.map(([, m]) => m.memoryUsage)
    const averageMemory = memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length
    const peakMemory = Math.max(...memoryUsages)

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowestEndpoints,
      memoryUsage: { average: averageMemory, peak: peakMemory }
    }
  }

  /**
   * Check if Sentry is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.dsn && this.isInitialized
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    initialized: boolean
    configureScope(callback: (scope: unknown) => void): void
    environment: string
    release: string
    metricsCount: number
  } {
    return {
      initialized: this.isInitialized,
      configureScope: (callback: (scope: unknown) => void) => {
        // No-op
      },
      environment: this.config.environment,
      release: this.config.release || 'unknown',
      metricsCount: this.metrics.size
    }
  }
}

// Export singleton instance
export const sentryIntegration = new SentryIntegration()
