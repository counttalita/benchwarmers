import { AppError, ErrorCategory, ErrorSeverity } from './types'

// Error factory functions for common error types
export const createError = {
  // Validation errors
  validation: (
    code: string = 'VALIDATION_ERROR',
    message: string = 'Validation failed',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    { 
      context,
      userMessage: 'Please check your input and try again.',
      retryable: false
    }
  ),

  // Authentication errors
  authentication: (
    code: string = 'AUTH_ERROR',
    message: string = 'Authentication failed',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.MEDIUM,
    { 
      context,
      userMessage: 'Please sign in and try again.',
      retryable: false
    }
  ),

  // Authorization errors
  authorization: (
    code: string = 'AUTHORIZATION_ERROR',
    message: string = 'Access denied',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.AUTHORIZATION,
    ErrorSeverity.MEDIUM,
    { 
      context,
      userMessage: 'You do not have permission to perform this action.',
      retryable: false
    }
  ),

  // Network errors
  network: (
    code: string = 'NETWORK_ERROR',
    message: string = 'Network request failed',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.NETWORK,
    ErrorSeverity.MEDIUM,
    { 
      context,
      userMessage: 'Network connection failed. Please check your internet connection.',
      retryable: true
    }
  ),

  // Server errors
  server: (
    code: string = 'SERVER_ERROR',
    message: string = 'Server error occurred',
    statusCode: number = 500,
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.SERVER,
    ErrorSeverity.HIGH,
    { 
      context,
      statusCode,
      userMessage: 'Server error occurred. Please try again later.',
      retryable: true
    }
  ),

  // Business logic errors
  business: (
    code: string = 'BUSINESS_ERROR',
    message: string = 'Business rule violation',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM,
    { 
      context,
      userMessage: message, // Business errors often have user-friendly messages
      retryable: false
    }
  ),

  // External service errors
  external: (
    code: string = 'EXTERNAL_SERVICE_ERROR',
    message: string = 'External service error',
    service?: string,
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorSeverity.MEDIUM,
    { 
      context: { ...context, service },
      userMessage: 'External service is temporarily unavailable. Please try again later.',
      retryable: true
    }
  ),

  // Database errors
  database: (
    code: string = 'DATABASE_ERROR',
    message: string = 'Database operation failed',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.DATABASE,
    ErrorSeverity.HIGH,
    { 
      context,
      userMessage: 'Data operation failed. Please try again.',
      retryable: true
    }
  ),

  // Rate limiting errors
  rateLimit: (
    code: string = 'RATE_LIMIT_ERROR',
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.CLIENT,
    ErrorSeverity.MEDIUM,
    { 
      context: { ...context, retryAfter },
      userMessage: 'Too many requests. Please wait and try again.',
      retryable: true
    }
  ),

  // Timeout errors
  timeout: (
    code: string = 'TIMEOUT_ERROR',
    message: string = 'Operation timed out',
    timeout?: number,
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.NETWORK,
    ErrorSeverity.MEDIUM,
    { 
      context: { ...context, timeout },
      userMessage: 'Request timed out. Please try again.',
      retryable: true
    }
  ),

  // Configuration errors
  config: (
    code: string = 'CONFIG_ERROR',
    message: string = 'Configuration error',
    context?: Record<string, any>
  ) => new AppError(
    code,
    message,
    ErrorCategory.SERVER,
    ErrorSeverity.HIGH,
    { 
      context,
      userMessage: 'System configuration error. Please contact support.',
      retryable: false
    }
  ),

  // Custom error factory
  custom: (
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      context?: Record<string, any>
      userMessage?: string
      retryable?: boolean
      statusCode?: number
      cause?: Error
    } = {}
  ) => new AppError(code, message, category, severity, options)
}

// Parse and normalize different error types
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('fetch')) {
      return createError.network(error.message)
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return createError.authentication(error.message)
    }
    
    if (error.message.includes('forbidden') || error.message.includes('403')) {
      return createError.authorization(error.message)
    }

    // Generic error conversion
    return createError.custom(
      'UNKNOWN_ERROR',
      error.message,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      { cause: error }
    )
  }

  // HTTP Response errors
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const httpError = error as { status: number; statusText?: string; message?: string }
    const message = httpError.message || httpError.statusText || `HTTP ${httpError.status} Error`
    
    if (httpError.status === 400) {
      return createError.validation(message)
    }
    if (httpError.status === 401) {
      return createError.authentication(message)
    }
    if (httpError.status === 403) {
      return createError.authorization(message)
    }
    if (httpError.status >= 500) {
      return createError.server('SERVER_ERROR', message, httpError.status)
    }
    
    return createError.custom(
      'HTTP_ERROR',
      message,
      ErrorCategory.CLIENT,
      ErrorSeverity.MEDIUM,
      { statusCode: httpError.status }
    )
  }

  // String errors
  if (typeof error === 'string') {
    return createError.custom(
      'STRING_ERROR',
      error,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.LOW
    )
  }

  // Unknown error type
  return createError.custom(
    'UNKNOWN_ERROR',
    'An unknown error occurred',
    ErrorCategory.UNKNOWN,
    ErrorSeverity.MEDIUM,
    { context: { originalError: error } }
  )
}

// Get user-friendly error message
export function getUserMessage(error: AppError): string {
  return error.userMessage || getDefaultUserMessage(error.category)
}

// Default user messages by category
function getDefaultUserMessage(category: ErrorCategory): string {
  const messages = {
    [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
    [ErrorCategory.AUTHENTICATION]: 'Please sign in to continue.',
    [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
    [ErrorCategory.NETWORK]: 'Network connection failed. Please check your internet connection.',
    [ErrorCategory.SERVER]: 'Something went wrong on our end. Please try again later.',
    [ErrorCategory.CLIENT]: 'There was a problem with your request. Please try again.',
    [ErrorCategory.BUSINESS_LOGIC]: 'This action cannot be completed at this time.',
    [ErrorCategory.EXTERNAL_SERVICE]: 'An external service is currently unavailable. Please try again later.',
    [ErrorCategory.DATABASE]: 'A database error occurred. Please try again later.',
    [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.'
  }
  
  return messages[category] || messages[ErrorCategory.UNKNOWN]
}

// Check if error is retryable
export function isRetryable(error: AppError): boolean {
  return error.retryable || false
}

// Get retry delay based on error type and attempt count
export function getRetryDelay(error: AppError, attempt: number): number {
  if (!isRetryable(error)) return 0
  
  // Exponential backoff with jitter
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, delay + jitter)
}

// Format error for logging
export function formatErrorForLogging(error: AppError): Record<string, any> {
  return {
    code: error.code,
    message: error.message,
    category: error.category,
    severity: error.severity,
    timestamp: error.timestamp.toISOString(),
    context: error.context,
    stack: error.stack,
    statusCode: error.statusCode,
    retryable: error.retryable
  }
}

// Sanitize error for client response (remove sensitive info)
export function sanitizeErrorForClient(error: AppError): Record<string, any> {
  return {
    code: error.code,
    message: getUserMessage(error),
    category: error.category,
    timestamp: error.timestamp.toISOString(),
    retryable: error.retryable,
    statusCode: error.statusCode
  }
}

// Group errors by category for bulk handling
export function groupErrorsByCategory(errors: AppError[]): Record<ErrorCategory, AppError[]> {
  return errors.reduce((groups, error) => {
    if (!groups[error.category]) {
      groups[error.category] = []
    }
    groups[error.category].push(error)
    return groups
  }, {} as Record<ErrorCategory, AppError[]>)
}

// Check if error should trigger an alert/notification
export function shouldAlert(error: AppError): boolean {
  return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
}

// Convert fetch response to AppError
export async function handleFetchError(response: Response): Promise<AppError> {
  let errorData: any
  
  try {
    errorData = await response.json()
  } catch {
    errorData = { message: response.statusText || 'Request failed' }
  }

  const message = errorData.error || errorData.message || `HTTP ${response.status} Error`
  
  if (response.status === 400) {
    return createError.validation(message, errorData.field, errorData.value)
  }
  if (response.status === 401) {
    return createError.authentication(message)
  }
  if (response.status === 403) {
    return createError.authorization(message)
  }
  if (response.status === 409) {
    return createError.business('CONFLICT', message)
  }
  if (response.status === 422) {
    return createError.validation('VALIDATION_ERROR', message)
  }
  if (response.status === 429) {
    return createError.rateLimit('RATE_LIMITED', message)
  }
  if (response.status >= 500) {
    return createError.server('SERVER_ERROR', message, response.status)
  }
  
  return createError.custom(
    'HTTP_ERROR',
    message,
    ErrorCategory.CLIENT,
    ErrorSeverity.MEDIUM,
    { statusCode: response.status }
  )
}

// ============================================================================
// COMPREHENSIVE ERROR UTILITIES FOR FUTURE NEEDS
// ============================================================================

// Error aggregation and batch processing
export class ErrorAggregator {
  private errors: AppError[] = []
  
  add(error: AppError | Error | string): void {
    this.errors.push(parseError(error))
  }
  
  addMultiple(errors: (AppError | Error | string)[]): void {
    errors.forEach(error => this.add(error))
  }
  
  getErrors(): AppError[] {
    return [...this.errors]
  }
  
  getErrorsByCategory(): Record<ErrorCategory, AppError[]> {
    return groupErrorsByCategory(this.errors)
  }
  
  getErrorsBySeverity(): Record<ErrorSeverity, AppError[]> {
    return this.errors.reduce((groups, error) => {
      if (!groups[error.severity]) {
        groups[error.severity] = []
      }
      groups[error.severity].push(error)
      return groups
    }, {} as Record<ErrorSeverity, AppError[]>)
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0
  }
  
  hasCriticalErrors(): boolean {
    return this.errors.some(error => error.severity === ErrorSeverity.CRITICAL)
  }
  
  clear(): void {
    this.errors = []
  }
  
  summary(): string {
    const counts = this.getErrorsBySeverity()
    const parts = Object.entries(counts).map(([severity, errors]) => 
      `${severity}: ${errors.length}`
    )
    return `Errors: ${this.errors.length} (${parts.join(', ')})`
  }
}

// Error context enrichment
export function enrichErrorContext(
  error: AppError, 
  additionalContext: Record<string, any>
): AppError {
  return new AppError(
    error.code,
    error.message,
    error.category,
    error.severity,
    {
      context: { ...error.context, ...additionalContext },
      userMessage: error.userMessage,
      retryable: error.retryable,
      statusCode: error.statusCode,
      cause: error.cause instanceof Error ? error.cause : undefined
    }
  )
}

// Error transformation utilities
export function transformError(
  error: AppError,
  transformer: (error: AppError) => Partial<AppError>
): AppError {
  const transformed = transformer(error)
  return new AppError(
    transformed.code || error.code,
    transformed.message || error.message,
    transformed.category || error.category,
    transformed.severity || error.severity,
    {
      context: { ...error.context, ...transformed.context },
      userMessage: transformed.userMessage || error.userMessage,
      retryable: transformed.retryable !== undefined ? transformed.retryable : error.retryable,
      statusCode: transformed.statusCode || error.statusCode,
      cause: (transformed.cause instanceof Error ? transformed.cause : 
              error.cause instanceof Error ? error.cause : undefined)
    }
  )
}

// Error filtering utilities
export function filterErrors(
  errors: AppError[],
  predicate: (error: AppError) => boolean
): AppError[] {
  return errors.filter(predicate)
}

export function filterBySeverity(
  errors: AppError[],
  severity: ErrorSeverity
): AppError[] {
  return filterErrors(errors, error => error.severity === severity)
}

export function filterByCategory(
  errors: AppError[],
  category: ErrorCategory
): AppError[] {
  return filterErrors(errors, error => error.category === category)
}

export function filterRetryableErrors(errors: AppError[]): AppError[] {
  return filterErrors(errors, error => isRetryable(error))
}

// Error deduplication
export function deduplicateErrors(errors: AppError[]): AppError[] {
  const seen = new Set<string>()
  return errors.filter(error => {
    const key = `${error.code}:${error.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Error sorting utilities
export function sortErrorsBySeverity(errors: AppError[]): AppError[] {
  const severityOrder = {
    [ErrorSeverity.CRITICAL]: 0,
    [ErrorSeverity.HIGH]: 1,
    [ErrorSeverity.MEDIUM]: 2,
    [ErrorSeverity.LOW]: 3
  }
  
  return [...errors].sort((a, b) => 
    severityOrder[a.severity] - severityOrder[b.severity]
  )
}

export function sortErrorsByTimestamp(errors: AppError[]): AppError[] {
  return [...errors].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  )
}

// Error validation utilities
export function validateErrorStructure(error: any): error is AppError {
  return error instanceof AppError ||
    (typeof error === 'object' &&
     error !== null &&
     typeof error.code === 'string' &&
     typeof error.message === 'string' &&
     typeof error.category === 'string' &&
     typeof error.severity === 'string')
}

// Error serialization utilities
export function serializeError(error: AppError): string {
  return JSON.stringify(formatErrorForLogging(error))
}

export function deserializeError(serialized: string): AppError {
  const data = JSON.parse(serialized)
  return new AppError(
    data.code,
    data.message,
    data.category,
    data.severity,
    {
      context: data.context,
      userMessage: data.userMessage,
      retryable: data.retryable,
      statusCode: data.statusCode,
      cause: data.cause
    }
  )
}

// Error comparison utilities
export function errorsEqual(error1: AppError, error2: AppError): boolean {
  return error1.code === error2.code &&
         error1.message === error2.message &&
         error1.category === error2.category &&
         error1.severity === error2.severity
}

export function findSimilarErrors(
  target: AppError,
  errors: AppError[],
  threshold: number = 0.8
): AppError[] {
  return errors.filter(error => {
    const similarity = calculateErrorSimilarity(target, error)
    return similarity >= threshold
  })
}

function calculateErrorSimilarity(error1: AppError, error2: AppError): number {
  let score = 0
  let factors = 0
  
  // Code similarity
  if (error1.code === error2.code) score += 0.4
  factors += 0.4
  
  // Category similarity
  if (error1.category === error2.category) score += 0.3
  factors += 0.3
  
  // Message similarity (simple word overlap)
  const words1 = error1.message.toLowerCase().split(/\s+/)
  const words2 = error2.message.toLowerCase().split(/\s+/)
  const overlap = words1.filter(word => words2.includes(word)).length
  const messageSimilarity = overlap / Math.max(words1.length, words2.length)
  score += messageSimilarity * 0.3
  factors += 0.3
  
  return score / factors
}

// Error statistics utilities
export function getErrorStatistics(errors: AppError[]): {
  total: number
  bySeverity: Record<ErrorSeverity, number>
  byCategory: Record<ErrorCategory, number>
  retryable: number
  nonRetryable: number
  averageAge: number
  oldestError: AppError | null
  newestError: AppError | null
} {
  if (errors.length === 0) {
    return {
      total: 0,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byCategory: {} as Record<ErrorCategory, number>,
      retryable: 0,
      nonRetryable: 0,
      averageAge: 0,
      oldestError: null,
      newestError: null
    }
  }

  const now = new Date()
  const ages = errors.map(error => now.getTime() - error.timestamp.getTime())
  const sortedByTime = sortErrorsByTimestamp(errors)
  
  return {
    total: errors.length,
    bySeverity: errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<ErrorSeverity, number>),
    byCategory: errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<ErrorCategory, number>),
    retryable: errors.filter(isRetryable).length,
    nonRetryable: errors.filter(error => !isRetryable(error)).length,
    averageAge: ages.reduce((sum, age) => sum + age, 0) / ages.length,
    oldestError: sortedByTime[sortedByTime.length - 1],
    newestError: sortedByTime[0]
  }
}

// Error pattern detection
export function detectErrorPatterns(errors: AppError[]): {
  frequentCodes: Array<{ code: string; count: number }>
  errorBursts: Array<{ start: Date; end: Date; count: number }>
  categoryTrends: Record<ErrorCategory, number[]>
} {
  // Frequent error codes
  const codeCounts = errors.reduce((acc, error) => {
    acc[error.code] = (acc[error.code] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const frequentCodes = Object.entries(codeCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  // Error bursts (simplified - groups errors within 5-minute windows)
  const sortedErrors = sortErrorsByTimestamp(errors)
  const bursts: Array<{ start: Date; end: Date; count: number }> = []
  let currentBurst: { start: Date; end: Date; count: number } | null = null
  
  for (const error of sortedErrors) {
    if (currentBurst === null) {
      currentBurst = { start: error.timestamp, end: error.timestamp, count: 1 }
      continue
    }
    
    const timeDiff = error.timestamp.getTime() - currentBurst.end.getTime()
    if (timeDiff <= 5 * 60 * 1000) { // 5 minutes
      currentBurst.end = error.timestamp
      currentBurst.count++
    } else {
      // Save current burst if it has enough errors
      if (currentBurst.count >= 3) {
        bursts.push({ ...currentBurst })
      }
      // Start new burst
      currentBurst = { start: error.timestamp, end: error.timestamp, count: 1 }
    }
  }
  
  // Handle the final burst
  if (currentBurst !== null) {
    if (currentBurst.count >= 3) {
      bursts.push(currentBurst)
    }
  }
  
  return {
    frequentCodes,
    errorBursts: bursts,
    categoryTrends: {} as Record<ErrorCategory, number[]> // Placeholder for time-series analysis
  }
}

// Error recovery utilities
export function createRecoveryPlan(error: AppError): {
  canRecover: boolean
  steps: string[]
  estimatedTime: number
  requiresUserAction: boolean
} {
  const baseRecovery = {
    canRecover: isRetryable(error),
    steps: [],
    estimatedTime: 0,
    requiresUserAction: false
  }
  
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return {
        ...baseRecovery,
        steps: ['Check network connection', 'Retry request', 'Use cached data if available'],
        estimatedTime: getRetryDelay(error, 0),
        requiresUserAction: false
      }
    
    case ErrorCategory.AUTHENTICATION:
      return {
        ...baseRecovery,
        canRecover: true,
        steps: ['Refresh authentication token', 'Redirect to login if needed'],
        estimatedTime: 1000,
        requiresUserAction: true
      }
    
    case ErrorCategory.VALIDATION:
      return {
        ...baseRecovery,
        canRecover: true,
        steps: ['Show validation errors to user', 'Allow form correction'],
        estimatedTime: 0,
        requiresUserAction: true
      }
    
    default:
      return baseRecovery
  }
}

// Error reporting utilities
export function generateErrorReport(
  errors: AppError[],
  options: {
    includeStackTraces?: boolean
    includeSensitiveData?: boolean
    format?: 'json' | 'text' | 'html'
  } = {}
): string {
  const { includeStackTraces = false, includeSensitiveData = false, format = 'json' } = options
  
  const stats = getErrorStatistics(errors)
  const patterns = detectErrorPatterns(errors)
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: stats,
    patterns,
    errors: errors.map(error => 
      includeSensitiveData 
        ? formatErrorForLogging(error)
        : sanitizeErrorForClient(error)
    ).map(error => 
      includeStackTraces 
        ? error 
        : { ...error, stack: undefined }
    )
  }
  
  switch (format) {
    case 'text':
      return formatReportAsText(report)
    case 'html':
      return formatReportAsHTML(report)
    default:
      return JSON.stringify(report, null, 2)
  }
}

function formatReportAsText(report: any): string {
  return `Error Report - ${report.timestamp}
===========================================

Summary:
- Total Errors: ${report.summary.total}
- Critical: ${report.summary.bySeverity.critical || 0}
- High: ${report.summary.bySeverity.high || 0}
- Medium: ${report.summary.bySeverity.medium || 0}
- Low: ${report.summary.bySeverity.low || 0}

Most Frequent Error Codes:
${report.patterns.frequentCodes.map((item: any) => `- ${item.code}: ${item.count}`).join('\n')}

Error Details:
${report.errors.map((error: any, index: number) => 
  `${index + 1}. [${error.severity}] ${error.code}: ${error.message}`
).join('\n')}
`
}

function formatReportAsHTML(report: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Error Report - ${report.timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .error { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .critical { border-left-color: #d32f2f; }
        .high { border-left-color: #f57c00; }
        .medium { border-left-color: #fbc02d; }
        .low { border-left-color: #388e3c; }
    </style>
</head>
<body>
    <h1>Error Report</h1>
    <p><strong>Generated:</strong> ${report.timestamp}</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Errors:</strong> ${report.summary.total}</p>
        <ul>
            <li>Critical: ${report.summary.bySeverity.critical || 0}</li>
            <li>High: ${report.summary.bySeverity.high || 0}</li>
            <li>Medium: ${report.summary.bySeverity.medium || 0}</li>
            <li>Low: ${report.summary.bySeverity.low || 0}</li>
        </ul>
    </div>
    
    <h2>Error Details</h2>
    ${report.errors.map((error: any) => `
        <div class="error ${error.severity}">
            <strong>[${error.severity.toUpperCase()}] ${error.code}</strong><br>
            ${error.message}<br>
            <small>Category: ${error.category} | Time: ${error.timestamp}</small>
        </div>
    `).join('')}
</body>
</html>
`
}
