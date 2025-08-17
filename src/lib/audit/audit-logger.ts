import { logInfo, logError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

export interface AuditLogEntry {
  userId?: string
  companyId?: string
  action: string
  resource: string
  resourceId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  correlationId?: string
}

export interface AuditQuery {
  userId?: string
  companyId?: string
  action?: string
  resource?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export class AuditLogger {
  
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Create immutable audit log entry
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: entry.userId,
          companyId: entry.companyId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          correlationId: entry.correlationId,
          timestamp: new Date()
        }
      })

      logInfo('Audit log entry created', {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        correlationId: entry.correlationId
      })

    } catch (error) {
      logError('Failed to create audit log entry', {
        error,
        entry,
        correlationId: entry.correlationId
      })
      // Don't throw error to avoid breaking main operation
    }
  }

  /**
   * Log company verification action
   */
  async logCompanyVerification(
    companyId: string,
    decision: 'approve' | 'reject' | 'request_info',
    adminUserId: string,
    reason?: string,
    correlationId?: string
  ): Promise<void> {
    await this.log({
      userId: adminUserId,
      companyId,
      action: 'COMPANY_VERIFICATION',
      resource: 'Company',
      resourceId: companyId,
      newValues: { decision, reason },
      metadata: { verificationDecision: decision },
      correlationId
    })
  }

  /**
   * Log offer creation
   */
  async logOfferCreation(
    offerId: string,
    seekerCompanyId: string,
    providerCompanyId: string,
    offerData: any,
    correlationId?: string
  ): Promise<void> {
    await this.log({
      companyId: seekerCompanyId,
      action: 'OFFER_CREATED',
      resource: 'Offer',
      resourceId: offerId,
      newValues: {
        rate: offerData.rate,
        totalAmount: offerData.totalAmount,
        providerCompanyId
      },
      correlationId
    })
  }

  /**
   * Log offer response
   */
  async logOfferResponse(
    offerId: string,
    providerCompanyId: string,
    response: 'accept' | 'decline' | 'counter',
    responseData?: any,
    correlationId?: string
  ): Promise<void> {
    await this.log({
      companyId: providerCompanyId,
      action: 'OFFER_RESPONSE',
      resource: 'Offer',
      resourceId: offerId,
      newValues: { response, ...responseData },
      correlationId
    })
  }

  /**
   * Log contract signing
   */
  async logContractSigning(
    contractId: string,
    companyId: string,
    signerType: 'seeker' | 'provider',
    signerName: string,
    correlationId?: string
  ): Promise<void> {
    await this.log({
      companyId,
      action: 'CONTRACT_SIGNED',
      resource: 'Contract',
      resourceId: contractId,
      newValues: { signerType, signerName },
      correlationId
    })
  }

  /**
   * Log payment release
   */
  async logPaymentRelease(
    paymentId: string,
    engagementId: string,
    amount: number,
    reason: string,
    correlationId?: string
  ): Promise<void> {
    await this.log({
      action: 'PAYMENT_RELEASED',
      resource: 'Payment',
      resourceId: paymentId,
      newValues: { amount, reason, engagementId },
      correlationId
    })
  }

  /**
   * Log engagement completion
   */
  async logEngagementCompletion(
    engagementId: string,
    companyId: string,
    approvedBy: string,
    deliverables: string[],
    correlationId?: string
  ): Promise<void> {
    await this.log({
      companyId,
      action: 'ENGAGEMENT_COMPLETED',
      resource: 'Engagement',
      resourceId: engagementId,
      newValues: { approvedBy, deliverables },
      correlationId
    })
  }

  /**
   * Log data access (for GDPR compliance)
   */
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    accessType: 'read' | 'export' | 'delete',
    correlationId?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'DATA_ACCESS',
      resource,
      resourceId,
      newValues: { accessType },
      correlationId
    })
  }

  /**
   * Log admin actions
   */
  async logAdminAction(
    adminUserId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes?: any,
    correlationId?: string
  ): Promise<void> {
    await this.log({
      userId: adminUserId,
      action: `ADMIN_${action.toUpperCase()}`,
      resource,
      resourceId,
      newValues: changes,
      metadata: { adminAction: true },
      correlationId
    })
  }

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<{
    logs: any[]
    total: number
    page: number
    totalPages: number
  }> {
    const page = query.page || 1
    const limit = query.limit || 50
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (query.userId) where.userId = query.userId
    if (query.companyId) where.companyId = query.companyId
    if (query.action) where.action = query.action
    if (query.resource) where.resource = query.resource
    if (query.resourceId) where.resourceId = query.resourceId
    
    if (query.startDate || query.endDate) {
      where.timestamp = {}
      if (query.startDate) where.timestamp.gte = query.startDate
      if (query.endDate) where.timestamp.lte = query.endDate
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          company: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get audit trail for specific resource
   */
  async getResourceAuditTrail(
    resource: string,
    resourceId: string,
    limit: number = 100
  ): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: {
        resource,
        resourceId
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        company: {
          select: { id: true, name: true }
        }
      }
    })
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalActions: number
    actionsByType: Record<string, number>
    resourcesAccessed: Record<string, number>
  }> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        action: true,
        resource: true
      }
    })

    const actionsByType: Record<string, number> = {}
    const resourcesAccessed: Record<string, number> = {}

    logs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
      resourcesAccessed[log.resource] = (resourcesAccessed[log.resource] || 0) + 1
    })

    return {
      totalActions: logs.length,
      actionsByType,
      resourcesAccessed
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number
    dataAccessEvents: number
    adminActions: number
    verificationActions: number
    paymentEvents: number
    contractEvents: number
  }> {
    const [
      totalEvents,
      dataAccessEvents,
      adminActions,
      verificationActions,
      paymentEvents,
      contractEvents
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { timestamp: { gte: startDate, lte: endDate } }
      }),
      prisma.auditLog.count({
        where: { 
          action: 'DATA_ACCESS',
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: { 
          action: { startsWith: 'ADMIN_' },
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: { 
          action: 'COMPANY_VERIFICATION',
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: { 
          action: { in: ['PAYMENT_RELEASED', 'PAYMENT_HELD'] },
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: { 
          action: { in: ['CONTRACT_SIGNED', 'CONTRACT_CREATED'] },
          timestamp: { gte: startDate, lte: endDate }
        }
      })
    ])

    return {
      totalEvents,
      dataAccessEvents,
      adminActions,
      verificationActions,
      paymentEvents,
      contractEvents
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()
