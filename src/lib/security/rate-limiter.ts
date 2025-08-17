import { logInfo, logError } from '@/lib/errors'
import { ApiError } from '@/lib/api-error'
import { NextRequest } from 'next/server'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  totalRequests: number
}

// In-memory store for rate limiting (use Redis in production)
class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>()

  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store.get(key)
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry
  }

  set(key: string, count: number, resetTime: number): void {
    this.store.set(key, { count, resetTime })
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now()
    const entry = this.get(key)
    
    if (!entry) {
      const resetTime = now + windowMs
      this.set(key, 1, resetTime)
      return { count: 1, resetTime }
    }
    
    const newCount = entry.count + 1
    this.set(key, newCount, entry.resetTime)
    return { count: newCount, resetTime: entry.resetTime }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }
}

export class RateLimiter {
  private store = new MemoryStore()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.store.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator ? 
      config.keyGenerator(request) : 
      this.getDefaultKey(request)

    const entry = this.store.increment(key, config.windowMs)
    
    const allowed = entry.count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - entry.count)
    const resetTime = new Date(entry.resetTime)

    if (!allowed) {
      logInfo('Rate limit exceeded', {
        key,
        count: entry.count,
        maxRequests: config.maxRequests,
        resetTime
      })
    }

    return {
      allowed,
      remaining,
      resetTime,
      totalRequests: entry.count
    }
  }

  /**
   * Generate default rate limit key from request
   */
  private getDefaultKey(request: NextRequest): string {
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const path = new URL(request.url).pathname
    
    // Combine IP and path for more granular limiting
    return `${ip}:${path}`
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    if (realIP) {
      return realIP
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP
    }
    
    return 'unknown'
  }

  /**
   * Create rate limit middleware
   */
  createMiddleware(config: RateLimitConfig) {
    return async (request: NextRequest) => {
      const result = await this.checkLimit(request, config)
      
      if (!result.allowed) {
        throw new ApiError(
          429,
          'RATE_LIMIT_EXCEEDED',
          config.message || 'Too many requests',
          {
            remaining: result.remaining,
            resetTime: result.resetTime,
            totalRequests: result.totalRequests
          }
        )
      }
      
      return result
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests, please try again later'
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again later'
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Too many file uploads, please try again later'
  },

  // Admin endpoints
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
    message: 'Too many admin requests, please try again later'
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later'
  },

  // Email sending
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Too many emails sent, please try again later'
  },

  // SMS sending
  sms: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many SMS messages sent, please try again later'
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter()

// Helper function to apply rate limiting to API routes
export async function applyRateLimit(
  request: NextRequest,
  configName: keyof typeof rateLimitConfigs
): Promise<RateLimitResult> {
  const config = rateLimitConfigs[configName]
  return await rateLimiter.checkLimit(request, config)
}
