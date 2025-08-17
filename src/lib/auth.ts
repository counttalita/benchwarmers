import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { logger } from './logger'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'company' | 'talent'
  companyId?: string
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Company {
  id: string
  name: string
  domain: string
  status: 'pending' | 'active' | 'suspended' | 'rejected'
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TalentProfile {
  id: string
  userId: string
  title: string
  skills: string[]
  experience: number
  hourlyRate: number
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Gets the current user from the request headers
 */
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true
      }
    })

    if (!user || !user.isActive) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'company' | 'talent',
      companyId: user.companyId || undefined,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    logger.error(error as Error, 'Failed to get current user')
    return null
  }
}

/**
 * Gets the current company from the request headers
 */
export async function getCurrentCompany(request: NextRequest): Promise<Company | null> {
  try {
    const companyId = request.headers.get('x-company-id')
    
    if (!companyId) {
      return null
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company || company.status !== 'active') {
      return null
    }

    return {
      id: company.id,
      name: company.name,
      domain: company.domain,
      status: company.status as 'pending' | 'active' | 'suspended' | 'rejected',
      isVerified: company.isVerified,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    }
  } catch (error) {
    logger.error(error as Error, 'Failed to get current company')
    return null
  }
}

/**
 * Checks if the user is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getCurrentUser(request)
  return user !== null
}

/**
 * Checks if the user has a specific role
 */
export async function hasRole(request: NextRequest, role: 'admin' | 'company' | 'talent'): Promise<boolean> {
  const user = await getCurrentUser(request)
  return user?.role === role
}

/**
 * Checks if the user is an admin
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  return hasRole(request, 'admin')
}

/**
 * Checks if the user belongs to a company
 */
export async function belongsToCompany(request: NextRequest, companyId: string): Promise<boolean> {
  const user = await getCurrentUser(request)
  return user?.companyId === companyId
}

/**
 * Checks if the user owns a resource
 */
export async function ownsResource(request: NextRequest, resourceUserId: string): Promise<boolean> {
  const user = await getCurrentUser(request)
  return user?.id === resourceUserId
}

/**
 * Validates user permissions for a resource
 */
export async function validatePermissions(
  request: NextRequest,
  resourceUserId?: string,
  resourceCompanyId?: string
): Promise<{ hasAccess: boolean; user: User | null }> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return { hasAccess: false, user: null }
  }

  // Admins have access to everything
  if (user.role === 'admin') {
    return { hasAccess: true, user }
  }

  // Check if user owns the resource
  if (resourceUserId && user.id === resourceUserId) {
    return { hasAccess: true, user }
  }

  // Check if user belongs to the company that owns the resource
  if (resourceCompanyId && user.companyId === resourceCompanyId) {
    return { hasAccess: true, user }
  }

  return { hasAccess: false, user }
}

/**
 * Generates a JWT token for a user
 */
export async function generateToken(user: User): Promise<string> {
  // In a real implementation, you would use a JWT library
  // For now, we'll return a simple token
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }

  // This is a placeholder - in production, use a proper JWT library
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * Verifies a JWT token
 */
export async function verifyToken(token: string): Promise<User | null> {
  try {
    // This is a placeholder - in production, use a proper JWT library
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Token expired
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || !user.isActive) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'company' | 'talent',
      companyId: user.companyId || undefined,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    logger.error(error as Error, 'Failed to verify token')
    return null
  }
}

/**
 * Creates a new user
 */
export async function createUser(userData: {
  email: string
  name: string
  password: string
  role: 'admin' | 'company' | 'talent'
  companyId?: string
}): Promise<User> {
  // In a real implementation, you would hash the password
  const hashedPassword = userData.password // Placeholder

  const user = await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
      role: userData.role,
      companyId: userData.companyId,
      isVerified: false,
      isActive: true
    }
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'company' | 'talent',
    companyId: user.companyId || undefined,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

/**
 * Authenticates a user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.isActive) {
      return null
    }

    // In a real implementation, you would verify the password hash
    if (user.password !== password) { // Placeholder
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'company' | 'talent',
      companyId: user.companyId || undefined,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    logger.error(error as Error, 'Failed to authenticate user')
    return null
  }
}

/**
 * Updates user verification status
 */
export async function updateUserVerification(userId: string, isVerified: boolean): Promise<User | null> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isVerified }
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'company' | 'talent',
      companyId: user.companyId || undefined,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    logger.error(error as Error, 'Failed to update user verification')
    return null
  }
}

/**
 * Deactivates a user account
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })
    return true
  } catch (error) {
    logger.error(error as Error, 'Failed to deactivate user')
    return false
  }
}