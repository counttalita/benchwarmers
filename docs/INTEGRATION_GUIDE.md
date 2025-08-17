# Integration Guide

## Overview
This document provides comprehensive integration guidance for external services and APIs used in BenchWarmers, a B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills.

## Table of Contents
1. [DocuSign E-signature Integration](#docusign-e-signature-integration)
2. [Stripe Payment Processing](#stripe-payment-processing)
3. [SendGrid Email Service](#sendgrid-email-service)
4. [Authentication & Security](#authentication--security)
5. [Webhook Management](#webhook-management)
6. [Environment Configuration](#environment-configuration)
7. [Testing & Development](#testing--development)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

## DocuSign E-signature Integration

### Setup Requirements
1. **DocuSign Developer Account**
   - Create account at [developers.docusign.com](https://developers.docusign.com)
   - Generate integration key (client ID)
   - Configure redirect URIs for OAuth
   - Set up webhook endpoints

2. **Authentication Setup**
   ```typescript
   // OAuth 2.0 Configuration
   const docusignConfig = {
     clientId: process.env.DOCUSIGN_CLIENT_ID,
     clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
     redirectUri: process.env.DOCUSIGN_REDIRECT_URI,
     baseUrl: process.env.DOCUSIGN_BASE_URL, // demo or production
     accountId: process.env.DOCUSIGN_ACCOUNT_ID
   }
   ```

### Implementation Steps

#### 1. OAuth Authentication Flow
```typescript
// Initialize OAuth flow
const authUrl = `${docusignConfig.baseUrl}/oauth/auth?` +
  `response_type=code&` +
  `scope=signature&` +
  `client_id=${docusignConfig.clientId}&` +
  `redirect_uri=${encodeURIComponent(docusignConfig.redirectUri)}`

// Handle callback and exchange code for token
async function exchangeCodeForToken(code: string) {
  const response = await fetch(`${docusignConfig.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${docusignConfig.clientId}:${docusignConfig.clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: docusignConfig.redirectUri
    })
  })
  
  return await response.json()
}
```

#### 2. Envelope Creation and Sending
```typescript
async function createAndSendEnvelope(contractData: ContractData) {
  const envelopeDefinition = {
    emailSubject: `Contract Signature Required - ${contractData.projectTitle}`,
    documents: [{
      documentId: '1',
      name: `${contractData.projectTitle}-Contract.pdf`,
      documentBase64: contractData.documentContent,
      fileExtension: 'pdf'
    }],
    recipients: {
      signers: contractData.signers.map((signer, index) => ({
        email: signer.email,
        name: signer.name,
        recipientId: (index + 1).toString(),
        routingOrder: signer.routingOrder.toString(),
        tabs: {
          signHereTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '100',
            yPosition: '100'
          }],
          dateSignedTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '300',
            yPosition: '100'
          }]
        }
      }))
    },
    status: 'sent'
  }

  const response = await fetch(`${docusignConfig.baseUrl}/v2.1/accounts/${docusignConfig.accountId}/envelopes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envelopeDefinition)
  })

  return await response.json()
}
```

#### 3. Webhook Configuration
```typescript
// Webhook endpoint for DocuSign events
export async function POST(request: NextRequest) {
  const webhookData = await request.json()
  
  // Verify webhook authenticity
  const isValid = verifyDocuSignWebhook(request.headers, webhookData)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 })
  }

  // Process envelope status changes
  const result = await docuSignIntegration.processWebhook(webhookData)
  
  return NextResponse.json({ success: true })
}
```

### Environment Variables
```env
DOCUSIGN_CLIENT_ID=your_integration_key
DOCUSIGN_CLIENT_SECRET=your_client_secret
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_REDIRECT_URI=https://yourapp.com/auth/docusign/callback
DOCUSIGN_WEBHOOK_SECRET=your_webhook_secret
```

## Stripe Payment Processing

### Setup Requirements
1. **Stripe Account Setup**
   - Create Stripe account
   - Enable Stripe Connect for marketplace
   - Configure webhooks
   - Set up test and production environments

2. **Connect Platform Configuration**
   ```typescript
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
     apiVersion: '2023-10-16'
   })
   ```

### Implementation Steps

#### 1. Connect Account Creation
```typescript
async function createConnectedAccount(companyData: CompanyData) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: companyData.contactEmail,
    business_type: 'company',
    company: {
      name: companyData.name,
      tax_id: companyData.taxId,
      address: {
        line1: companyData.address.line1,
        city: companyData.address.city,
        state: companyData.address.state,
        postal_code: companyData.address.postalCode,
        country: 'US'
      }
    },
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true }
    }
  })

  return account
}
```

#### 2. Onboarding Link Generation
```typescript
async function createOnboardingLink(accountId: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.BASE_URL}/stripe/reauth`,
    return_url: `${process.env.BASE_URL}/stripe/return`,
    type: 'account_onboarding'
  })

  return accountLink.url
}
```

#### 3. Payment Processing
```typescript
// Create payment intent for escrow
async function createEscrowPayment(offerData: OfferData) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(offerData.totalAmount * 100), // Convert to cents
    currency: offerData.currency.toLowerCase(),
    payment_method_types: ['card'],
    metadata: {
      offerId: offerData.id,
      engagementId: offerData.engagementId,
      type: 'escrow'
    },
    on_behalf_of: offerData.providerStripeAccountId,
    transfer_data: {
      destination: offerData.providerStripeAccountId
    }
  })

  return paymentIntent
}

// Release payment to provider
async function releasePayment(paymentData: PaymentReleaseData) {
  const transfer = await stripe.transfers.create({
    amount: Math.round(paymentData.amount * 100),
    currency: paymentData.currency.toLowerCase(),
    destination: paymentData.providerStripeAccountId,
    metadata: {
      engagementId: paymentData.engagementId,
      reason: paymentData.reason
    }
  })

  return transfer
}
```

#### 4. Webhook Handling
```typescript
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
      break
    case 'transfer.created':
      await handleTransferCreated(event.data.object as Stripe.Transfer)
      break
    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account)
      break
  }

  return NextResponse.json({ received: true })
}
```

### Environment Variables
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

## SendGrid Email Service

### Setup Requirements
1. **SendGrid Account**
   - Create SendGrid account
   - Generate API key
   - Verify sender domains
   - Create email templates

2. **Template Configuration**
   ```typescript
   const emailTemplates = {
     MATCH_NOTIFICATION: 'd-1234567890abcdef',
     OFFER_RECEIVED: 'd-abcdef1234567890',
     CONTRACT_SIGNED: 'd-567890abcdef1234',
     PAYMENT_RELEASED: 'd-cdef1234567890ab'
   }
   ```

### Implementation Steps

#### 1. Email Service Setup
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

class EmailService {
  async sendTemplatedEmail(templateData: EmailTemplateData) {
    const msg = {
      to: templateData.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'Benchwarmers'
      },
      templateId: templateData.templateId,
      dynamicTemplateData: templateData.data
    }

    try {
      await sgMail.send(msg)
      logInfo('Email sent successfully', { to: templateData.to, templateId: templateData.templateId })
    } catch (error) {
      logError('Email send failed', { error, templateData })
      throw error
    }
  }
}
```

#### 2. Notification System
```typescript
async function sendMatchNotification(matchData: MatchData) {
  await emailService.sendTemplatedEmail({
    to: matchData.providerEmail,
    templateId: emailTemplates.MATCH_NOTIFICATION,
    data: {
      providerName: matchData.providerName,
      projectTitle: matchData.projectTitle,
      seekerCompany: matchData.seekerCompany,
      matchScore: matchData.matchScore,
      viewMatchUrl: `${process.env.BASE_URL}/matches/${matchData.matchId}`
    }
  })
}
```

#### 3. Batch Email Processing
```typescript
async function processBatchEmails(emailBatch: EmailBatch[]) {
  const messages = emailBatch.map(email => ({
    to: email.to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    templateId: email.templateId,
    dynamicTemplateData: email.data
  }))

  try {
    await sgMail.send(messages)
    logInfo('Batch emails sent', { count: messages.length })
  } catch (error) {
    logError('Batch email failed', { error, count: messages.length })
  }
}
```

### Environment Variables
```env
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=noreply@benchwarmers.com
SENDGRID_FROM_NAME=Benchwarmers
```

## Authentication & Security

### NextAuth.js Configuration
```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async session({ session, user }) {
      // Add company information to session
      const company = await prisma.company.findFirst({
        where: { users: { some: { email: user.email } } }
      })
      
      session.user.companyId = company?.id
      session.user.role = user.role
      
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
})
```

### API Route Protection
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

export async function authenticateRequest(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  return session
}

// Usage in API routes
export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request)
    // Proceed with authenticated request
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

## Webhook Management

### Webhook Security
```typescript
import crypto from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

### Webhook Retry Logic
```typescript
class WebhookProcessor {
  async processWithRetry(
    webhookData: any,
    maxRetries: number = 3
  ): Promise<void> {
    let attempts = 0
    
    while (attempts < maxRetries) {
      try {
        await this.processWebhook(webhookData)
        return
      } catch (error) {
        attempts++
        
        if (attempts >= maxRetries) {
          logError('Webhook processing failed after retries', {
            error,
            attempts,
            webhookData
          })
          throw error
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempts) * 1000)
        )
      }
    }
  }
}
```

## Environment Configuration

### Development Environment
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/benchwarmers_dev"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# DocuSign (Demo)
DOCUSIGN_CLIENT_ID="your-demo-integration-key"
DOCUSIGN_CLIENT_SECRET="your-demo-client-secret"
DOCUSIGN_BASE_URL="https://demo.docusign.net/restapi"
DOCUSIGN_ACCOUNT_ID="your-demo-account-id"

# Stripe (Test)
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# SendGrid
SENDGRID_API_KEY="SG.your-api-key"
SENDGRID_FROM_EMAIL="dev@benchwarmers.com"
```

### Production Environment
```env
# Database
DATABASE_URL="postgresql://user:password@prod-db:5432/benchwarmers_prod"

# Authentication
NEXTAUTH_URL="https://benchwarmers.com"
NEXTAUTH_SECRET="your-production-secret"

# DocuSign (Production)
DOCUSIGN_BASE_URL="https://www.docusign.net/restapi"

# Stripe (Live)
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."

# Additional Production Settings
NODE_ENV="production"
LOG_LEVEL="info"
REDIS_URL="redis://prod-redis:6379"
```

## Testing & Development

### Integration Testing
```typescript
// __tests__/integrations/docusign.test.ts
import { docuSignIntegration } from '@/lib/esignature/docusign-integration'

describe('DocuSign Integration', () => {
  it('should create envelope successfully', async () => {
    const mockContractData = {
      contractId: 'test-contract-123',
      documentName: 'Test Contract',
      documentContent: 'base64-encoded-content',
      signers: [
        { name: 'John Doe', email: 'john@example.com', role: 'seeker', routingOrder: 1 },
        { name: 'Jane Smith', email: 'jane@example.com', role: 'provider', routingOrder: 2 }
      ]
    }

    const result = await docuSignIntegration.sendForSignature(mockContractData)
    
    expect(result.success).toBe(true)
    expect(result.envelopeId).toBeDefined()
    expect(result.signingUrls).toHaveLength(2)
  })
})
```

### Mock Services for Development
```typescript
// lib/mocks/stripe-mock.ts
export class MockStripeService {
  async createPaymentIntent(data: any) {
    return {
      id: `pi_mock_${Date.now()}`,
      status: 'succeeded',
      amount: data.amount,
      currency: data.currency
    }
  }

  async createTransfer(data: any) {
    return {
      id: `tr_mock_${Date.now()}`,
      amount: data.amount,
      destination: data.destination
    }
  }
}
```

## Monitoring & Troubleshooting

### Integration Health Checks
```typescript
class IntegrationHealthChecker {
  async checkDocuSignHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${process.env.DOCUSIGN_BASE_URL}/v2.1/accounts/${process.env.DOCUSIGN_ACCOUNT_ID}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      
      return {
        service: 'DocuSign',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        service: 'DocuSign',
        status: 'error',
        error: error.message
      }
    }
  }

  async checkStripeHealth(): Promise<HealthStatus> {
    try {
      const account = await stripe.accounts.retrieve()
      
      return {
        service: 'Stripe',
        status: 'healthy',
        details: { accountId: account.id }
      }
    } catch (error) {
      return {
        service: 'Stripe',
        status: 'error',
        error: error.message
      }
    }
  }
}
```

### Error Tracking and Logging
```typescript
import { logError, logInfo } from '@/lib/errors'

class IntegrationLogger {
  logApiCall(service: string, endpoint: string, duration: number, success: boolean) {
    logInfo('API call completed', {
      service,
      endpoint,
      duration,
      success,
      timestamp: new Date().toISOString()
    })
  }

  logIntegrationError(service: string, operation: string, error: any) {
    logError(`${service} integration error`, {
      service,
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }
}
```

### Common Troubleshooting

#### DocuSign Issues
- **Authentication Failures**: Check token expiration, refresh tokens
- **Envelope Creation Errors**: Validate document format, signer information
- **Webhook Delivery**: Verify endpoint accessibility, signature validation

#### Stripe Issues
- **Payment Failures**: Check account status, payment method validity
- **Connect Account Issues**: Verify onboarding completion, capability status
- **Webhook Processing**: Validate webhook signatures, handle idempotency

#### SendGrid Issues
- **Delivery Failures**: Check sender reputation, recipient validity
- **Template Errors**: Validate template data, dynamic content
- **Rate Limiting**: Implement proper queuing and retry logic

### Performance Optimization
- **Connection Pooling**: Reuse HTTP connections for API calls
- **Caching**: Cache authentication tokens, account information
- **Batch Processing**: Group operations where possible
- **Async Processing**: Use queues for non-critical operations
- **Circuit Breakers**: Implement failure handling for external services
