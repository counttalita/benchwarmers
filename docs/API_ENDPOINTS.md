# API Endpoints Documentation

## Overview
This document provides comprehensive documentation for all API endpoints in Talent Brew, a B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://benchwarmers.com/api`

## Authentication
All API endpoints require authentication via NextAuth.js session cookies or JWT tokens.

```typescript
// Headers for authenticated requests
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

## Response Format
All API responses follow a consistent format:

```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: any[]
  message?: string
  correlationId: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

## Companies API

### GET /api/companies
List companies with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `verified` (boolean): Filter by verification status
- `industry` (string): Filter by industry
- `size` (string): Filter by company size

**Response:**
```typescript
{
  success: true,
  data: Company[],
  pagination: PaginationInfo
}
```

### POST /api/companies
Create a new company.

**Request Body:**
```typescript
{
  name: string
  domain: string
  industry?: string
  size?: CompanySize
  description?: string
  website?: string
  address?: string
  contactEmail?: string
  contactPhone?: string
}
```

**Response:**
```typescript
{
  success: true,
  data: Company,
  message: "Company created successfully"
}
```

### GET /api/companies/[id]
Get company details by ID.

**Response:**
```typescript
{
  success: true,
  data: Company & {
    users: User[]
    talentRequests: TalentRequest[]
    profiles: Profile[]
  }
}
```

### PATCH /api/companies/[id]
Update company information.

**Request Body:**
```typescript
{
  name?: string
  description?: string
  website?: string
  logoUrl?: string
  // ... other updatable fields
}
```

## Talent Requests API

### GET /api/requests
List talent requests with filtering.

**Query Parameters:**
- `companyId` (string): Filter by company
- `status` (string): Filter by status
- `projectType` (string): Filter by project type
- `industry` (string): Filter by industry
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```typescript
{
  success: true,
  data: TalentRequest[],
  pagination: PaginationInfo
}
```

### POST /api/requests
Create a new talent request.

**Request Body:**
```typescript
{
  title: string
  description: string
  industry: string
  projectType: ProjectType
  workStyle: WorkStyle
  experienceLevel: ExperienceLevel
  budget?: number
  budgetType?: BudgetType
  currency?: string
  timeline?: string
  startDate?: string
  endDate?: string
  requirements?: object
  deliverables: string[]
}
```

### GET /api/requests/[id]
Get talent request details.

**Response:**
```typescript
{
  success: true,
  data: TalentRequest & {
    company: Company
    matches: Match[]
  }
}
```

### PATCH /api/requests/[id]
Update talent request.

**Request Body:**
```typescript
{
  status?: RequestStatus
  title?: string
  description?: string
  // ... other updatable fields
}
```

## Profiles API

### GET /api/profiles
List talent profiles with filtering.

**Query Parameters:**
- `companyId` (string): Filter by company
- `skills` (string[]): Filter by skills
- `verified` (boolean): Filter by verification status
- `availability` (string): Filter by availability
- `minRate` (number): Minimum hourly rate
- `maxRate` (number): Maximum hourly rate

### POST /api/profiles
Create a new talent profile.

**Request Body:**
```typescript
{
  name: string
  title?: string
  bio?: string
  skills: string[]
  specialties?: string[]
  experience?: object
  portfolio?: object
  hourlyRate?: number
  projectRate?: number
  availability?: string
  timezone?: string
  languages?: string[]
  certifications?: string[]
  socialMedia?: object
}
```

## Matching API

### GET /api/matches
Get matches with filtering.

**Query Parameters:**
- `requestId` (string): Filter by talent request
- `profileId` (string): Filter by profile
- `status` (string): Filter by match status
- `minScore` (number): Minimum match score
- `companyId` (string): Filter by company

**Response:**
```typescript
{
  success: true,
  data: Match & {
    request: TalentRequest
    profile: Profile
    offers: Offer[]
  }[]
}
```

### POST /api/matches/generate
Generate matches for a talent request.

**Request Body:**
```typescript
{
  requestId: string
  maxMatches?: number
  minScore?: number
}
```

### PATCH /api/matches/[matchId]
Update match status.

**Request Body:**
```typescript
{
  status: MatchStatus
  seekerInterest?: boolean
  providerInterest?: boolean
}
```

## Offers API

### GET /api/offers
List offers with filtering.

**Query Parameters:**
- `matchId` (string): Filter by match
- `seekerCompanyId` (string): Filter by seeker company
- `providerCompanyId` (string): Filter by provider company
- `status` (string): Filter by offer status

**Response:**
```typescript
{
  success: true,
  data: Offer & {
    match: Match & {
      request: TalentRequest
      profile: Profile
    }
    seekerCompany: Company
    providerCompany: Company
  }[]
}
```

### POST /api/offers
Create a new offer.

**Request Body:**
```typescript
{
  matchId: string
  rate: number
  rateType?: RateType
  currency?: string
  startDate: string
  endDate?: string
  durationWeeks?: number
  estimatedHours?: number
  terms?: string
  deliverables: string[]
  milestones?: object[]
  paymentTerms?: string
  expiresAt?: string
}
```

### GET /api/offers/[id]
Get offer details.

**Response:**
```typescript
{
  success: true,
  data: Offer & {
    match: Match & {
      request: TalentRequest
      profile: Profile
    }
    seekerCompany: Company
    providerCompany: Company
    contracts: Contract[]
  }
}
```

### PATCH /api/offers/[id]
Update offer (accept/decline/counter).

**Request Body:**
```typescript
{
  action: "accept" | "decline" | "counter"
  rejectionReason?: string
  counterOffer?: {
    rate?: number
    startDate?: string
    durationWeeks?: number
    terms?: string
    deliverables?: string[]
  }
}
```

### DELETE /api/offers/[id]
Cancel/withdraw an offer.

**Query Parameters:**
- `reason` (string): Cancellation reason

## Contracts API

### GET /api/contracts
List contracts with filtering.

**Query Parameters:**
- `offerId` (string): Filter by offer
- `status` (string): Filter by contract status
- `companyId` (string): Filter by company (seeker or provider)

### POST /api/contracts
Generate a new contract.

**Request Body:**
```typescript
{
  offerId: string
  contractType?: "msa" | "sow" | "both"
  deliverables: string[]
  milestones?: Array<{
    name: string
    description: string
    dueDate: string
    amount: number
  }>
  paymentTerms?: string
  customTerms?: {
    terminationClause?: string
    confidentialityClause?: string
    intellectualPropertyClause?: string
    disputeResolutionClause?: string
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    contractId: string
    msa?: string
    sow?: string
    metadata: {
      generatedAt: string
      contractId: string
      version: string
    }
    status: string
  }
}
```

### GET /api/contracts/[id]
Get contract details.

### PATCH /api/contracts/[id]
Update contract status or add signatures.

**Request Body:**
```typescript
{
  status?: ContractStatus
  seekerSignature?: {
    signedAt: string
    signedBy: string
    ipAddress?: string
    userAgent?: string
  }
  providerSignature?: {
    signedAt: string
    signedBy: string
    ipAddress?: string
    userAgent?: string
  }
}
```

### POST /api/contracts/[id]/sign
Send contract for e-signature.

**Request Body:**
```typescript
{
  signers: Array<{
    name: string
    email: string
    role: "seeker" | "provider"
  }>
  callbackUrl?: string
  expirationDays?: number
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    contractId: string
    envelopeId: string
    signingUrls: Array<{
      email: string
      url: string
    }>
    status: string
  }
}
```

### DELETE /api/contracts/[id]
Cancel/void a contract.

**Query Parameters:**
- `reason` (string): Cancellation reason

## Engagements API

### GET /api/engagements
List engagements with filtering.

**Query Parameters:**
- `contractId` (string): Filter by contract
- `status` (string): Filter by engagement status
- `companyId` (string): Filter by company
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date

### POST /api/engagements
Create a new engagement.

**Request Body:**
```typescript
{
  contractId: string
  startDate: string
  endDate?: string
  currentPhase?: string
  nextMilestone?: string
}
```

### GET /api/engagements/[id]
Get engagement details.

**Response:**
```typescript
{
  success: true,
  data: Engagement & {
    contract: Contract & {
      offer: Offer
    }
    payments: Payment[]
    timesheets: TimesheetEntry[]
    verifications: EngagementVerification[]
  }
}
```

### PATCH /api/engagements/[id]
Update engagement status.

**Request Body:**
```typescript
{
  status: EngagementStatus
  terminationReason?: string
  disputeReason?: string
  progressPercent?: number
  currentPhase?: string
  nextMilestone?: string
}
```

### POST /api/engagements/[id]/complete
Complete engagement and release payment.

**Request Body:**
```typescript
{
  deliverables: string[]
  approvedBy: string
  notes?: string
  releasePayment?: boolean
  partialAmount?: number
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    engagementId: string
    status: "completed"
    completedAt: string
    paymentReleased: boolean
    verificationId: string
  }
}
```

## Payments API

### GET /api/payments
List payments with filtering.

**Query Parameters:**
- `engagementId` (string): Filter by engagement
- `status` (string): Filter by payment status
- `type` (string): Filter by payment type

### POST /api/payments/release
Release payment from escrow.

**Request Body:**
```typescript
{
  engagementId: string
  amount: number
  currency?: string
  reason: "completion" | "milestone" | "partial" | "dispute_resolution"
  verificationData?: {
    deliverables: string[]
    approvedBy: string
    approvedAt: string
    notes?: string
  }
  milestoneId?: string
}
```

### POST /api/payments/hold
Hold payment in escrow.

**Request Body:**
```typescript
{
  engagementId: string
  amount: number
  currency?: string
  reason: "dispute" | "quality_issue" | "breach_of_contract"
  holdUntil?: string
  notes?: string
}
```

### GET /api/payments/[id]
Get payment details.

## Timesheets API

### GET /api/timesheets
Get timesheet entries with filtering.

**Query Parameters:**
- `engagementId` (string): Required - Filter by engagement
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date
- `status` (string): Filter by timesheet status
- `billableOnly` (boolean): Show only billable entries
- `weekStarting` (string): Get weekly summary

**Response (entries):**
```typescript
{
  success: true,
  data: TimesheetEntry[]
}
```

**Response (weekly summary):**
```typescript
{
  success: true,
  data: {
    engagementId: string
    weekStarting: string
    totalHours: number
    billableHours: number
    entries: TimesheetEntry[]
    status: "draft" | "submitted" | "approved" | "rejected"
    submittedAt?: string
    approvedAt?: string
  }
}
```

### POST /api/timesheets
Create timesheet entry or submit timesheet.

**Create Entry Request:**
```typescript
{
  engagementId: string
  date: string
  startTime: string
  endTime: string
  description: string
  taskCategory?: string
  billable?: boolean
}
```

**Submit Timesheet Request:**
```typescript
{
  action: "submit"
  engagementId: string
  weekStarting: string
}
```

### PATCH /api/timesheets/[id]
Update timesheet entry.

**Request Body:**
```typescript
{
  description?: string
  taskCategory?: string
  billable?: boolean
  status?: TimesheetStatus
}
```

### POST /api/timesheets/approve
Approve or reject timesheet entries.

**Request Body:**
```typescript
{
  entryIds: string[]
  action: "approve" | "reject"
  approvedBy: string
  rejectionReason?: string
}
```

## Admin API

### GET /api/admin/dashboard
Get admin dashboard metrics.

**Response:**
```typescript
{
  success: true,
  data: {
    totalCompanies: number
    activeEngagements: number
    totalRevenue: number
    pendingVerifications: number
    recentActivity: Activity[]
    systemHealth: {
      apiResponseTime: number
      databaseConnections: number
      errorRate: number
    }
  }
}
```

### GET /api/admin/companies
List all companies with admin details.

**Query Parameters:**
- `status` (string): Filter by company status
- `verified` (boolean): Filter by verification status
- `page` (number): Page number
- `limit` (number): Items per page

### PATCH /api/admin/companies/[id]
Admin update company (verify, suspend, etc.).

**Request Body:**
```typescript
{
  status?: CompanyStatus
  verified?: boolean
  notes?: string
}
```

### GET /api/admin/engagements
List all engagements with admin details.

### POST /api/admin/engagements/[id]/resolve-dispute
Resolve engagement dispute.

**Request Body:**
```typescript
{
  resolution: string
  paymentAction: "release" | "hold" | "refund"
  notes?: string
}
```

## Error Responses

### Validation Error (400)
```typescript
{
  success: false,
  error: "Validation failed",
  details: [
    {
      field: "email",
      message: "Invalid email format"
    }
  ],
  correlationId: "uuid"
}
```

### Authentication Error (401)
```typescript
{
  success: false,
  error: "Authentication required",
  correlationId: "uuid"
}
```

### Authorization Error (403)
```typescript
{
  success: false,
  error: "Insufficient permissions",
  correlationId: "uuid"
}
```

### Not Found Error (404)
```typescript
{
  success: false,
  error: "Resource not found",
  correlationId: "uuid"
}
```

### Internal Server Error (500)
```typescript
{
  success: false,
  error: "Internal server error",
  correlationId: "uuid"
}
```

## Rate Limiting
- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **File uploads**: 5 requests per minute per user
- **Admin API**: 200 requests per minute per admin user

## Webhooks

### DocuSign Webhook
**Endpoint**: `POST /api/webhooks/docusign`

Receives signature status updates from DocuSign.

### Stripe Webhook
**Endpoint**: `POST /api/webhooks/stripe`

Receives payment status updates from Stripe.

## SDK Examples

### JavaScript/TypeScript
```typescript
import { BenchwarmerAPI } from '@benchwarmers/sdk'

const api = new BenchwarmerAPI({
  baseUrl: 'https://api.benchwarmers.com',
  apiKey: 'your-api-key'
})

// Create an offer
const offer = await api.offers.create({
  matchId: 'match-123',
  rate: 150,
  startDate: '2024-01-01',
  deliverables: ['Website design', 'Brand guidelines']
})

// Get engagement details
const engagement = await api.engagements.get('eng-456')
```

### cURL Examples
```bash
# Create a talent request
curl -X POST https://api.benchwarmers.com/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Social Media Manager",
    "description": "Looking for experienced social media manager",
    "projectType": "SOCIAL_MEDIA_MANAGEMENT",
    "budget": 5000,
    "deliverables": ["Content calendar", "Monthly reports"]
  }'

# Get offers
curl -X GET "https://api.benchwarmers.com/api/offers?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```
