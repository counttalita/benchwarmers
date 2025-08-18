import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

const decryptDataSchema = z.object({
  encryptedData: z.string().min(1),
  key: z.string().min(32, 'Encryption key must be at least 32 characters long')
})

// POST /api/security/decryption - Decrypt sensitive data
export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedBody = decryptDataSchema.parse(body)

    // Validate key strength
    if (validatedBody.key.length < 32) {
      return NextResponse.json(
        { error: 'Encryption key must be at least 32 characters long' },
        { status: 400 }
      )
    }

    // Mock decryption (in real implementation, use proper crypto)
    const decryptedData = `decrypted-${validatedBody.encryptedData}`

    logger.info('Data decrypted successfully', {
      userId: user.id,
      dataLength: validatedBody.encryptedData.length
    })

    return NextResponse.json({
      success: true,
      decryptedData,
      message: 'Data decrypted successfully'
    })

  } catch (error) {
    logger.error('Failed to decrypt data', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
