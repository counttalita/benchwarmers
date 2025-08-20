import { NextRequest, NextResponse } from 'next/server'
// import { logRequest, logSecurity } from '@/lib/logger'

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  // logRequest(request, startTime)

  // Add request ID to headers for tracing
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  response.headers.set('x-request-id', requestId)

  // Security logging for sensitive endpoints
  const sensitiveEndpoints = [
    '/api/auth/',
    '/api/payments/',
    '/api/admin/',
    '/api/companies/register',
  ]

  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
    request.nextUrl.pathname.startsWith(endpoint)
  )

  if (isSensitiveEndpoint) {
    // logSecurity('Sensitive endpoint accessed', {
    //   endpoint: request.nextUrl.pathname,
    //   method: request.method,
    //   ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    //   userAgent: request.headers.get('user-agent'),
    // })
  }

  // Rate limiting check (basic implementation)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  // In a real implementation, you'd use Redis or similar for rate limiting
  // For now, we'll just log the request
  if (request.method !== 'GET') {
    // logSecurity('Non-GET request', {
    //   method: request.method,
    //   endpoint: request.nextUrl.pathname,
    //   ip: clientIp,
    // })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}