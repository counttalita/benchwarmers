import { AppError, handleFetchError, logApiCall, logError } from '@/lib/errors'

// API client configuration
interface ApiConfig {
  baseUrl?: string
  timeout?: number
  retries?: number
  headers?: Record<string, string>
}

// Request options
interface RequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

// Response wrapper
interface ApiResponse<T = any> {
  data?: T
  error?: AppError
  status: number
  headers: Headers
}

// API client class with built-in error handling
export class ApiClient {
  private baseUrl: string
  private defaultTimeout: number
  private defaultRetries: number
  private defaultHeaders: Record<string, string>

  constructor(config: ApiConfig = {}) {
    this.baseUrl = config.baseUrl || ''
    this.defaultTimeout = config.timeout || 10000 // 10 seconds
    this.defaultRetries = config.retries || 3
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    }
  }

  // Main request method with error handling
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now()
    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || 'GET'

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    }

    let lastError: AppError | null = null
    const maxRetries = options.retries ?? this.defaultRetries
    const timeout = options.timeout ?? this.defaultTimeout

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        const duration = Date.now() - startTime

        if (!response.ok) {
          const error = await handleFetchError(response)
          lastError = error
          
          logApiCall(method, url, response.status, duration, error)

          // Don't retry client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            return { error, status: response.status, headers: response.headers }
          }

          // Retry for server errors and rate limits
          if (attempt < maxRetries) {
            const delay = this.getRetryDelay(attempt, error)
            await this.sleep(delay)
            continue
          }

          return { error, status: response.status, headers: response.headers }
        }

        // Success
        logApiCall(method, url, response.status, duration)
        
        let data: T
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text() as unknown as T
        }

        return { data, status: response.status, headers: response.headers }

      } catch (error) {
        const duration = Date.now() - startTime
        
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new AppError(
            'TIMEOUT_ERROR',
            `Request timeout after ${timeout}ms`,
            'network' as any,
            'medium' as any,
            { userMessage: 'Request timed out. Please try again.' }
          )
        } else {
          lastError = new AppError(
            'NETWORK_ERROR',
            error instanceof Error ? error.message : 'Network request failed',
            'network' as any,
            'medium' as any,
            { 
              userMessage: 'Network connection failed. Please check your internet connection.',
              retryable: true
            }
          )
        }

        logApiCall(method, url, 0, duration, lastError)

        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt, lastError)
          await this.sleep(delay)
          continue
        }
      }
    }

    return { 
      error: lastError || new AppError('UNKNOWN_ERROR', 'Request failed', 'unknown' as any), 
      status: 0, 
      headers: new Headers() 
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T = any>(endpoint: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T = any>(endpoint: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // Utility methods
  private getRetryDelay(attempt: number, error?: AppError): number {
    if (error && !error.retryable) return 0
    
    // Exponential backoff with jitter
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1)
    return Math.max(0, delay + jitter)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Update default headers (useful for auth tokens)
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  removeHeader(key: string): void {
    delete this.defaultHeaders[key]
  }

  // Set auth token
  setAuthToken(token: string): void {
    this.setHeader('Authorization', `Bearer ${token}`)
  }

  clearAuthToken(): void {
    this.removeHeader('Authorization')
  }
}

// Default API client instance
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
  retries: 3
})

// Typed API response handler
export async function handleApiResponse<T>(
  response: ApiResponse<T>
): Promise<T> {
  if (response.error) {
    logError(response.error)
    throw response.error
  }
  
  if (!response.data) {
    const error = new AppError(
      'NO_DATA_ERROR',
      'No data received from server',
      'server' as any,
      'medium' as any
    )
    logError(error)
    throw error
  }
  
  return response.data
}

// Wrapper for legacy fetch calls
export async function safeFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiClient.request<T>(url, options)
  return handleApiResponse(response)
}
