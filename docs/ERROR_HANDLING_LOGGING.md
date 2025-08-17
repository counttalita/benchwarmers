# Error Handling and Logging

## Overview

Talent Brew is a B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills. The platform implements a comprehensive error handling and logging system to ensure robust application behavior, effective debugging, and comprehensive audit trails. The system provides structured error management, detailed logging, and monitoring capabilities. The system is designed for production-grade reliability and debugging efficiency.

## Error Handling Architecture

### Error Types and Hierarchy

#### Base Error Classes (`src/lib/errors/`)

##### AppError (`src/lib/errors/types.ts`)
```typescript
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly correlationId: string
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.correlationId = generateCorrelationId()
    this.context = context
    
    Error.captureStackTrace(this, this.constructor)
  }
}
```

##### Specialized Error Classes
```typescript
// Validation Errors
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 400, true, { field, value })
  }
}

// Authentication Errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true)
  }
}

// Authorization Errors
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true)
  }
}

// Not Found Errors
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`
    super(message, 404, true, { resource, id })
  }
}

// Business Logic Errors
export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 422, true, context)
  }
}

// External Service Errors
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(`${service} service error: ${message}`, 502, true, {
      service,
      originalError: originalError?.message
    })
  }
}

// Rate Limiting Errors
export class RateLimitError extends AppError {
  constructor(limit: number, windowMs: number) {
    super(`Rate limit exceeded: ${limit} requests per ${windowMs}ms`, 429, true, {
      limit,
      windowMs
    })
  }
}
```

### Error Handling Utilities (`src/lib/errors/utils.ts`)

#### Error Classification
```typescript
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

export function getErrorStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode
  }
  
  // Handle known error types
  if (error.name === 'ValidationError') return 400
  if (error.name === 'UnauthorizedError') return 401
  if (error.name === 'ForbiddenError') return 403
  if (error.name === 'NotFoundError') return 404
  
  return 500
}

export function sanitizeErrorForClient(error: Error): {
  message: string
  statusCode: number
  correlationId?: string
  context?: Record<string, any>
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      correlationId: error.correlationId,
      context: error.isOperational ? error.context : undefined
    }
  }
  
  // Don't expose internal errors to clients
  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
    correlationId: generateCorrelationId()
  }
}
```

#### Correlation ID Generation
```typescript
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function getCorrelationId(req?: NextRequest): string {
  return req?.headers.get('x-correlation-id') || generateCorrelationId()
}
```

### API Error Handling

#### Global Error Handler (`src/lib/errors/index.ts`)
```typescript
export function handleApiError(error: Error, req?: NextRequest): NextResponse {
  const correlationId = getCorrelationId(req)
  
  // Log the error
  logError(error, { correlationId, url: req?.url })
  
  // Sanitize error for client response
  const clientError = sanitizeErrorForClient(error)
  
  return NextResponse.json(
    {
      success: false,
      error: clientError.message,
      correlationId: clientError.correlationId,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        context: clientError.context
      })
    },
    { status: clientError.statusCode }
  )
}
```

#### API Route Error Wrapper
```typescript
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      const req = args[0] as NextRequest
      return handleApiError(error as Error, req)
    }
  }
}

// Usage in API routes
export const GET = withErrorHandling(async (request: NextRequest) => {
  // API logic here
  const data = await someOperation()
  return NextResponse.json({ success: true, data })
})
```

## Logging System

### Logging Configuration (`src/lib/logging-config.ts`)

#### Logger Setup
```typescript
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        correlationId,
        ...meta
      })
    })
  ),
  defaultMeta: {
    service: 'benchwarmers-api',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
})

// Add production transports
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/audit.log',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }))
}
```

### Structured Logging (`src/lib/logger.ts`)

#### Core Logging Functions
```typescript
interface LogContext {
  correlationId?: string
  userId?: string
  companyId?: string
  action?: string
  resource?: string
  metadata?: Record<string, any>
}

export function logInfo(message: string, context?: LogContext): void {
  logger.info(message, context)
}

export function logError(error: Error, context?: LogContext): void {
  logger.error(error.message, {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        correlationId: error.correlationId,
        context: error.context
      })
    }
  })
}

export function logWarning(message: string, context?: LogContext): void {
  logger.warn(message, context)
}

export function logDebug(message: string, context?: LogContext): void {
  logger.debug(message, context)
}
```

#### Request Logging
```typescript
export function logRequest(request: NextRequest, context?: LogContext): void {
  const correlationId = getCorrelationId(request)
  
  logInfo('API Request', {
    correlationId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    ...context
  })
}

export function logResponse(
  request: NextRequest,
  response: NextResponse,
  duration: number,
  context?: LogContext
): void {
  const correlationId = getCorrelationId(request)
  
  logInfo('API Response', {
    correlationId,
    method: request.method,
    url: request.url,
    statusCode: response.status,
    duration: `${duration}ms`,
    ...context
  })
}
```

#### Business Event Logging
```typescript
export function logBusinessEvent(
  event: string,
  context: LogContext & {
    userId?: string
    companyId?: string
    resourceId?: string
    metadata?: Record<string, any>
  }
): void {
  logInfo(`Business Event: ${event}`, {
    ...context,
    eventType: 'business',
    timestamp: new Date().toISOString()
  })
}

// Usage examples
logBusinessEvent('offer_created', {
  correlationId,
  userId: user.id,
  companyId: company.id,
  resourceId: offer.id,
  metadata: {
    amount: offer.amount,
    currency: offer.currency,
    requestId: offer.requestId
  }
})

logBusinessEvent('payment_processed', {
  correlationId,
  userId: user.id,
  companyId: company.id,
  resourceId: payment.id,
  metadata: {
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.method,
    stripePaymentIntentId: payment.stripePaymentIntentId
  }
})
```

### Audit Logging (`src/lib/audit/audit-logger.ts`)

#### Audit Trail System
```typescript
interface AuditEvent {
  action: string
  resource: string
  resourceId: string
  userId: string
  companyId?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  metadata?: Record<string, any>
  timestamp: Date
  correlationId: string
}

export class AuditLogger {
  static async logEvent(event: Omit<AuditEvent, 'timestamp' | 'correlationId'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
      correlationId: generateCorrelationId()
    }
    
    // Log to audit trail
    logger.info('Audit Event', {
      ...auditEvent,
      eventType: 'audit'
    })
    
    // Store in database for compliance
    await prisma.auditLog.create({
      data: auditEvent
    })
  }
  
  static async logDataChange(
    action: 'create' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    userId: string,
    before?: Record<string, any>,
    after?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action,
      resource,
      resourceId,
      userId,
      changes: { before, after },
      metadata
    })
  }
}

// Usage in API routes
await AuditLogger.logDataChange(
  'update',
  'company',
  company.id,
  user.id,
  originalCompany,
  updatedCompany,
  { reason: 'profile_update' }
)
```

## Error Monitoring and Alerting

### Sentry Integration (`src/lib/monitoring/sentry-integration.ts`)

#### Sentry Configuration
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filter out operational errors from Sentry
    const error = hint.originalException
    if (error instanceof AppError && error.isOperational) {
      return null
    }
    return event
  },
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
  ]
})

export function captureError(error: Error, context?: Record<string, any>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key])
      })
    }
    
    if (error instanceof AppError) {
      scope.setTag('correlationId', error.correlationId)
      scope.setContext('errorContext', error.context)
    }
    
    Sentry.captureException(error)
  })
}
```

### Health Monitoring (`src/lib/monitoring/health-checker.ts`)

#### System Health Checks
```typescript
interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  error?: string
  metadata?: Record<string, any>
}

export class HealthChecker {
  static async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1`
      return {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - start
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  static async checkRedis(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      // Redis health check implementation
      return {
        name: 'redis',
        status: 'healthy',
        responseTime: Date.now() - start
      }
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  static async checkExternalServices(): Promise<HealthCheck[]> {
    const checks = await Promise.allSettled([
      this.checkStripe(),
      this.checkDocuSign(),
      this.checkSendGrid()
    ])
    
    return checks.map((result, index) => {
      const serviceName = ['stripe', 'docusign', 'sendgrid'][index]
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          name: serviceName,
          status: 'unhealthy' as const,
          error: result.reason?.message || 'Service check failed'
        }
      }
    })
  }
  
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded'
    checks: HealthCheck[]
    timestamp: string
  }> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      ...await this.checkExternalServices()
    ])
    
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length
    const degradedCount = checks.filter(check => check.status === 'degraded').length
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded'
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString()
    }
  }
}
```

## Performance Monitoring (`src/lib/monitoring/performance.ts`)

### Request Performance Tracking
```typescript
interface PerformanceMetrics {
  requestId: string
  method: string
  url: string
  duration: number
  statusCode: number
  memoryUsage: NodeJS.MemoryUsage
  timestamp: Date
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = []
  
  static startRequest(requestId: string): number {
    return Date.now()
  }
  
  static endRequest(
    requestId: string,
    startTime: number,
    method: string,
    url: string,
    statusCode: number
  ): void {
    const duration = Date.now() - startTime
    const memoryUsage = process.memoryUsage()
    
    const metrics: PerformanceMetrics = {
      requestId,
      method,
      url,
      duration,
      statusCode,
      memoryUsage,
      timestamp: new Date()
    }
    
    this.metrics.push(metrics)
    
    // Log slow requests
    if (duration > 1000) {
      logWarning('Slow request detected', {
        correlationId: requestId,
        duration: `${duration}ms`,
        url,
        method
      })
    }
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }
  
  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }
  
  static getAverageResponseTime(timeWindow: number = 300000): number {
    const cutoff = Date.now() - timeWindow
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    
    if (recentMetrics.length === 0) return 0
    
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0)
    return totalDuration / recentMetrics.length
  }
}
```

## Client-Side Error Handling

### React Error Boundaries (`src/components/error/ErrorBoundary.tsx`)
```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error to monitoring service
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={() => this.setState({ hasError: false })}
          componentStack={this.state.errorInfo?.componentStack}
        />
      )
    }
    
    return this.props.children
  }
}
```

### Global Error Handler
```typescript
// pages/_app.tsx or app/layout.tsx
useEffect(() => {
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    logError(new Error(`Unhandled promise rejection: ${event.reason}`))
    captureError(new Error(`Unhandled promise rejection: ${event.reason}`))
  }
  
  const handleError = (event: ErrorEvent) => {
    logError(new Error(`Global error: ${event.message}`))
    captureError(new Error(`Global error: ${event.message}`))
  }
  
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('error', handleError)
  
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    window.removeEventListener('error', handleError)
  }
}, [])
```

## Best Practices

### Error Handling Guidelines
1. **Use Specific Error Types**: Create specific error classes for different scenarios
2. **Include Context**: Always provide relevant context with errors
3. **Correlation IDs**: Use correlation IDs to track requests across services
4. **Sanitize Client Errors**: Never expose sensitive information to clients
5. **Log Everything**: Log all errors with appropriate severity levels

### Logging Best Practices
1. **Structured Logging**: Use consistent JSON structure for logs
2. **Correlation IDs**: Include correlation IDs in all log entries
3. **Appropriate Levels**: Use correct log levels (error, warn, info, debug)
4. **Performance Impact**: Be mindful of logging performance in hot paths
5. **Sensitive Data**: Never log sensitive information (passwords, tokens, PII)

### Monitoring Guidelines
1. **Health Checks**: Implement comprehensive health checks
2. **Performance Metrics**: Track key performance indicators
3. **Alerting**: Set up appropriate alerts for critical issues
4. **Dashboard**: Create monitoring dashboards for system visibility
5. **Incident Response**: Have clear incident response procedures

## Configuration

### Environment Variables
```bash
# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/benchwarmers

# Monitoring
SENTRY_DSN=https://...
HEALTH_CHECK_INTERVAL=30000

# Performance
SLOW_REQUEST_THRESHOLD=1000
MEMORY_ALERT_THRESHOLD=512
```

### Log Rotation
```bash
# logrotate configuration
/var/log/benchwarmers/*.log {
  daily
  rotate 30
  compress
  delaycompress
  missingok
  notifempty
  create 644 app app
  postrotate
    systemctl reload benchwarmers
  endscript
}
```

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Maintainer**: Platform Team
