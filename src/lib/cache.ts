import { logger } from './logger'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  maxSize?: number // Maximum number of items in cache
}

export interface CacheItem<T = any> {
  key: string
  value: T
  expiresAt: number
  createdAt: number
  accessCount: number
  lastAccessed: number
}

export class Cache {
  private cache: Map<string, CacheItem> = new Map()
  private readonly ttl: number
  private readonly maxSize: number

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 300 // 5 minutes default
    this.maxSize = options.maxSize || 1000 // 1000 items default
  }

  /**
   * Sets a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.ttl) * 1000
    const now = Date.now()

    // Remove expired items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      key,
      value,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now
    })

    logger.debug('Cache set', { key, ttl: ttl || this.ttl })
  }

  /**
   * Gets a value from the cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    item.accessCount++
    item.lastAccessed = Date.now()

    logger.debug('Cache hit', { key })
    return item.value as T
  }

  /**
   * Checks if a key exists in the cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Deletes a key from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      logger.debug('Cache delete', { key })
    }
    return deleted
  }

  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.cache.clear()
    logger.debug('Cache cleared')
  }

  /**
   * Gets cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalHits: number
    totalMisses: number
  } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, item) => sum + item.accessCount, 0)
    const totalMisses = 0 // This would need to be tracked separately in a real implementation
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
      totalHits,
      totalMisses
    }
  }

  /**
   * Removes expired items from the cache
   */
  private cleanup(): void {
    const now = Date.now()
    let deletedCount = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    // If still over max size, remove least recently used items
    if (this.cache.size >= this.maxSize) {
      const items = Array.from(this.cache.entries())
      items.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
      
      const toDelete = items.slice(0, this.cache.size - this.maxSize + 1)
      toDelete.forEach(([key]) => {
        this.cache.delete(key)
        deletedCount++
      })
    }

    if (deletedCount > 0) {
      logger.debug('Cache cleanup', { deletedCount })
    }
  }
}

// Global cache instance
export const globalCache = new Cache()

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    const cached = globalCache.get<ReturnType<T>>(key)
    
    if (cached !== null) {
      return cached
    }

    const result = fn(...args)
    
    if (result instanceof Promise) {
      return result.then(value => {
        globalCache.set(key, value, ttl)
        return value
      })
    } else {
      globalCache.set(key, result, ttl)
      return result
    }
  }) as T
}

// Cache utilities for common patterns
export class CacheUtils {
  /**
   * Caches API responses
   */
  static async cachedApiCall<T>(
    key: string,
    apiCall: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = globalCache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await apiCall()
    globalCache.set(key, result, ttl)
    return result
  }

  /**
   * Caches database queries
   */
  static async cachedQuery<T>(
    key: string,
    query: () => Promise<T>,
    ttl: number = 60
  ): Promise<T> {
    return this.cachedApiCall(key, query, ttl)
  }

  /**
   * Invalidates cache by pattern
   */
  static invalidatePattern(pattern: string): number {
    let deletedCount = 0
    
    for (const key of globalCache['cache'].keys()) {
      if (key.includes(pattern)) {
        globalCache.delete(key)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Preloads data into cache
   */
  static async preload<T>(
    key: string,
    dataLoader: () => Promise<T>,
    ttl: number = 300
  ): Promise<void> {
    try {
      const data = await dataLoader()
      globalCache.set(key, data, ttl)
      logger.debug('Cache preloaded', { key })
    } catch (error) {
      logger.error(error as Error, 'Failed to preload cache', { key })
    }
  }

  /**
   * Gets multiple items from cache
   */
  static getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {}
    
    keys.forEach(key => {
      result[key] = globalCache.get<T>(key)
    })

    return result
  }

  /**
   * Sets multiple items in cache
   */
  static setMultiple<T>(items: Record<string, T>, ttl?: number): void {
    Object.entries(items).forEach(([key, value]) => {
      globalCache.set(key, value, ttl)
    })
  }
}

// Specialized caches for different use cases
export const userCache = new Cache({ ttl: 600, maxSize: 500 }) // 10 minutes
export const companyCache = new Cache({ ttl: 1800, maxSize: 200 }) // 30 minutes
export const talentProfileCache = new Cache({ ttl: 900, maxSize: 1000 }) // 15 minutes
export const matchingCache = new Cache({ ttl: 300, maxSize: 500 }) // 5 minutes
export const paymentCache = new Cache({ ttl: 60, maxSize: 100 }) // 1 minute

// Cache middleware for API routes
export function withCache<T extends (...args: any[]) => any>(
  fn: T,
  keyPrefix: string,
  ttl: number = 300
): T {
  return ((...args: Parameters<T>) => {
    const key = `${keyPrefix}:${JSON.stringify(args)}`
    return CacheUtils.cachedApiCall(key, () => fn(...args), ttl)
  }) as T
}
