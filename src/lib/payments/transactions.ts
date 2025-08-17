import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

export interface TransactionRecord {
  id: string
  type: 'payment' | 'transfer' | 'refund' | 'fee'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  description: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface PaymentReceipt {
  receiptId: string
  transactionId: string
  amount: number
  currency: string
  platformFee: number
  providerAmount: number
  description: string
  date: Date
  status: string
  breakdown: {
    totalAmount: number
    platformFee: number
    providerAmount: number
    platformFeePercentage: number
  }
}

export class TransactionService {
  /**
   * Create transaction record
   */
  async createTransaction(
    type: 'payment' | 'transfer' | 'refund' | 'fee',
    amount: number,
    currency: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<TransactionRecord> {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount,
          currency,
          status: 'pending',
          description,
          metadata,
        },
      })

      logger.info('Transaction record created', {
        transactionId: transaction.id,
        type,
        amount,
        currency,
        description,
      })

      return transaction
    } catch (error) {
      logger.error('Failed to create transaction record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        amount,
        currency,
      })
      throw new Error('Failed to create transaction record')
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed' | 'cancelled',
    metadata?: Record<string, unknown>
  ): Promise<TransactionRecord> {
    try {
      const updateData: { status: string; updatedAt: Date; metadata?: Record<string, unknown> } = {
        status,
        updatedAt: new Date(),
      }

      if (metadata) {
        updateData.metadata = metadata
      }

      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
      })

      logger.info('Transaction status updated', {
        transactionId,
        status,
      })

      return transaction
    } catch (error) {
      logger.error('Failed to update transaction status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
        status,
      })
      throw new Error('Failed to update transaction status')
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })

      return transaction
    } catch (error) {
      logger.error('Failed to get transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      })
      throw new Error('Failed to get transaction')
    }
  }

  /**
   * Get transactions for engagement
   */
  async getTransactionsByEngagement(engagementId: string): Promise<TransactionRecord[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          metadata: {
            path: ['engagementId'],
            equals: engagementId,
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return transactions
    } catch (error) {
      logger.error('Failed to get transactions for engagement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        engagementId,
      })
      throw new Error('Failed to get transactions')
    }
  }

  /**
   * Get transactions for company
   */
  async getTransactionsByCompany(companyId: string): Promise<TransactionRecord[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['seekerCompanyId'],
                equals: companyId,
              },
            },
            {
              metadata: {
                path: ['providerCompanyId'],
                equals: companyId,
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })

      return transactions
    } catch (error) {
      logger.error('Failed to get transactions for company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId,
      })
      throw new Error('Failed to get transactions')
    }
  }

  /**
   * Generate payment receipt
   */
  async generateReceipt(escrowPaymentId: string): Promise<PaymentReceipt> {
    try {
      const escrowPayment = await prisma.escrowPayment.findUnique({
        where: { id: escrowPaymentId },
        include: {
          engagement: {
            include: {
              seekerCompany: true,
              providerCompany: true,
            },
          },
        },
      })

      if (!escrowPayment) {
        throw new Error('Escrow payment not found')
      }

      const receiptId = `RCPT-${escrowPaymentId.slice(0, 8).toUpperCase()}`
      const breakdown = {
        totalAmount: escrowPayment.amount,
        platformFee: escrowPayment.platformFee,
        providerAmount: escrowPayment.providerAmount,
        platformFeePercentage: 15,
      }

      const receipt: PaymentReceipt = {
        receiptId,
        transactionId: escrowPayment.paymentIntentId || escrowPaymentId,
        amount: escrowPayment.amount,
        currency: escrowPayment.currency,
        platformFee: escrowPayment.platformFee,
        providerAmount: escrowPayment.providerAmount,
        description: `Payment for engagement: ${escrowPayment.engagement.title}`,
        date: escrowPayment.createdAt,
        status: escrowPayment.status,
        breakdown,
      }

      logger.info('Payment receipt generated', {
        receiptId,
        escrowPaymentId,
        amount: escrowPayment.amount,
      })

      return receipt
    } catch (error) {
      logger.error('Failed to generate receipt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
      })
      throw new Error('Failed to generate receipt')
    }
  }

  /**
   * Get payment statistics for company
   */
  async getPaymentStatistics(companyId: string): Promise<{
    totalPayments: number
    totalAmount: number
    totalFees: number
    averagePayment: number
    paymentCount: number
  }> {
    try {
      const transactions = await this.getTransactionsByCompany(companyId)

      const paymentTransactions = transactions.filter(t => t.type === 'payment' && t.status === 'completed')
      const feeTransactions = transactions.filter(t => t.type === 'fee' && t.status === 'completed')

      const totalPayments = paymentTransactions.reduce((sum, t) => sum + t.amount, 0)
      const totalFees = feeTransactions.reduce((sum, t) => sum + t.amount, 0)
      const paymentCount = paymentTransactions.length
      const averagePayment = paymentCount > 0 ? totalPayments / paymentCount : 0

      return {
        totalPayments,
        totalAmount: totalPayments - totalFees,
        totalFees,
        averagePayment,
        paymentCount,
      }
    } catch (error) {
      logger.error('Failed to get payment statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId,
      })
      throw new Error('Failed to get payment statistics')
    }
  }

  /**
   * Create dispute record
   */
  async createDispute(
    escrowPaymentId: string,
    reason: string,
    description: string,
    evidence: string[],
    raisedBy: string
  ): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      const dispute = await prisma.dispute.create({
        data: {
          escrowPaymentId,
          reason,
          description,
          evidence,
          raisedBy,
          status: 'open',
        },
      })

      // Update escrow payment status
      await prisma.escrowPayment.update({
        where: { id: escrowPaymentId },
        data: {
          status: 'disputed',
          updatedAt: new Date(),
        },
      })

      logger.info('Dispute created', {
        disputeId: dispute.id,
        escrowPaymentId,
        reason,
        raisedBy,
      })

      return dispute
    } catch (error) {
      logger.error('Failed to create dispute', {
        error: error instanceof Error ? error.message : 'Unknown error',
        escrowPaymentId,
        reason,
      })
      throw new Error('Failed to create dispute')
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'refund' | 'release' | 'partial_refund',
    amount?: number,
    reason: string
  ): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: { escrowPayment: true },
      })

      if (!dispute) {
        throw new Error('Dispute not found')
      }

      // Update dispute status
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved',
          resolution,
          resolutionAmount: amount,
          resolutionReason: reason,
          resolvedAt: new Date(),
        },
      })

      // Handle resolution
      if (resolution === 'refund') {
        await prisma.escrowPayment.update({
          where: { id: dispute.escrowPaymentId },
          data: {
            status: 'refunded',
            updatedAt: new Date(),
          },
        })
      } else if (resolution === 'release') {
        await prisma.escrowPayment.update({
          where: { id: dispute.escrowPaymentId },
          data: {
            status: 'released',
            updatedAt: new Date(),
          },
        })
      }

      logger.info('Dispute resolved', {
        disputeId,
        resolution,
        amount,
        reason,
      })

      return { success: true, resolution }
    } catch (error) {
      logger.error('Failed to resolve dispute', {
        error: error instanceof Error ? error.message : 'Unknown error',
        disputeId,
        resolution,
      })
      throw new Error('Failed to resolve dispute')
    }
  }
}

export const transactionService = new TransactionService()
