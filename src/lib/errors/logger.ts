import { AppError, ErrorSeverity } from './types'
import { formatErrorForLogging, shouldAlert } from './utils'

// Logger interface for different environments
export interface Logger {
  debug(message: string, context?: Record<string, any>): void
  info(message: string, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  error(message: string, context?: Record<string, any>): void
  critical(message: string, context?: Record<string, any>): void
}

// Console logger for development
class ConsoleLogger implements Logger {
  debug(message: string, context?: Record<string, any>): void {
    console.debug('🐛 [DEBUG]', message, context || '')
  }

  info(message: string, context?: Record<string, any>): void {
    console.info('ℹ️ [INFO]', message, context || '')
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn('⚠️ [WARN]', message, context || '')
  }

  error(message: string, context?: Record<string, any>): void {
    console.error('❌ [ERROR]', message, context || '')
  }

  critical(message: string, context?: Record<string, any>): void {
    console.error('🚨 [CRITICAL]', message, context || '')
  }
}

// Production logger (can be extended to use external services)
class ProductionLogger implements Logger {
  debug(message: string, context?: Record<string, any>): void {
    // In production, debug logs might be disabled or sent to a different service
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message, context)
    }
  }

  info(message: string, context?: Record<string, any>): void {
    console.log('[INFO]', message, context ? JSON.stringify(context) : '')
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn('[WARN]', message, context ? JSON.stringify(context) : '')
  }

  error(message: string, context?: Record<string, any>): void {
    console.error('[ERROR]', message, context ? JSON.stringify(context) : '')
    // In production, you might want to send this to an external service
    this.sendToExternalService('error', message, context)
  }

  critical(message: string, context?: Record<string, any>): void {
    console.error('[CRITICAL]', message, context ? JSON.stringify(context) : '')
    // Critical errors should always be sent to external monitoring
    this.sendToExternalService('critical', message, context)
  }

  private sendToExternalService(level: string, message: string, context?: Record<string, any>): void {
    // Placeholder for external logging service integration
    // Examples: Sentry, LogRocket, DataDog, etc.
    try {
      // Example: Sentry.captureException(error)
      // Example: LogRocket.captureException(error)
      // For now, we'll just prepare the data structure
      const logData = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version
      }
      
      // In a real implementation, you'd send this to your logging service
      if (process.env.NODE_ENV === 'development') {
        console.log('📤 Would send to external service:', logData)
      }
    } catch (err) {
      // Fallback: don't let logging errors break the application
      console.error('Failed to send log to external service:', err)
    }
  }
}

// Logger factory
function createLogger(): Logger {
  return process.env.NODE_ENV === 'production' 
    ? new ProductionLogger() 
    : new ConsoleLogger()
}

// Global logger instance
export const logger = createLogger()

// Error logging utilities
export class ErrorLogger {
  private static instance: ErrorLogger
  private logger: Logger

  private constructor() {
    this.logger = createLogger()
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  // Log an AppError with appropriate level
  logError(error: AppError, additionalContext?: Record<string, any>): void {
    const logData = {
      ...formatErrorForLogging(error),
      ...additionalContext
    }

    switch (error.severity) {
      case ErrorSeverity.LOW:
        this.logger.info(`Error: ${error.message}`, logData)
        break
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`Error: ${error.message}`, logData)
        break
      case ErrorSeverity.HIGH:
        this.logger.error(`Error: ${error.message}`, logData)
        break
      case ErrorSeverity.CRITICAL:
        this.logger.critical(`Critical Error: ${error.message}`, logData)
        break
      default:
        this.logger.error(`Error: ${error.message}`, logData)
    }

    // Send alerts for high severity errors
    if (shouldAlert(error)) {
      this.sendAlert(error, additionalContext)
    }
  }

  // Log multiple errors
  logErrors(errors: AppError[], context?: Record<string, any>): void {
    errors.forEach(error => this.logError(error, context))
  }

  // Log API request/response for debugging
  logApiCall(
    method: string, 
    url: string, 
    status: number, 
    duration: number,
    error?: AppError
  ): void {
    const logData = {
      method,
      url,
      status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }

    if (error) {
      this.logger.error(`API Error: ${method} ${url}`, {
        ...logData,
        error: formatErrorForLogging(error)
      })
    } else if (status >= 400) {
      this.logger.warn(`API Warning: ${method} ${url}`, logData)
    } else {
      this.logger.debug(`API Success: ${method} ${url}`, logData)
    }
  }

  // Log user actions for audit trail
  logUserAction(
    userId: string,
    action: string,
    resource?: string,
    success: boolean = true,
    error?: AppError
  ): void {
    const logData = {
      userId,
      action,
      resource,
      success,
      timestamp: new Date().toISOString()
    }

    if (error) {
      this.logger.warn(`User Action Failed: ${action}`, {
        ...logData,
        error: formatErrorForLogging(error)
      })
    } else {
      this.logger.info(`User Action: ${action}`, logData)
    }
  }

  // Send alert for critical errors
  private sendAlert(error: AppError, context?: Record<string, any>): void {
    // Placeholder for alert system integration
    // Examples: Slack webhook, email notification, PagerDuty, etc.
    const alertData = {
      error: formatErrorForLogging(error),
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 ALERT:', alertData)
    }

    // In production, you might want to:
    // - Send to Slack: await sendSlackAlert(alertData)
    // - Send email: await sendEmailAlert(alertData)
    // - Trigger PagerDuty: await triggerPagerDuty(alertData)
  }
}

// Convenience functions
const errorLoggerInstance = ErrorLogger.getInstance()

export { errorLoggerInstance as errorLogger }

export function logError(error: AppError, context?: Record<string, any>): void {
  errorLoggerInstance.logError(error, context)
}

export function logApiCall(
  method: string, 
  url: string, 
  status: number, 
  duration: number,
  error?: AppError
): void {
  errorLoggerInstance.logApiCall(method, url, status, duration, error)
}

export function logUserAction(
  userId: string,
  action: string,
  resource?: string,
  success: boolean = true,
  error?: AppError
): void {
  errorLoggerInstance.logUserAction(userId, action, resource, success, error)
}
