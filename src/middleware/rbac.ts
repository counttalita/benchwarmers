import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createError, logError } from '@/lib/errors'

export type UserRole = 'provider' | 'seeker' | 'admin'
export type Permission = 
  | 'view_offers' 
  | 'create_offers' 
  | 'manage_company' 
  | 'approve_companies'
  | 'manage_users'
  | 'view_analytics'
  | 'manage_payments'
  | 'send_notifications'

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  provider: [
    'view_offers',
    'manage_company'
  ],
  seeker: [
    'view_offers',
    'create_offers',
    'manage_company',
    'manage_payments'
  ],
  admin: [
    'view_offers',
    'create_offers',
    'manage_company',
    'approve_companies',
    'manage_users',
    'view_analytics',
    'manage_payments',
    'send_notifications'
  ]
}

// Route-based permission requirements
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/api/offers': ['view_offers'],
  '/api/offers/create': ['create_offers'],
  '/api/companies/approve': ['approve_companies'],
  '/api/admin': ['approve_companies'],
  '/api/users': ['manage_users'],
  '/api/analytics': ['view_analytics'],
  '/api/payments': ['manage_payments'],
  '/api/notifications': ['send_notifications']
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  companyId?: string
  isEmailVerified: boolean
  is2FAEnabled: boolean
  permissions: Permission[]
}

export async function withRoleAuth(
  request: NextRequest,
  requiredPermissions: Permission[] = []
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    const user: AuthenticatedUser = {
      id: token.sub as string,
      email: token.email as string,
      role: (token.role as UserRole) || 'provider',
      companyId: token.companyId as string,
      isEmailVerified: token.isEmailVerified as boolean || false,
      is2FAEnabled: token.is2FAEnabled as boolean || false,
      permissions: ROLE_PERMISSIONS[token.role as UserRole] || []
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Email verification required' },
          { status: 403 }
        )
      }
    }

    // Check if 2FA is required for admin routes
    if (user.role === 'admin' && !user.is2FAEnabled) {
      const pathname = request.nextUrl.pathname
      if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
        return {
          user: null,
          error: NextResponse.json(
            { error: '2FA setup required for admin access' },
            { status: 403 }
          )
        }
      }
    }

    // Check required permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(permission => 
        user.permissions.includes(permission)
      )

      if (!hasPermission) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }
    }

    return { user, error: null }

  } catch (error) {
    const appError = createError.internal(
      'AUTH_MIDDLEWARE_ERROR',
      'Authentication middleware failed'
    )
    logError(appError, { error })

    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

export function getRequiredPermissions(pathname: string): Permission[] {
  // Check exact matches first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname]
  }

  // Check pattern matches
  for (const [route, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return permissions
    }
  }

  return []
}

export function hasPermission(user: AuthenticatedUser, permission: Permission): boolean {
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthenticatedUser, permissions: Permission[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission))
}

export function hasAllPermissions(user: AuthenticatedUser, permissions: Permission[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission))
}

// Middleware wrapper for API routes
export function requireAuth(requiredPermissions: Permission[] = []) {
  return async (request: NextRequest) => {
    const { user, error } = await withRoleAuth(request, requiredPermissions)
    
    if (error) {
      return error
    }

    // Add user to request headers for use in API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user!.id)
    requestHeaders.set('x-user-role', user!.role)
    requestHeaders.set('x-user-permissions', JSON.stringify(user!.permissions))
    
    if (user!.companyId) {
      requestHeaders.set('x-company-id', user!.companyId)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }
}

// Helper to extract user from request headers (for use in API routes)
export function getUserFromHeaders(request: NextRequest): AuthenticatedUser | null {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')
  const userPermissions = request.headers.get('x-user-permissions')
  const companyId = request.headers.get('x-company-id')

  if (!userId || !userRole) {
    return null
  }

  return {
    id: userId,
    email: '', // Not available in headers
    role: userRole as UserRole,
    companyId: companyId || undefined,
    isEmailVerified: true, // Assumed if passed middleware
    is2FAEnabled: false, // Not available in headers
    permissions: userPermissions ? JSON.parse(userPermissions) : []
  }
}
