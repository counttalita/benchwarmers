import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// POST /api/security/encryption - Encrypt sensitive data
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'POST', 
    path: '/api/security/encryption',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const { data, key } = body

    if (!data || !key) {
      requestLogger.warn('Missing data or key in encryption request')
      return NextResponse.json(
        { error: 'Data and key are required' },
        { status: 400 }
      )
    }

    // Generate a random IV
    const iv = crypto.randomBytes(16)
    
    // Create cipher
    const cipher = crypto.createCipher('aes-256-cbc', key)
    
    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const result = {
      encrypted,
      iv: iv.toString('hex'),
      algorithm: 'aes-256-cbc'
    }

    requestLogger.info('Data encrypted successfully', {
      dataLength: data.length,
      algorithm: 'aes-256-cbc'
    })

    return NextResponse.json({
      message: 'Data encrypted successfully',
      result
    })

  } catch (error) {
    requestLogger.error('Failed to encrypt data', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/security/encryption/decrypt - Decrypt sensitive data
export async function PUT(request: NextRequest) {
  const requestLogger = logger.child({ 
    method: 'PUT', 
    path: '/api/security/encryption/decrypt',
    requestId: crypto.randomUUID()
  })

  try {
    const body = await request.json()
    const { encrypted, key, iv } = body

    if (!encrypted || !key || !iv) {
      requestLogger.warn('Missing encrypted data, key, or IV in decryption request')
      return NextResponse.json(
        { error: 'Encrypted data, key, and IV are required' },
        { status: 400 }
      )
    }

    // Create decipher
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    decipher.setAutoPadding(false)
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    requestLogger.info('Data decrypted successfully', {
      encryptedLength: encrypted.length
    })

    return NextResponse.json({
      message: 'Data decrypted successfully',
      decrypted
    })

  } catch (error) {
    requestLogger.error('Failed to decrypt data', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
