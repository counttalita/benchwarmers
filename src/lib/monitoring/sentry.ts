import * as Sentry from '@sentry/nextjs'
import logger from '../logger'

// Initialize Sentry
export function initSentry() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
    })
  }
}

/**
 * Captures an exception in Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context
    })
  }
  
  logger.error('Exception captured', { error: error.message, ...context })
}

/**
 * Captures a message in Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, {
      level,
      extra: context
    })
  }
  
  logger.info(message, context)
}

/**
 * Sets user context in Sentry
 */
export function setUserContext(user: { id: string; email: string; role: string }) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role
    })
  }
}

/**
 * Sets extra context in Sentry
 */
export function setExtraContext(key: string, value: any) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setExtra(key, value)
  }
}

/**
 * Sets tag in Sentry
 */
export function setTag(key: string, value: string) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setTag(key, value)
  }
}

/**
 * Creates a performance transaction
 */
export function startTransaction(name: string, operation: string) {
  // Placeholder for performance tracking
  return null
}

/**
 * Adds breadcrumb to Sentry
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb(breadcrumb)
  }
}

/**
 * Wraps a function with Sentry error tracking
 */
export function withSentry<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          captureException(error, context)
          throw error
        })
      }
      return result
    } catch (error) {
      captureException(error as Error, context)
      throw error
    }
  }) as T
}

/**
 * Wraps an async function with Sentry error tracking
 */
export function withSentryAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: Parameters<T>) => {
    return fn(...args).catch((error: Error) => {
      captureException(error, context)
      throw error
    })
  }) as T
}

/**
 * Creates a Sentry span for performance tracking
 */
export function createSpan(name: string, operation: string) {
  // Placeholder for performance tracking
  return null
}

/**
 * Flushes Sentry events
 */
export async function flushSentry(timeout?: number): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    return Sentry.flush(timeout)
  }
  return true
}

export { Sentry }
