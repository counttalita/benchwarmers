import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

const encryptSchema = z.object({
  data: z.string().min(1, 'Data is required'),
  key: z.string().min(32, 'Encryption key must be at least 32 characters')
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can encrypt data
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = encryptSchema.parse(body)

    // Validate encryption key strength
    if (validatedData.key.length < 32) {
      return NextResponse.json({ 
        error: 'Encryption key must be at least 32 characters long' 
      }, { status: 400 })
    }

    // Generate a random IV
    const iv = crypto.randomBytes(16)
    
    // Create cipher
    const cipher = crypto.createCipher('aes-256-cbc', validatedData.key)
    
    // Encrypt the data
    let encrypted = cipher.update(validatedData.data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combine IV and encrypted data
    const result = iv.toString('hex') + ':' + encrypted

    logger.info('Data encrypted', { 
      userId: user.id,
      dataLength: validatedData.data.length 
    })

    return NextResponse.json({
      success: true,
      encryptedData: result,
      algorithm: 'aes-256-cbc',
      ivLength: iv.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to encrypt data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
