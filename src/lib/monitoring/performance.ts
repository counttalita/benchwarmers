import { captureMessage, setTag } from './sentry'

export interface PerformanceMetrics {
  operation: string
  duration: number
  success: boolean
  metadata?: Record<string, any>
}

export interface BusinessMetrics {
  event: string
  userId?: string
  companyId?: string
  value?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private businessMetrics: BusinessMetrics[] = []

  trackOperation(operation: string, fn: () => Promise<any> | any, metadata?: Record<string, any>) {
    const startTime = Date.now()
    
    return Promise.resolve(fn())
      .then((result: any) => {
        const duration = Date.now() - startTime
        this.recordMetric({
          operation,
          duration,
          success: true,
          metadata
        })
        return result
      })
      .catch((error: any) => {
        const duration = Date.now() - startTime
        this.recordMetric({
          operation,
          duration,
          success: false,
          metadata: { ...metadata, error: error.message }
        })
        throw error
      })
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Log slow operations
    if (metric.duration > 1000) {
      captureMessage(`Slow operation detected: ${metric.operation} took ${metric.duration}ms`, 'warning')
    }

    // Log failed operations
    if (!metric.success) {
      captureMessage(`Operation failed: ${metric.operation}`, 'error')
    }

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  recordBusinessMetric(metric: BusinessMetrics) {
    this.businessMetrics.push(metric)
    
    // Track important business events
    if (['user_registration', 'company_registration', 'payment_processed', 'engagement_created'].includes(metric.event)) {
      captureMessage(`Business event: ${metric.event}`, 'info')
      setTag('business_event', metric.event)
    }

    // Keep only last 1000 business metrics in memory
    if (this.businessMetrics.length > 1000) {
      this.businessMetrics = this.businessMetrics.slice(-1000)
    }
  }

  getMetrics() {
    return {
      performance: this.metrics,
      business: this.businessMetrics
    }
  }

  getAverageResponseTime(operation?: string) {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics

    if (filteredMetrics.length === 0) return 0

    const totalDuration = filteredMetrics.reduce((sum: any, m: any) => sum + m.duration, 0)
    return totalDuration / filteredMetrics.length
  }

  getSuccessRate(operation?: string) {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics

    if (filteredMetrics.length === 0) return 0

    const successful = filteredMetrics.filter(m => m.success).length
    return successful / filteredMetrics.length
  }

  getBusinessMetricsByEvent(event: string) {
    return this.businessMetrics.filter(m => m.event === event)
  }

  clear() {
    this.metrics = []
    this.businessMetrics = []
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Decorator for tracking API operations
export function trackOperation(operation: string, metadata?: Record<string, any>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.trackOperation(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args),
        metadata
      )
    }
  }
}

// Utility functions for common business events
export const businessMetrics = {
  userRegistration: (userId: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordBusinessMetric({
      event: 'user_registration',
      userId,
      metadata
    })
  },

  companyRegistration: (companyId: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordBusinessMetric({
      event: 'company_registration',
      companyId,
      metadata
    })
  },

  paymentProcessed: (amount: number, userId?: string, companyId?: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordBusinessMetric({
      event: 'payment_processed',
      userId,
      companyId,
      value: amount,
      metadata
    })
  },

  engagementCreated: (engagementId: string, userId?: string, companyId?: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordBusinessMetric({
      event: 'engagement_created',
      userId,
      companyId,
      metadata: { ...metadata, engagementId }
    })
  },

  matchGenerated: (matchCount: number, userId?: string, companyId?: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordBusinessMetric({
      event: 'match_generated',
      userId,
      companyId,
      value: matchCount,
      metadata
    })
  }
}
