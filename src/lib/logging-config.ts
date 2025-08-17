export const loggingConfig = {
  // Log levels for different environments
  levels: {
    development: 'debug',
    test: 'warn',
    production: 'info',
  },

  // File rotation settings
  rotation: {
    maxSize: '20m',
    maxFiles: {
      error: '14d',
      combined: '30d',
      security: '90d',
      exceptions: '30d',
      rejections: '30d',
    },
  },

  // Performance thresholds
  performance: {
    slowQueryThreshold: 1000, // 1 second
    slowApiThreshold: 2000,   // 2 seconds
    criticalThreshold: 5000,  // 5 seconds
  },

  // Security logging settings
  security: {
    sensitiveEndpoints: [
      '/api/auth/',
      '/api/payments/',
      '/api/admin/',
      '/api/companies/register',
    ],
    rateLimitThreshold: 10, // requests per minute
  },

  // Database logging settings
  database: {
    logQueries: process.env.NODE_ENV === 'development',
    logSlowQueries: true,
    slowQueryThreshold: 1000,
  },

  // External service logging
  externalServices: {
    twilio: {
      logRequests: true,
      logResponses: process.env.NODE_ENV === 'development',
      logErrors: true,
    },
    stripe: {
      logRequests: true,
      logResponses: false, // Don't log payment data
      logErrors: true,
    },
  },

  // Request logging
  requests: {
    logAll: true,
    logHeaders: process.env.NODE_ENV === 'development',
    logBody: process.env.NODE_ENV === 'development',
    excludePaths: [
      '/_next/',
      '/favicon.ico',
      '/api/health',
    ],
  },

  // Error logging
  errors: {
    includeStack: true,
    includeContext: true,
    maxContextSize: 1000, // characters
  },
}

export default loggingConfig
