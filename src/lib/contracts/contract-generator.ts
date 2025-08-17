import { logError, logInfo } from '@/lib/errors'

export interface ContractData {
  // Company Information
  seekerCompany: {
    name: string
    address: string
    contactName: string
    contactEmail: string
    contactPhone: string
  }
  providerCompany: {
    name: string
    address: string
    contactName: string
    contactEmail: string
    contactPhone: string
  }
  
  // Engagement Details
  projectTitle: string
  projectDescription: string
  startDate: Date
  endDate: Date
  rate: number
  currency: string
  totalAmount: number
  paymentTerms: string
  
  // Deliverables and Scope
  deliverables: string[]
  milestones: Array<{
    name: string
    description: string
    dueDate: Date
    amount: number
  }>
  
  // Terms and Conditions
  terminationClause: string
  confidentialityClause: string
  intellectualPropertyClause: string
  disputeResolutionClause: string
}

export class ContractGenerator {
  
  /**
   * Generate Master Service Agreement (MSA)
   */
  generateMSA(contractData: ContractData): string {
    const { seekerCompany, providerCompany } = contractData
    
    return `
MASTER SERVICE AGREEMENT

This Master Service Agreement ("MSA") is entered into on ${new Date().toLocaleDateString()} between:

CLIENT: ${seekerCompany.name}
Address: ${seekerCompany.address}
Contact: ${seekerCompany.contactName}
Email: ${seekerCompany.contactEmail}
Phone: ${seekerCompany.contactPhone}

SERVICE PROVIDER: ${providerCompany.name}
Address: ${providerCompany.address}
Contact: ${providerCompany.contactName}
Email: ${providerCompany.contactEmail}
Phone: ${providerCompany.contactPhone}

1. SCOPE OF SERVICES
The Service Provider agrees to provide professional services as detailed in individual Statements of Work (SOWs) executed under this MSA.

2. PAYMENT TERMS
- Payment terms shall be as specified in each SOW
- All payments processed through the Benchwarmers platform
- Platform fee of 15% applies to all transactions
- Payments held in escrow until completion verification

3. INTELLECTUAL PROPERTY
${contractData.intellectualPropertyClause || `
All work product, deliverables, and intellectual property created by Service Provider 
in connection with services shall be owned by Client upon full payment.
`}

4. CONFIDENTIALITY
${contractData.confidentialityClause || `
Both parties agree to maintain confidentiality of all proprietary information 
shared during the engagement.
`}

5. TERMINATION
${contractData.terminationClause || `
Either party may terminate this agreement with 30 days written notice. 
Termination fees may apply as specified in individual SOWs.
`}

6. DISPUTE RESOLUTION
${contractData.disputeResolutionClause || `
Any disputes shall be resolved through binding arbitration in accordance 
with the rules of the American Arbitration Association.
`}

7. LIMITATION OF LIABILITY
Service Provider's liability shall not exceed the total amount paid under the applicable SOW.

8. GOVERNING LAW
This agreement shall be governed by the laws of Delaware, United States.

By signing below, both parties agree to the terms of this Master Service Agreement.

CLIENT: _________________________    DATE: ___________
${seekerCompany.contactName}
${seekerCompany.name}

SERVICE PROVIDER: ________________    DATE: ___________
${providerCompany.contactName}
${providerCompany.name}
    `.trim()
  }

  /**
   * Generate Statement of Work (SOW)
   */
  generateSOW(contractData: ContractData): string {
    const { seekerCompany, providerCompany } = contractData
    
    const deliverablesSection = contractData.deliverables
      .map((deliverable, index) => `${index + 1}. ${deliverable}`)
      .join('\n')
    
    const milestonesSection = contractData.milestones
      .map((milestone, index) => 
        `${index + 1}. ${milestone.name} - Due: ${milestone.dueDate.toLocaleDateString()} - Amount: ${contractData.currency} ${milestone.amount.toLocaleString()}`
      )
      .join('\n')

    return `
STATEMENT OF WORK #SOW-${Date.now()}

This Statement of Work ("SOW") is executed under the Master Service Agreement between:

CLIENT: ${seekerCompany.name}
SERVICE PROVIDER: ${providerCompany.name}

PROJECT DETAILS:
Title: ${contractData.projectTitle}
Description: ${contractData.projectDescription}

ENGAGEMENT PERIOD:
Start Date: ${contractData.startDate.toLocaleDateString()}
End Date: ${contractData.endDate.toLocaleDateString()}

COMPENSATION:
Rate: ${contractData.currency} ${contractData.rate.toLocaleString()} per hour
Total Project Value: ${contractData.currency} ${contractData.totalAmount.toLocaleString()}
Payment Terms: ${contractData.paymentTerms}

DELIVERABLES:
${deliverablesSection}

MILESTONES AND PAYMENTS:
${milestonesSection}

ACCEPTANCE CRITERIA:
All deliverables must be completed to Client's reasonable satisfaction and meet the specifications outlined in this SOW.

CHANGE MANAGEMENT:
Any changes to scope, timeline, or budget must be agreed upon in writing by both parties through the Benchwarmers platform.

This SOW is effective upon electronic signature by both parties through the Benchwarmers platform.

Generated on: ${new Date().toISOString()}
Platform: Benchwarmers Marketplace
    `.trim()
  }

  /**
   * Generate complete contract package (MSA + SOW)
   */
  generateContractPackage(contractData: ContractData): {
    msa: string
    sow: string
    metadata: {
      generatedAt: Date
      contractId: string
      version: string
    }
  } {
    const contractId = `CONTRACT-${Date.now()}`
    
    logInfo('Generating contract package', {
      contractId,
      seekerCompany: contractData.seekerCompany.name,
      providerCompany: contractData.providerCompany.name,
      projectTitle: contractData.projectTitle
    })

    return {
      msa: this.generateMSA(contractData),
      sow: this.generateSOW(contractData),
      metadata: {
        generatedAt: new Date(),
        contractId,
        version: '1.0'
      }
    }
  }

  /**
   * Generate contract amendment
   */
  generateAmendment(
    originalContractId: string,
    changes: Partial<ContractData>,
    reason: string
  ): string {
    const amendmentId = `AMENDMENT-${Date.now()}`
    
    return `
CONTRACT AMENDMENT ${amendmentId}

Original Contract: ${originalContractId}
Amendment Date: ${new Date().toLocaleDateString()}
Reason for Amendment: ${reason}

CHANGES:
${Object.entries(changes).map(([key, value]) => 
  `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
).join('\n')}

This amendment modifies the original contract terms as specified above. 
All other terms remain in full force and effect.

Effective Date: ${new Date().toLocaleDateString()}
    `.trim()
  }

  /**
   * Validate contract data before generation
   */
  validateContractData(contractData: ContractData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields validation
    if (!contractData.seekerCompany?.name) errors.push('Seeker company name is required')
    if (!contractData.providerCompany?.name) errors.push('Provider company name is required')
    if (!contractData.projectTitle) errors.push('Project title is required')
    if (!contractData.projectDescription) errors.push('Project description is required')
    if (!contractData.startDate) errors.push('Start date is required')
    if (!contractData.endDate) errors.push('End date is required')
    if (!contractData.rate || contractData.rate <= 0) errors.push('Valid rate is required')
    if (!contractData.totalAmount || contractData.totalAmount <= 0) errors.push('Valid total amount is required')

    // Date validation
    if (contractData.startDate && contractData.endDate) {
      if (contractData.startDate >= contractData.endDate) {
        errors.push('End date must be after start date')
      }
    }

    // Deliverables validation
    if (!contractData.deliverables || contractData.deliverables.length === 0) {
      errors.push('At least one deliverable is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const contractGenerator = new ContractGenerator()
