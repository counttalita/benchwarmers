import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestLogger = logger.child({
    method: 'POST',
    path: '/api/security/file-validation',
    requestId: crypto.randomUUID()
  })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, DOC, DOCX, JPG, PNG allowed' },
        { status: 400 }
      )
    }

    // Check for malicious content (basic check)
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    
    // Check for common malicious patterns
    const content = new TextDecoder().decode(uint8Array.slice(0, 1000))
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i
    ]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        requestLogger.warn('Malicious content detected in file', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          pattern: pattern.source
        })
        return NextResponse.json(
          { error: 'File contains potentially malicious content' },
          { status: 400 }
        )
      }
    }

    requestLogger.info('File validation successful', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        validated: true
      }
    })

  } catch (error) {
    requestLogger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'File validation failed' },
      { status: 500 }
    )
  }
}
