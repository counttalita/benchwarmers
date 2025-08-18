import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import logger from '@/lib/logger'

const updateInvoiceStatusSchema = z.object({
  engagementId: z.string().cuid(),
  invoiceStatus: z.enum(['pending', 'sent', 'paid', 'overdue']),
  invoiceNumber: z.string().optional(),
  sentDate: z.string().datetime().optional(),
  paidDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  seekerInvoiceSent: z.boolean().optional(),
  providerInvoiceSent: z.boolean().optional(),
  seekerPaymentReceived: z.boolean().optional(),
  providerPaymentSent: z.boolean().optional()
})

const listInvoicingSchema = z.object({
  status: z.enum(['pending', 'sent', 'paid', 'overdue']).optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20)
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    
    const parsedQuery = {
      ...query,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20
    }

    const validatedQuery = listInvoicingSchema.parse(parsedQuery)

    // Get engagements that need manual invoicing (status = accepted)
    const whereClause: any = {
      status: 'accepted'
    }

    if (validatedQuery.status) {
      // This would need to be joined with invoice data when we have it
      // For now, we'll just filter by engagement status
    }

    const [engagements, total] = await Promise.all([
      prisma.engagement.findMany({
        where: whereClause,
        include: {
          offer: {
            include: {
              talentRequest: {
                include: {
                  company: true
                }
              },
              talentProfile: {
                include: {
                  company: true
                }
              }
            }
          }
        },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit,
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      prisma.engagement.count({
        where: whereClause
      })
    ])

    return NextResponse.json({
      success: true,
      data: engagements.map(engagement => ({
        id: engagement.id,
        status: engagement.status,
        totalAmount: engagement.totalAmount,
        facilitationFee: Number(engagement.totalAmount) * 0.05,
        netAmount: Number(engagement.totalAmount) * 0.95,
        createdAt: engagement.createdAt,
        updatedAt: engagement.updatedAt,
        talentRequest: {
          id: engagement.offer.talentRequest.id,
          title: engagement.offer.talentRequest.title,
          company: {
            id: engagement.offer.talentRequest.company.id,
            name: engagement.offer.talentRequest.company.name
          }
        },
        talentProfile: {
          id: engagement.offer.talentProfile.id,
          name: engagement.offer.talentProfile.name,
          company: {
            id: engagement.offer.talentProfile.company.id,
            name: engagement.offer.talentProfile.company.name
          }
        }
      })),
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        pages: Math.ceil(total / validatedQuery.limit)
      }
    })

  } catch (error) {
    logger.error('Failed to get invoicing list', { error: (error as Error).message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateInvoiceStatusSchema.parse(body)

    // Verify engagement exists and is in accepted status
    const engagement = await prisma.engagement.findUnique({
      where: { id: validatedData.engagementId },
      include: {
        offer: {
          include: {
            talentRequest: {
              include: {
                company: true
              }
            },
            talentProfile: {
              include: {
                company: true
              }
            }
          }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    if (engagement.status !== 'accepted') {
      return NextResponse.json({ error: 'Engagement must be in accepted status for invoicing' }, { status: 400 })
    }

    // Create or update invoice records
    const invoiceData = {
      invoiceNumber: validatedData.invoiceNumber,
      sentDate: validatedData.sentDate ? new Date(validatedData.sentDate) : null,
      paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : null,
      notes: validatedData.notes,
      seekerInvoiceSent: validatedData.seekerInvoiceSent,
      providerInvoiceSent: validatedData.providerInvoiceSent,
      seekerPaymentReceived: validatedData.seekerPaymentReceived,
      providerPaymentSent: validatedData.providerPaymentSent,
      processedBy: user.id,
      updatedAt: new Date()
    }

    // For now, we'll log the invoicing action
    // In the future, this would create/update Invoice and ManualPayment records
    logger.info('Manual invoicing action recorded', {
      engagementId: validatedData.engagementId,
      invoiceStatus: validatedData.invoiceStatus,
      processedBy: user.id,
      invoiceData
    })

    return NextResponse.json({
      success: true,
      message: 'Invoicing status updated successfully',
      data: {
        engagementId: validatedData.engagementId,
        invoiceStatus: validatedData.invoiceStatus,
        processedBy: user.id,
        processedAt: new Date()
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }

    logger.error('Failed to update invoicing status', { error: (error as Error).message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
