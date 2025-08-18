import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

const decryptSchema = z.object({
  encryptedData: z.string().min(1, 'Encrypted data is required'),
  key: z.string().min(32, 'Encryption key must be at least 32 characters')
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can decrypt data
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = decryptSchema.parse(body)

    try {
      // Split IV and encrypted data
      const parts = validatedData.encryptedData.split(':')
      if (parts.length !== 2) {
        return NextResponse.json({ error: 'Invalid encrypted data format' }, { status: 400 })
      }

      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]

      // Create decipher
      const decipher = crypto.createDecipher('aes-256-cbc', validatedData.key)
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      logger.info('Data decrypted', { 
        userId: user.id,
        dataLength: decrypted.length 
      })

      return NextResponse.json({
        success: true,
        decryptedData: decrypted
      })

    } catch (decryptError) {
      return NextResponse.json({ 
        error: 'Failed to decrypt data. Invalid key or corrupted data.' 
      }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to decrypt data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
