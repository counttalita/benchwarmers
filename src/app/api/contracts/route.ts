import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { contractGenerator, ContractData } from '@/lib/contracts/contract-generator'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const generateContractSchema = z.object({
  offerId: z.string().min(1, 'Offer ID is required'),
  contractType: z.enum(['msa', 'sow', 'both']).default('both'),
  deliverables: z.array(z.string()).min(1, 'At least one deliverable is required'),
  milestones: z.array(z.object({
    name: z.string(),
    description: z.string(),
    dueDate: z.string().transform(str => new Date(str)),
    amount: z.number().positive()
  })).optional().default([]),
  paymentTerms: z.string().default('Net 30 days'),
  customTerms: z.object({
    terminationClause: z.string().optional(),
    confidentialityClause: z.string().optional(),
    intellectualPropertyClause: z.string().optional(),
    disputeResolutionClause: z.string().optional()
  }).optional()
})

// GET /api/contracts - Get contracts with filtering
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const offerId = searchParams.get('offerId')
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (offerId) {
      where.offerId = offerId
    }

    if (status) {
      where.status = status
    }

    if (companyId) {
      where.OR = [
        { seekerCompanyId: companyId },
        { providerCompanyId: companyId }
      ]
    }

    // Note: This assumes we add a Contract model to Prisma schema
    // For now, we'll return a mock response structure
    const contracts: any[] = []
    const total = 0

    logInfo('Contracts retrieved successfully', {
      correlationId,
      count: contracts.length,
      total,
      filters: { offerId, status, companyId }
    })

    return NextResponse.json({
      success: true,
      data: contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_contracts' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve contracts',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/contracts - Generate new contract
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Generating contract', {
      correlationId,
      requestBody: body
    })

    // Validate request data
    const validatedData = generateContractSchema.parse(body)

    // Get offer details with related data
    const offer = await prisma.offer.findUnique({
      where: { id: validatedData.offerId },
      include: {
        match: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
                companyId: true
              }
            },
            request: {
              select: {
                id: true,
                title: true,
                description: true,
                companyId: true
              }
            }
          }
        },
        seekerCompany: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        providerCompany: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    })

    if (!offer) {
      return NextResponse.json({
        success: false,
        error: 'Offer not found',
        correlationId
      }, { status: 404 })
    }

    if (offer.status !== 'accepted') {
      return NextResponse.json({
        success: false,
        error: 'Contract can only be generated for accepted offers',
        correlationId
      }, { status: 400 })
    }

    // Prepare contract data
    const contractData: ContractData = {
      seekerCompany: {
        name: offer.seekerCompany.name,
        address: 'Address to be provided', // TODO: Add address fields to company model
        contactName: 'Contact to be provided', // TODO: Add contact fields
        contactEmail: `contact@${offer.seekerCompany.domain}`,
        contactPhone: 'Phone to be provided'
      },
      providerCompany: {
        name: offer.providerCompany.name,
        address: 'Address to be provided',
        contactName: offer.match.profile.name,
        contactEmail: `contact@${offer.providerCompany.domain}`,
        contactPhone: 'Phone to be provided'
      },
      projectTitle: offer.match.request.title,
      projectDescription: offer.match.request.description,
      startDate: offer.startDate,
      endDate: new Date(offer.startDate.getTime() + offer.durationWeeks * 7 * 24 * 60 * 60 * 1000),
      rate: Number(offer.rate),
      currency: offer.currency,
      totalAmount: Number(offer.totalAmount),
      paymentTerms: validatedData.paymentTerms,
      deliverables: validatedData.deliverables,
      milestones: validatedData.milestones,
      terminationClause: validatedData.customTerms?.terminationClause || '',
      confidentialityClause: validatedData.customTerms?.confidentialityClause || '',
      intellectualPropertyClause: validatedData.customTerms?.intellectualPropertyClause || '',
      disputeResolutionClause: validatedData.customTerms?.disputeResolutionClause || ''
    }

    // Validate contract data
    const validation = contractGenerator.validateContractData(contractData)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Contract data validation failed',
        details: validation.errors,
        correlationId
      }, { status: 400 })
    }

    // Generate contract documents
    const contractPackage = contractGenerator.generateContractPackage(contractData)

    // TODO: Store contract in database
    // const contract = await prisma.contract.create({
    //   data: {
    //     id: contractPackage.metadata.contractId,
    //     offerId: validatedData.offerId,
    //     seekerCompanyId: offer.seekerCompanyId,
    //     providerCompanyId: offer.providerCompanyId,
    //     msaContent: contractPackage.msa,
    //     sowContent: contractPackage.sow,
    //     status: 'draft',
    //     version: contractPackage.metadata.version
    //   }
    // })

    logInfo('Contract generated successfully', {
      correlationId,
      contractId: contractPackage.metadata.contractId,
      offerId: validatedData.offerId,
      contractType: validatedData.contractType
    })

    return NextResponse.json({
      success: true,
      data: {
        contractId: contractPackage.metadata.contractId,
        msa: validatedData.contractType === 'sow' ? null : contractPackage.msa,
        sow: validatedData.contractType === 'msa' ? null : contractPackage.sow,
        metadata: contractPackage.metadata,
        status: 'draft'
      },
      message: 'Contract generated successfully',
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'CONTRACT_VALIDATION_ERROR',
        'Validation error generating contract',
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
    logError(appError, { correlationId, operation: 'generate_contract' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate contract',
      correlationId
    }, { status: 500 })
  }
}
