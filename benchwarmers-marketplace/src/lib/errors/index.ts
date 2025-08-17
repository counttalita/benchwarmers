// Main exports for the error handling system
export * from './types'
export * from './utils'
export * from './logger'

// Re-export commonly used items for convenience
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  ServerError,
  BusinessLogicError,
  ExternalServiceError,
  DatabaseError,
  ErrorCategory,
  ErrorSeverity
} from './types'

export {
  createError,
  parseError,
  getUserMessage,
  isRetryable,
  getRetryDelay,
  handleFetchError,
  sanitizeErrorForClient
} from './utils'

export {
  errorLogger,
  logError as logAppError,
  logApiCall as logAppApiCall,
  logUserAction as logAppUserAction
} from './logger'
