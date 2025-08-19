import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security configuration
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // requests per window
    authMaxRequests: 5, // for auth endpoints
    matchingMaxRequests: 10 // for matching endpoints
  },
  cors: {
    allowedOrigins: [
      'https://benchwarmers.co.za',
      'https://www.benchwarmers.co.za',
      'https://app.benchwarmers.co.za',
      'http://localhost:3000' // Remove in production
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-company-id']
  },
  security: {
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const path = request.nextUrl.pathname
  const now = Date.now()
  
  // Determine rate limit based on endpoint
  let maxRequests = SECURITY_CONFIG.rateLimit.maxRequests
  if (path.startsWith('/api/auth/')) {
    maxRequests = SECURITY_CONFIG.rateLimit.authMaxRequests
  } else if (path.includes('/matching')) {
    maxRequests = SECURITY_CONFIG.rateLimit.matchingMaxRequests
  }

  const key = `${ip}:${path}`
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    // Reset window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.rateLimit.windowMs
    })
    return null
  }

  if (current.count >= maxRequests) {
    logger.warn('Rate limit exceeded', {
      ip,
      path,
      count: current.count,
      maxRequests
    })

    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - current.count).toString(),
          'X-RateLimit-Reset': current.resetTime.toString()
        }
      }
    )
  }

  // Increment counter
  current.count++
  rateLimitStore.set(key, current)
  return null
}

/**
 * CORS middleware
 */
export function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  const method = request.method

  // Handle preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    
    if (origin && SECURITY_CONFIG.cors.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Methods', SECURITY_CONFIG.cors.allowedMethods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', SECURITY_CONFIG.cors.allowedHeaders.join(', '))
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    
    return response
  }

  return null
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.paystack.co https://api.pusher.com",
    "frame-src https://js.paystack.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  // HTTPS enforcement
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

/**
 * Input validation middleware
 */
export function validateInput(request: NextRequest): NextResponse | null {
  const contentLength = request.headers.get('content-length')
  
  // Check body size
  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.security.maxBodySize) {
    logger.warn('Request body too large', {
      contentLength: parseInt(contentLength),
      maxSize: SECURITY_CONFIG.security.maxBodySize,
      path: request.nextUrl.pathname
    })

    return new NextResponse(
      JSON.stringify({ error: 'Request body too large' }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type')
    
    if (!contentType) {
      return new NextResponse(
        JSON.stringify({ error: 'Content-Type header required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Allow JSON and form data
    const allowedContentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ]

    const isValidContentType = allowedContentTypes.some(type => 
      contentType.toLowerCase().includes(type)
    )

    if (!isValidContentType) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid content type' }),
        {
          status: 415,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  return null
}

/**
 * SQL injection prevention
 */
export function preventSQLInjection(request: NextRequest): NextResponse | null {
  const url = request.nextUrl
  const searchParams = url.searchParams
  
  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/gi,
    /((\%3D)|(=))[^\n]*((\%27)|(\\x27)|(\')|(\\x22)|("))/gi,
    /((\\x3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/gi,
    /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/gi
  ]

  // Check URL parameters
  for (const [key, value] of searchParams.entries()) {
    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        logger.warn('Potential SQL injection attempt', {
          ip: request.ip || request.headers.get('x-forwarded-for'),
          path: request.nextUrl.pathname,
          parameter: key,
          value: value.substring(0, 100) // Log first 100 chars only
        })

        return new NextResponse(
          JSON.stringify({ error: 'Invalid request parameters' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
  }

  return null
}

/**
 * XSS prevention
 */
export function preventXSS(request: NextRequest): NextResponse | null {
  const url = request.nextUrl
  const searchParams = url.searchParams
  
  // Common XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi
  ]

  // Check URL parameters
  for (const [key, value] of searchParams.entries()) {
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        logger.warn('Potential XSS attempt', {
          ip: request.ip || request.headers.get('x-forwarded-for'),
          path: request.nextUrl.pathname,
          parameter: key,
          value: value.substring(0, 100)
        })

        return new NextResponse(
          JSON.stringify({ error: 'Invalid request parameters' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
  }

  return null
}

/**
 * File upload validation
 */
export function validateFileUpload(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get('content-type')
  
  if (contentType && contentType.includes('multipart/form-data')) {
    // This would be handled by the specific file upload endpoints
    // Here we just ensure the content length is within limits
    const contentLength = request.headers.get('content-length')
    
    if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.security.maxFileSize) {
      return new NextResponse(
        JSON.stringify({ error: 'File too large' }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  return null
}

/**
 * Brute force protection
 */
const bruteForceStore = new Map<string, { attempts: number; lastAttempt: number; blocked: boolean }>()

export function preventBruteForce(request: NextRequest): NextResponse | null {
  // Only apply to auth endpoints
  if (!request.nextUrl.pathname.startsWith('/api/auth/')) {
    return null
  }

  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const key = `brute_force:${ip}`
  
  const current = bruteForceStore.get(key)
  
  if (current && current.blocked && (now - current.lastAttempt) < 15 * 60 * 1000) {
    // Still blocked (15 minutes)
    logger.warn('IP blocked due to brute force attempts', { ip })
    
    return new NextResponse(
      JSON.stringify({ error: 'Too many failed attempts. Try again later.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  if (current && (now - current.lastAttempt) > 60 * 60 * 1000) {
    // Reset after 1 hour
    bruteForceStore.delete(key)
  }

  return null
}

/**
 * Log failed authentication attempt
 */
export function logFailedAuth(ip: string) {
  const key = `brute_force:${ip}`
  const now = Date.now()
  const current = bruteForceStore.get(key) || { attempts: 0, lastAttempt: now, blocked: false }
  
  current.attempts++
  current.lastAttempt = now
  
  if (current.attempts >= 5) {
    current.blocked = true
    logger.warn('IP blocked due to multiple failed auth attempts', {
      ip,
      attempts: current.attempts
    })
  }
  
  bruteForceStore.set(key, current)
}

/**
 * Main security middleware
 */
export function securityMiddleware(request: NextRequest): NextResponse {
  try {
    // Skip security for health check
    if (request.nextUrl.pathname === '/api/health') {
      return NextResponse.next()
    }

    // Rate limiting
    const rateLimitResponse = rateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // CORS handling
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Input validation
    const inputValidationResponse = validateInput(request)
    if (inputValidationResponse) return inputValidationResponse

    // SQL injection prevention
    const sqlInjectionResponse = preventSQLInjection(request)
    if (sqlInjectionResponse) return sqlInjectionResponse

    // XSS prevention
    const xssResponse = preventXSS(request)
    if (xssResponse) return xssResponse

    // File upload validation
    const fileUploadResponse = validateFileUpload(request)
    if (fileUploadResponse) return fileUploadResponse

    // Brute force protection
    const bruteForceResponse = preventBruteForce(request)
    if (bruteForceResponse) return bruteForceResponse

    // Continue to the API route
    const response = NextResponse.next()

    // Add security headers
    return addSecurityHeaders(response)

  } catch (error) {
    logger.error('Security middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.pathname
    })

    return new NextResponse(
      JSON.stringify({ error: 'Security validation failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export { SECURITY_CONFIG }
