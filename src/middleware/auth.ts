import { withAuth } from "next-auth/middleware"
import { logAuth, logSecurity } from '@/lib/logger'

export default withAuth(
  function middleware(req) {
    // Log authentication events
    const token = req.nextauth.token
    const userId = token?.sub || 'unknown'
    
    logAuth('Route accessed', userId, {
      path: req.nextUrl.pathname,
      method: req.method,
      ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
    })

    // Additional security checks
    if (req.nextUrl.pathname.startsWith('/api/admin/')) {
      const userRole = token?.role || 'unknown'
      if (userRole !== 'admin') {
        logSecurity('Unauthorized admin access attempt', {
          userId,
          userRole,
          path: req.nextUrl.pathname,
          ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
        })
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true
        }
        
        // Require token for protected routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token
        }
        
        // Allow access to public routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*",
    "/api/admin/:path*",
  ]
}
