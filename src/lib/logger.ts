import { createLogger, format, transports, Logger } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { Request } from 'next/server'

// Log levels configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Custom format for structured logging
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json(),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`
  })
)

// Console format for development
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaString}`
  })
)

// Create logger instance
const createAppLogger = (): Logger => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  const logger = createLogger({
    levels: logLevels,
    level: isDevelopment ? 'debug' : 'info',
    format: structuredFormat,
    defaultMeta: {
      service: 'benchwarmers-marketplace',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    },
    transports: [
      // Console transport for development
      ...(isDevelopment ? [
        new transports.Console({
          format: consoleFormat,
        })
      ] : []),

      // File transports for all environments
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: structuredFormat,
      }),

      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: structuredFormat,
      }),

      // Production-specific transports
      ...(isProduction ? [
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'warn',
          maxSize: '20m',
          maxFiles: '90d',
          format: structuredFormat,
        })
      ] : []),
    ],
    // Handle uncaught exceptions
    exceptionHandlers: [
      new DailyRotateFile({
        filename: 'logs/exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: structuredFormat,
      })
    ],
    // Handle unhandled promise rejections
    rejectionHandlers: [
      new DailyRotateFile({
        filename: 'logs/rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: structuredFormat,
      })
    ],
  })

  return logger
}

// Create the main logger instance
const logger = createAppLogger()

// Request context interface
interface RequestContext {
  method?: string
  url?: string
  ip?: string
  userAgent?: string
  userId?: string
  companyId?: string
  requestId?: string
  duration?: number
}

// Log metadata interface
interface LogMetadata {
  [key: string]: string | number | boolean | object | null | undefined
}

// Enhanced logger with request context
class AppLogger {
  private logger: Logger
  private context: RequestContext = {}

  constructor() {
    this.logger = logger
  }

  // Set request context
  setContext(context: RequestContext): void {
    this.context = { ...this.context, ...context }
  }

  // Clear context
  clearContext(): void {
    this.context = {}
  }

  // Log with context
  private logWithContext(level: string, message: string, meta?: LogMetadata): void {
    const logData = {
      ...this.context,
      ...meta,
    }
    this.logger.log(level, message, logData)
  }

  // Error logging
  error(message: string, error?: Error | unknown, meta?: LogMetadata): void {
    const errorData: LogMetadata = {
      ...meta,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    }
    this.logWithContext('error', message, errorData)
  }

  // Warning logging
  warn(message: string, meta?: LogMetadata): void {
    this.logWithContext('warn', message, meta)
  }

  // Info logging
  info(message: string, meta?: LogMetadata): void {
    this.logWithContext('info', message, meta)
  }

  // HTTP request logging
  http(message: string, meta?: LogMetadata): void {
    this.logWithContext('http', message, meta)
  }

  // Debug logging
  debug(message: string, meta?: LogMetadata): void {
    this.logWithContext('debug', message, meta)
  }

  // Security event logging
  security(event: string, meta?: LogMetadata): void {
    this.warn(`SECURITY: ${event}`, { ...meta, securityEvent: true })
  }

  // Authentication logging
  auth(action: string, userId?: string, meta?: LogMetadata): void {
    this.info(`AUTH: ${action}`, { ...meta, authAction: action, userId })
  }

  // Database operation logging
  db(operation: string, table?: string, meta?: LogMetadata): void {
    this.debug(`DB: ${operation}`, { ...meta, dbOperation: operation, table })
  }

  // API request logging
  api(method: string, endpoint: string, statusCode: number, duration: number, meta?: LogMetadata): void {
    const level = statusCode >= 400 ? 'warn' : 'info'
    this.logWithContext(level, `API: ${method} ${endpoint}`, {
      ...meta,
      apiRequest: true,
      method,
      endpoint,
      statusCode,
      duration,
    })
  }

  // Payment logging
  payment(action: string, amount?: number, currency?: string, meta?: LogMetadata): void {
    this.info(`PAYMENT: ${action}`, {
      ...meta,
      paymentAction: action,
      amount,
      currency,
    })
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: LogMetadata): void {
    const level = duration > 1000 ? 'warn' : 'debug'
    this.logWithContext(level, `PERFORMANCE: ${operation}`, {
      ...meta,
      performanceOperation: operation,
      duration,
    })
  }

  // Business logic logging
  business(action: string, entity?: string, meta?: LogMetadata): void {
    this.info(`BUSINESS: ${action}`, {
      ...meta,
      businessAction: action,
      entity,
    })
  }
}

// Create singleton instance
const appLogger = new AppLogger()

// Request logging middleware
export const logRequest = (req: Request, startTime: number = Date.now()) => {
  const url = new URL(req.url)
  const context: RequestContext = {
    method: req.method,
    url: url.pathname,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || generateRequestId(),
  }

  appLogger.setContext(context)
  appLogger.http(`Request started: ${req.method} ${url.pathname}`)

  return {
    end: (statusCode: number) => {
      const duration = Date.now() - startTime
      appLogger.api(req.method, url.pathname, statusCode, duration)
      appLogger.clearContext()
    },
    error: (error: Error, statusCode: number = 500) => {
      const duration = Date.now() - startTime
      appLogger.error(`Request failed: ${req.method} ${url.pathname}`, error, {
        statusCode,
        duration,
      })
      appLogger.clearContext()
    }
  }
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Error logging utilities
export const logError = (message: string, error?: Error | unknown, meta?: LogMetadata): void => {
  appLogger.error(message, error, meta)
}

export const logWarning = (message: string, meta?: LogMetadata): void => {
  appLogger.warn(message, meta)
}

export const logInfo = (message: string, meta?: LogMetadata): void => {
  appLogger.info(message, meta)
}

export const logDebug = (message: string, meta?: LogMetadata): void => {
  appLogger.debug(message, meta)
}

// Specialized logging functions
export const logSecurity = (event: string, meta?: LogMetadata): void => {
  appLogger.security(event, meta)
}

export const logAuth = (action: string, userId?: string, meta?: LogMetadata): void => {
  appLogger.auth(action, userId, meta)
}

export const logDb = (operation: string, table?: string, meta?: LogMetadata): void => {
  appLogger.db(operation, table, meta)
}

export const logApi = (method: string, endpoint: string, statusCode: number, duration: number, meta?: LogMetadata): void => {
  appLogger.api(method, endpoint, statusCode, duration, meta)
}

export const logPayment = (action: string, amount?: number, currency?: string, meta?: LogMetadata): void => {
  appLogger.payment(action, amount, currency, meta)
}

export const logPerformance = (operation: string, duration: number, meta?: LogMetadata): void => {
  appLogger.performance(operation, duration, meta)
}

export const logBusiness = (action: string, entity?: string, meta?: LogMetadata): void => {
  appLogger.business(action, entity, meta)
}

// Export the main logger instance
export default appLogger
