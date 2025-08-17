import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { docuSignIntegration } from '@/lib/esignature/docusign-integration'
import { contractGenerator } from '@/lib/contracts/contract-generator'
import { v4 as uuidv4 } from 'uuid'

// Validation schema
const sendForSignatureSchema = z.object({
  signers: z.array(z.object({
    name: z.string().min(1, 'Signer name is required'),
    email: z.string().email('Valid email is required'),
    role: z.enum(['seeker', 'provider'])
  })).min(2, 'At least 2 signers required'),
  callbackUrl: z.string().url().optional(),
  expirationDays: z.number().min(1).max(365).default(30)
})

// POST /api/contracts/[id]/sign - Send contract for e-signature
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = uuidv4()

  try {
    const contractId = params.id
    const body = await request.json()
    
    logInfo('Sending contract for e-signature', {
      correlationId,
      contractId,
      requestData: body
    })

    // Validate request data
    const validatedData = sendForSignatureSchema.parse(body)

    // TODO: Get contract details from database
    // const contract = await prisma.contract.findUnique({
    //   where: { id: contractId },
    //   include: {
    //     offer: {
    //       include: {
    //         match: {
    //           include: {
    //             profile: true,
    //             request: true
    //           }
    //         },
    //         seekerCompany: true,
    //         providerCompany: true
    //       }
    //     }
    //   }
    // })

    // Mock contract data for now
    const contract = {
      id: contractId,
      status: 'draft',
      msaContent: 'Mock MSA content',
      sowContent: 'Mock SOW content'
    }

    if (!contract) {
      return NextResponse.json({
        success: false,
        error: 'Contract not found',
        correlationId
      }, { status: 404 })
    }

    if (contract.status !== 'draft') {
      return NextResponse.json({
        success: false,
        error: 'Contract must be in draft status to send for signature',
        correlationId
      }, { status: 400 })
    }

    // Combine MSA and SOW into single document
    const combinedDocument = `${contract.msaContent}\n\n--- STATEMENT OF WORK ---\n\n${contract.sowContent}`
    
    // Convert to base64 (in real implementation, you'd generate a PDF)
    const documentContent = Buffer.from(combinedDocument).toString('base64')

    // Send for signature via DocuSign
    const signatureRequest = {
      contractId,
      documentName: `Contract-${contractId}.pdf`,
      documentContent,
      signers: validatedData.signers.map((signer, index) => ({
        ...signer,
        routingOrder: index + 1
      })),
      callbackUrl: validatedData.callbackUrl,
      expirationDays: validatedData.expirationDays
    }

    const result = await docuSignIntegration.sendForSignature(signatureRequest, correlationId)

    if (result.success) {
      // TODO: Update contract status and store envelope ID
      // await prisma.contract.update({
      //   where: { id: contractId },
      //   data: {
      //     status: 'sent_for_signature',
      //     envelopeId: result.envelopeId,
      //     sentForSignatureAt: new Date()
      //   }
      // })

      logInfo('Contract sent for e-signature successfully', {
        correlationId,
        contractId,
        envelopeId: result.envelopeId
      })

      return NextResponse.json({
        success: true,
        data: {
          contractId,
          envelopeId: result.envelopeId,
          signingUrls: result.signingUrls,
          status: 'sent_for_signature'
        },
        message: 'Contract sent for e-signature successfully',
        correlationId
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        correlationId
      }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'ESIGNATURE_VALIDATION_ERROR',
        'Validation error sending contract for signature',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'send_for_esignature' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send contract for e-signature',
      correlationId
    }, { status: 500 })
  }
}
