import { logInfo, logError, createError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { auditLogger } from '@/lib/audit/audit-logger'

export interface DataExportRequest {
  userId?: string
  companyId?: string
  requestedBy: string
  dataTypes: string[]
  format: 'json' | 'csv' | 'pdf'
  includeAuditLogs?: boolean
}

export interface DataDeletionRequest {
  userId?: string
  companyId?: string
  requestedBy: string
  reason: string
  retentionOverride?: boolean
  deletionDate?: Date
}

export class GDPRManager {
  
  /**
   * Export user/company data for GDPR compliance
   */
  async exportData(request: DataExportRequest, correlationId?: string): Promise<{
    success: boolean
    exportId?: string
    downloadUrl?: string
    error?: string
  }> {
    try {
      logInfo('Processing GDPR data export request', {
        correlationId,
        userId: request.userId,
        companyId: request.companyId,
        dataTypes: request.dataTypes
      })

      const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const exportData: Record<string, unknown> = {}

      // Export user data if requested
      if (request.userId) {
        const user = await prisma.user.findUnique({
          where: { id: request.userId },
          include: {
            company: true
          }
        })

        if (user) {
          exportData.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            company: user.company ? {
              id: user.company.id,
              name: user.company.name,
              domain: user.company.domain
            } : null
          }
        }
      }

      // Export company data if requested
      if (request.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: request.companyId },
          include: {
            users: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            },
            talentRequests: true,
            profiles: true,
            seekerOffers: true,
            providerOffers: true,
            seekerContracts: true,
            providerContracts: true,
            verificationDocuments: true
          }
        })

        if (company) {
          exportData.company = {
            id: company.id,
            name: company.name,
            domain: company.domain,
            industry: company.industry,
            size: company.size,
            description: company.description,
            verified: company.verified,
            createdAt: company.createdAt,
            users: company.users,
            talentRequests: company.talentRequests.map(req => ({
              id: req.id,
              title: req.title,
              description: req.description,
              status: req.status,
              createdAt: req.createdAt
            })),
            profiles: company.profiles.map(profile => ({
              id: profile.id,
              name: profile.name,
              title: profile.title,
              bio: profile.bio,
              skills: profile.skills,
              verified: profile.verified,
              createdAt: profile.createdAt
            })),
            offers: {
              sent: company.seekerOffers.length,
              received: company.providerOffers.length
            },
            contracts: {
              asSeeker: company.seekerContracts.length,
              asProvider: company.providerContracts.length
            }
          }
        }
      }

      // Include audit logs if requested
      if (request.includeAuditLogs) {
        const auditLogs = await auditLogger.query({
          userId: request.userId,
          companyId: request.companyId,
          limit: 1000
        })
        
        exportData.auditLogs = auditLogs.logs.map((log: any) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          timestamp: log.timestamp,
          metadata: log.metadata
        }))
      }

      // Create export record
      await prisma.dataExport.create({
        data: {
          id: exportId,
          userId: request.userId,
          companyId: request.companyId,
          requestedBy: request.requestedBy,
          dataTypes: request.dataTypes,
          format: request.format,
          status: 'COMPLETED',
          exportData: JSON.stringify(exportData),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })

      // Log audit event
      await auditLogger.logDataAccess(
        request.userId || 'system',
        'DataExport',
        exportId,
        'export',
        correlationId
      )

      // TODO: Generate downloadable file and upload to secure storage
      const downloadUrl = `${process.env.BASE_URL}/api/admin/compliance/export/${exportId}`

      logInfo('GDPR data export completed', {
        correlationId,
        exportId,
        dataSize: JSON.stringify(exportData).length
      })

      return {
        success: true,
        exportId,
        downloadUrl
      }

    } catch (error) {
      logError(createError.internal('GDPR_EXPORT_ERROR', 'Failed to export data', { 
        error, 
        correlationId,
        request 
      }))
      
      return {
        success: false,
        error: 'Failed to export data'
      }
    }
  }

  /**
   * Process right-to-erasure request
   */
  async deleteData(request: DataDeletionRequest, correlationId?: string): Promise<{
    success: boolean
    deletionId?: string
    error?: string
  }> {
    try {
      logInfo('Processing GDPR data deletion request', {
        correlationId,
        userId: request.userId,
        companyId: request.companyId,
        reason: request.reason
      })

      const deletionId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Check for legal retention requirements
      const retentionCheck = await this.checkRetentionRequirements(
        request.userId,
        request.companyId
      )

      if (retentionCheck.hasActiveRetention && !request.retentionOverride) {
        return {
          success: false,
          error: `Data cannot be deleted due to retention requirements: ${retentionCheck.reasons.join(', ')}`
        }
      }

      // Create deletion record before actual deletion
      await prisma.dataDeletion.create({
        data: {
          id: deletionId,
          userId: request.userId,
          companyId: request.companyId,
          requestedBy: request.requestedBy,
          reason: request.reason,
          status: 'PROCESSING',
          scheduledFor: request.deletionDate || new Date(),
          createdAt: new Date()
        }
      })

      // Perform data deletion
      if (request.userId) {
        await this.deleteUserData(request.userId, correlationId)
      }

      if (request.companyId) {
        await this.deleteCompanyData(request.companyId, correlationId)
      }

      // Update deletion record
      await prisma.dataDeletion.update({
        where: { id: deletionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })

      // Log audit event
      await auditLogger.logDataAccess(
        request.userId || 'system',
        'DataDeletion',
        deletionId,
        'delete',
        correlationId
      )

      logInfo('GDPR data deletion completed', {
        correlationId,
        deletionId
      })

      return {
        success: true,
        deletionId
      }

    } catch (error) {
      logError(createError.internal('GDPR_DELETION_ERROR', 'Failed to delete data', { 
        error, 
        correlationId,
        request 
      }))
      
      return {
        success: false,
        error: 'Failed to delete data'
      }
    }
  }

  /**
   * Check retention requirements
   */
  private async checkRetentionRequirements(
    userId?: string,
    companyId?: string
  ): Promise<{
    hasActiveRetention: boolean
    reasons: string[]
  }> {
    const reasons: string[] = []

    if (companyId) {
      // Check for active contracts
      const activeContracts = await prisma.contract.count({
        where: {
          OR: [
            { seekerCompanyId: companyId },
            { providerCompanyId: companyId }
          ],
          status: { in: ['FULLY_SIGNED', 'EXECUTED'] }
        }
      })

      if (activeContracts > 0) {
        reasons.push('Active contracts require 7-year retention')
      }

      // Check for recent payments
      const recentPayments = await prisma.payment.count({
        where: {
          engagement: {
            contract: {
              OR: [
                { seekerCompanyId: companyId },
                { providerCompanyId: companyId }
              ]
            }
          },
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year
          }
        }
      })

      if (recentPayments > 0) {
        reasons.push('Recent payments require 1-year retention')
      }

      // Check for pending disputes
      const pendingDisputes = await prisma.engagement.count({
        where: {
          contract: {
            OR: [
              { seekerCompanyId: companyId },
              { providerCompanyId: companyId }
            ]
          },
          status: 'DISPUTED'
        }
      })

      if (pendingDisputes > 0) {
        reasons.push('Pending disputes prevent deletion')
      }
    }

    return {
      hasActiveRetention: reasons.length > 0,
      reasons
    }
  }

  /**
   * Delete user data
   */
  private async deleteUserData(userId: string, correlationId?: string): Promise<void> {
    // Anonymize user data instead of hard delete to maintain referential integrity
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@anonymized.local`,
        name: 'Deleted User',
        avatar: null,
        isActive: false
      }
    })

    logInfo('User data anonymized', { userId, correlationId })
  }

  /**
   * Delete company data
   */
  private async deleteCompanyData(companyId: string, correlationId?: string): Promise<void> {
    // Check if company can be safely deleted
    const retentionCheck = await this.checkRetentionRequirements(undefined, companyId)
    
    if (retentionCheck.hasActiveRetention) {
      // Anonymize instead of delete
      await prisma.company.update({
        where: { id: companyId },
        data: {
          name: 'Deleted Company',
          domain: `deleted-${companyId}.anonymized.local`,
          description: null,
          website: null,
          logoUrl: null,
          contactEmail: null,
          contactPhone: null,
          status: 'DEACTIVATED'
        }
      })

      // Anonymize associated profiles
      await prisma.profile.updateMany({
        where: { companyId },
        data: {
          name: 'Deleted Profile',
          bio: null,
          portfolio: null,
          status: 'INACTIVE'
        }
      })

      logInfo('Company data anonymized due to retention requirements', { 
        companyId, 
        correlationId 
      })
    } else {
      // Can perform actual deletion
      await prisma.company.update({
        where: { id: companyId },
        data: { status: 'DEACTIVATED' }
      })

      logInfo('Company deactivated', { companyId, correlationId })
    }
  }

  /**
   * Get data processing activities report
   */
  async getDataProcessingReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    dataExports: number
    dataDeletions: number
    dataAccess: number
    complianceRequests: number
  }> {
    const [dataExports, dataDeletions, dataAccess] = await Promise.all([
      prisma.dataExport.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.dataDeletion.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.auditLog.count({
        where: { 
          action: 'DATA_ACCESS',
          timestamp: { gte: startDate, lte: endDate }
        }
      })
    ])

    return {
      dataExports,
      dataDeletions,
      dataAccess,
      complianceRequests: dataExports + dataDeletions
    }
  }

  /**
   * Generate privacy impact assessment
   */
  async generatePrivacyImpactAssessment(): Promise<{
    dataTypes: string[]
    processingPurposes: string[]
    retentionPeriods: Record<string, string>
    securityMeasures: string[]
    riskAssessment: string
  }> {
    return {
      dataTypes: [
        'Personal identification data',
        'Company registration data',
        'Financial transaction data',
        'Communication data',
        'Usage and behavioral data',
        'Technical data (IP addresses, device info)'
      ],
      processingPurposes: [
        'Service provision and contract execution',
        'Payment processing and financial transactions',
        'Identity verification and fraud prevention',
        'Customer support and communication',
        'Legal compliance and audit requirements',
        'Platform improvement and analytics'
      ],
      retentionPeriods: {
        'User account data': '2 years after account closure',
        'Financial records': '7 years (legal requirement)',
        'Contract data': '7 years after contract completion',
        'Communication logs': '1 year',
        'Technical logs': '90 days',
        'Marketing data': 'Until consent withdrawal'
      },
      securityMeasures: [
        'End-to-end encryption for sensitive data',
        'Role-based access controls',
        'Regular security audits and penetration testing',
        'Secure data centers with physical security',
        'Employee training on data protection',
        'Incident response and breach notification procedures'
      ],
      riskAssessment: 'Medium risk - Financial and personal data processed with appropriate safeguards'
    }
  }
}

// Export singleton instance
export const gdprManager = new GDPRManager()
