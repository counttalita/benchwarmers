import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    const body = await request.json()
    const { fileName, fileSize, fileType } = body

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'File name, size, and type are required' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileSize > maxSize) {
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

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    logger.info('File validation successful', {
      fileName,
      fileType,
      fileSize
    })

    return NextResponse.json({
      success: true,
      isValid: true,
      file: {
        name: fileName,
        type: fileType,
        size: fileSize,
        validated: true
      }
    })

  } catch (error) {
    logger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'File validation failed' },
      { status: 500 }
    )
  }
}
