import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

export interface InvoiceData {
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  fromCompany: {
    name: string
    address: string
    email: string
    vatNumber?: string
  }
  toCompany: {
    name: string
    address: string
    email: string
    vatNumber?: string
  }
  items: InvoiceItem[]
  subtotal: number
  vatAmount: number
  total: number
  currency: string
  notes?: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  engagementId?: string
}

export interface SeekerInvoiceRequest {
  engagementId: string
  seekerCompanyId: string
  amount: number
  description: string
  dueDate?: Date
}

export interface ProviderInvoiceRequest {
  engagementId: string
  providerCompanyId: string
  amount: number
  description: string
  workPeriod: {
    startDate: Date
    endDate: Date
  }
}

export class InvoiceGenerator {
  private readonly VAT_RATE = 0.15 // 15% VAT for South Africa

  /**
   * Generate invoice for talent seeker (Benchwarmers invoices seeker)
   */
  async generateSeekerInvoice(request: SeekerInvoiceRequest): Promise<InvoiceData> {
    try {
      const engagement = await prisma.engagement.findUnique({
        where: { id: request.engagementId },
        include: {
          offer: {
            include: {
              seekerCompany: true,
              providerCompany: true
            }
          }
        }
      })

      if (!engagement) {
        throw new Error('Engagement not found')
      }

      const invoiceNumber = `BW-${Date.now()}-${request.seekerCompanyId.slice(-4)}`
      const issueDate = new Date()
      const dueDate = request.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const subtotal = request.amount
      const vatAmount = subtotal * this.VAT_RATE
      const total = subtotal + vatAmount

      const invoiceData: InvoiceData = {
        invoiceNumber,
        issueDate,
        dueDate,
        fromCompany: {
          name: 'Benchwarmers (Pty) Ltd',
          address: 'Cape Town, South Africa',
          email: 'billing@benchwarmers.com',
          vatNumber: 'VAT123456789'
        },
        toCompany: {
          name: engagement.offer.seekerCompany.name,
          address: `${engagement.offer.seekerCompany.domain}`,
          email: `billing@${engagement.offer.seekerCompany.domain}`,
        },
        items: [{
          description: `${request.description} - ${engagement.offer.providerCompany.name}`,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
          engagementId: request.engagementId
        }],
        subtotal,
        vatAmount,
        total,
        currency: 'ZAR',
        notes: `Payment terms: 30 days. Engagement ID: ${request.engagementId}`
      }

      // Store invoice in database
      await this.storeInvoice(invoiceData, 'seeker', request.engagementId)

      logInfo('Seeker invoice generated', {
        invoiceNumber,
        engagementId: request.engagementId,
        amount: total
      })

      return invoiceData

    } catch (error) {
      logError('Failed to generate seeker invoice', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      })
      throw error
    }
  }

  /**
   * Generate invoice from talent provider (Provider invoices Benchwarmers)
   */
  async generateProviderInvoice(request: ProviderInvoiceRequest): Promise<InvoiceData> {
    try {
      const engagement = await prisma.engagement.findUnique({
        where: { id: request.engagementId },
        include: {
          offer: {
            include: {
              seekerCompany: true,
              providerCompany: true
            }
          }
        }
      })

      if (!engagement) {
        throw new Error('Engagement not found')
      }

      const invoiceNumber = `PROV-${Date.now()}-${request.providerCompanyId.slice(-4)}`
      const issueDate = new Date()
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for provider payments

      const subtotal = request.amount
      const vatAmount = subtotal * this.VAT_RATE
      const total = subtotal + vatAmount

      const invoiceData: InvoiceData = {
        invoiceNumber,
        issueDate,
        dueDate,
        fromCompany: {
          name: engagement.offer.providerCompany.name,
          address: `${engagement.offer.providerCompany.domain}`,
          email: `billing@${engagement.offer.providerCompany.domain}`,
        },
        toCompany: {
          name: 'Benchwarmers (Pty) Ltd',
          address: 'Cape Town, South Africa',
          email: 'billing@benchwarmers.com',
          vatNumber: 'VAT123456789'
        },
        items: [{
          description: `${request.description} (${request.workPeriod.startDate.toLocaleDateString()} - ${request.workPeriod.endDate.toLocaleDateString()})`,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
          engagementId: request.engagementId
        }],
        subtotal,
        vatAmount,
        total,
        currency: 'ZAR',
        notes: `Work period: ${request.workPeriod.startDate.toLocaleDateString()} - ${request.workPeriod.endDate.toLocaleDateString()}. Engagement ID: ${request.engagementId}`
      }

      // Store invoice in database
      await this.storeInvoice(invoiceData, 'provider', request.engagementId)

      logInfo('Provider invoice generated', {
        invoiceNumber,
        engagementId: request.engagementId,
        amount: total
      })

      return invoiceData

    } catch (error) {
      logError('Failed to generate provider invoice', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      })
      throw error
    }
  }

  /**
   * Calculate provider payment (minus 5% facilitation fee)
   */
  calculateProviderPayment(grossAmount: number): {
    grossAmount: number
    facilitationFee: number
    netAmount: number
    vatOnFee: number
    totalDeduction: number
    finalPayment: number
  } {
    const facilitationFee = grossAmount * 0.05
    const vatOnFee = facilitationFee * this.VAT_RATE
    const totalDeduction = facilitationFee + vatOnFee
    const finalPayment = grossAmount - totalDeduction

    return {
      grossAmount,
      facilitationFee,
      netAmount: grossAmount - facilitationFee,
      vatOnFee,
      totalDeduction,
      finalPayment
    }
  }

  /**
   * Generate payment summary for provider
   */
  async generateProviderPaymentSummary(engagementId: string, grossAmount: number) {
    const calculation = this.calculateProviderPayment(grossAmount)
    
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: {
        offer: {
          include: {
            providerCompany: true
          }
        }
      }
    })

    return {
      engagementId,
      providerCompany: engagement?.offer.providerCompany.name,
      calculation,
      paymentDate: new Date(),
      reference: `PAY-${Date.now()}-${engagementId.slice(-4)}`
    }
  }

  private async storeInvoice(invoiceData: InvoiceData, type: 'seeker' | 'provider', engagementId: string) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        type,
        engagementId,
        fromCompany: invoiceData.fromCompany.name,
        toCompany: invoiceData.toCompany.name,
        subtotal: invoiceData.subtotal,
        vatAmount: invoiceData.vatAmount,
        total: invoiceData.total,
        currency: invoiceData.currency,
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        status: 'pending',
        items: JSON.stringify(invoiceData.items),
        notes: invoiceData.notes
      }
    })
  }
}

// Export singleton instance
export const invoiceGenerator = new InvoiceGenerator()
