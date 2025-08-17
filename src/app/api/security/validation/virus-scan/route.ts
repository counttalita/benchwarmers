import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import { scanFile } from '@/lib/virus-scan'

const virusScanSchema = z.object({
  fileContent: z.string().min(1, 'File content is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size is required'),
  fileType: z.string().min(1, 'File type is required')
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = virusScanSchema.parse(body)

    const { fileContent, fileName, fileSize, fileType } = validatedData

    // Check file size limit (10MB)
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (fileSize > maxFileSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 10MB limit' 
      }, { status: 400 })
    }

    // Check allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Only PDF, DOC, DOCX, JPG, PNG, GIF, TXT allowed' 
      }, { status: 400 })
    }

    // Perform virus scan
    const scanResult = await scanFile({
      content: fileContent,
      name: fileName,
      size: fileSize,
      type: fileType
    })

    if (!scanResult.isClean) {
      logger.warn('Malicious file detected', { 
        userId: user.id, 
        fileName,
        threats: scanResult.threats 
      })

      return NextResponse.json({
        success: false,
        isClean: false,
        threats: scanResult.threats,
        error: 'Malicious content detected in file'
      }, { status: 400 })
    }

    logger.info('File scanned successfully', { 
      userId: user.id, 
      fileName,
      fileSize,
      fileType 
    })

    return NextResponse.json({
      success: true,
      isClean: true,
      fileName,
      fileSize,
      fileType,
      scanTimestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to scan file for viruses')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
