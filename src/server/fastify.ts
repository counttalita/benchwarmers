import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import rateLimit from '@fastify/rate-limit'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { createError, logError, logInfo, AppError } from '@/lib/errors'

// Types
interface RequestContext {
  correlationId: string
  userId?: string
  companyId?: string
  userRole?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    context: RequestContext
    prisma: PrismaClient
  }
}

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// Create Fastify server
export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      serializers: {
        req: (request: any) => ({
          method: request.method,
          url: request.url,
          correlationId: (request as { context?: { correlationId?: string } }).context?.correlationId,
          userId: (request as { context?: { userId?: string } }).context?.userId,
        }),
        res: (reply: any) => ({
          statusCode: reply.statusCode,
        }),
      },
    },
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
  })

  // Register plugins
  await registerPlugins(server)
  
  // Register middleware
  await registerMiddleware(server)
  
  // Register routes
  await registerRoutes(server)
  
  // Register error handlers
  registerErrorHandlers(server)

  return server
}

async function registerPlugins(server: FastifyInstance) {
  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })

  // CORS
  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://benchwarmers.app']
      : true,
    credentials: true,
  })

  // Rate limiting
  await server.register(rateLimit, {
    max: 100, // requests
    timeWindow: '1 minute',
    keyGenerator: (request: any) => {
      return request.context?.userId || request.ip
    },
    errorResponseBuilder: (request, context) => {
      return {
        error: 'Rate limit exceeded',
        message: `Too many requests, please try again in ${Math.round(context.ttl / 1000)} seconds`,
        statusCode: 429,
        correlationId: request.context?.correlationId,
      }
    },
  })
}

async function registerMiddleware(server: FastifyInstance) {
  // Request context middleware
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = request.headers['x-correlation-id'] as string || randomUUID()
    
    request.context = {
      correlationId,
    }

    // Add correlation ID to response headers
    reply.header('x-correlation-id', correlationId)
    
    // Attach Prisma client to request
    request.prisma = prisma

    logInfo('Request started', {
      method: request.method,
      url: request.url,
      correlationId,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    })
  })

  // Response logging middleware
  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = reply.elapsedTime
    
    logInfo('Request completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      correlationId: request.context.correlationId,
    })
  })

  // Authentication middleware (for protected routes)
  server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check and public routes
    if (request.url === '/health' || request.url.startsWith('/api/auth/')) {
      return
    }

    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError.authentication('MISSING_TOKEN', 'Authorization token required')
    }

    try {
      const token = authHeader.substring(7)
      // TODO: Implement JWT verification
      // For now, we'll extract user info from headers (set by middleware)
      const userId = request.headers['x-user-id'] as string
      const companyId = request.headers['x-company-id'] as string
      const userRole = request.headers['x-user-role'] as string

      if (userId) {
        request.context.userId = userId
        request.context.companyId = companyId
        request.context.userRole = userRole
      }
    } catch (error) {
      throw createError.authentication('INVALID_TOKEN', 'Invalid authorization token')
    }
  })
}

async function registerRoutes(server: FastifyInstance) {
  // Health check
  server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check database connection
      await request.prisma.$queryRaw`SELECT 1`
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        correlationId: request.context.correlationId,
      }
    } catch (error) {
      reply.code(503)
      return {
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
        correlationId: request.context.correlationId,
      }
    }
  })

  // API routes
  await server.register(async function (server) {
    // Companies routes
    await server.register(async function (server) {
      // Get all companies (admin only)
      server.get('/companies', async (request: FastifyRequest, reply: FastifyReply) => {
        if (request.context.userRole !== 'admin') {
          throw createError.authorization('INSUFFICIENT_PERMISSIONS', 'Admin access required')
        }

        const companies = await request.prisma.company.findMany({
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                phoneVerified: true,
              },
            },
            _count: {
              select: {
                talentProfiles: true,
                talentRequests: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        return {
          companies,
          total: companies.length,
          correlationId: request.context.correlationId,
        }
      })

      // Get company by ID
      server.get('/companies/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        
        // Users can only access their own company unless they're admin
        if (request.context.userRole !== 'admin' && request.context.companyId !== id) {
          throw createError.authorization('INSUFFICIENT_PERMISSIONS', 'Access denied')
        }

        const company = await request.prisma.company.findUnique({
          where: { id },
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                phoneVerified: true,
                createdAt: true,
              },
            },
            talentProfiles: {
              select: {
                id: true,
                name: true,
                title: true,
                seniorityLevel: true,
                rating: true,
                reviewCount: true,
                isVisible: true,
              },
            },
            talentRequests: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
          },
        })

        if (!company) {
          throw createError.notFound('COMPANY_NOT_FOUND', 'Company not found')
        }

        return {
          company,
          correlationId: request.context.correlationId,
        }
      })

      // Update company
      server.patch('/companies/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        const updateData = request.body as Record<string, unknown>

        // Users can only update their own company unless they're admin
        if (request.context.userRole !== 'admin' && request.context.companyId !== id) {
          throw createError.authorization('INSUFFICIENT_PERMISSIONS', 'Access denied')
        }

        // Validate update data
        const allowedFields = ['name', 'type']
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj: Record<string, unknown>, key) => {
            obj[key] = updateData[key]
            return obj
          }, {})

        if (Object.keys(filteredData).length === 0) {
          throw createError.validation('NO_VALID_FIELDS', 'No valid fields to update')
        }

        const company = await request.prisma.company.update({
          where: { id },
          data: {
            ...filteredData,
            updatedAt: new Date(),
          },
        })

        return {
          company,
          correlationId: request.context.correlationId,
        }
      })
    }, { prefix: '/api' })

    // Users routes
    await server.register(async function (server) {
      // Get users in company
      server.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = request.context.companyId
        
        if (!companyId) {
          throw createError.validation('MISSING_COMPANY_ID', 'Company ID required')
        }

        const users = await request.prisma.user.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            role: true,
            phoneVerified: true,
            lastLoginAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        return {
          users,
          total: users.length,
          correlationId: request.context.correlationId,
        }
      })

      // Get user by ID
      server.get('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string }
        
        const user = await request.prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            role: true,
            phoneVerified: true,
            lastLoginAt: true,
            createdAt: true,
            company: {
              select: {
                id: true,
                name: true,
                domain: true,
                type: true,
              },
            },
          },
        })

        if (!user) {
          throw createError.notFound('USER_NOT_FOUND', 'User not found')
        }

        // Users can only access their own data unless they're admin or same company
        if (
          request.context.userRole !== 'admin' && 
          request.context.userId !== id && 
          request.context.companyId !== user.company.id
        ) {
          throw createError.authorization('INSUFFICIENT_PERMISSIONS', 'Access denied')
        }

        return {
          user,
          correlationId: request.context.correlationId,
        }
      })
    }, { prefix: '/api' })
  })
}

function registerErrorHandlers(server: FastifyInstance) {
  // Global error handler
  server.setErrorHandler(async (error: Error & { code?: string; statusCode?: number }, request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = request.context?.correlationId || 'unknown'
    
    // Convert Fastify error to AppError for logging
    const appError = error.name === 'AppError' ? error : createError.internal(
      error.code || 'INTERNAL_ERROR',
      error.message || 'An unexpected error occurred',
      { statusCode: error.statusCode || 500 }
    )
    
    // Log the error
    logError(appError as AppError, {
      correlationId,
      method: request.method,
      url: request.url,
      userId: request.context?.userId,
      companyId: request.context?.companyId,
    })

    // Handle different error types
    if (error.name === 'AppError') {
      const appError = error as { code?: string; statusCode?: number; message: string }
      reply.code(appError.statusCode || 500)
      return {
        error: appError.code || 'UNKNOWN_ERROR',
        message: appError.message,
        statusCode: appError.statusCode || 500,
        correlationId,
      }
    }

    // Handle Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as { code: string; meta?: Record<string, unknown> }
      
      if (prismaError.code === 'P2002') {
        reply.code(409)
        return {
          error: 'DUPLICATE_ENTRY',
          message: 'A record with this data already exists',
          statusCode: 409,
          correlationId,
        }
      }
      
      if (prismaError.code === 'P2025') {
        reply.code(404)
        return {
          error: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
          statusCode: 404,
          correlationId,
        }
      }
    }

    // Handle validation errors
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: 'Request validation failed',
        details: error.validation,
      })
    }

    // Default error response
    reply.code(500)
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
      correlationId,
    }
  })

  // 404 handler
  server.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404)
    return {
      error: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      correlationId: request.context?.correlationId || 'unknown',
    }
  })
}

// Graceful shutdown
export async function shutdownServer(server: FastifyInstance) {
  try {
    await server.close()
    await prisma.$disconnect()
    console.log('Server shut down gracefully')
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}
