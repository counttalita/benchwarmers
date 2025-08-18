# Interview Workflow Implementation

## Overview

This document describes the interview workflow implementation for the marketplace platform, which manages the process from initial matching to final acceptance and manual invoicing.

## Workflow Stages

### 1. Staged
- **Description**: Initial stage when a talent seeker has been matched with potential providers
- **Actions**: Talent seeker can review matches and decide to proceed to interview
- **Next Stages**: `interviewing`, `rejected`

### 2. Interviewing
- **Description**: Active interview process between talent seeker and provider
- **Actions**: 
  - Schedule interviews
  - Conduct interviews
  - Collect feedback
- **Next Stages**: `accepted`, `rejected`

### 3. Accepted
- **Description**: Interview successful, engagement is ready to proceed
- **Actions**: 
  - Triggers manual invoicing workflow
  - Sends notifications to all stakeholders
  - Prepares for active engagement
- **Next Stages**: `active` (admin only)

### 4. Rejected
- **Description**: Interview unsuccessful, engagement terminated
- **Actions**: 
  - Sends rejection notifications
  - Closes the engagement
- **Next Stages**: None (terminal state)

## API Endpoints

### Interview Management
- **POST** `/api/engagements/[id]/interview` - Update interview status
- **GET** `/api/engagements/[id]/interview` - Get interview details

### Admin Invoicing
- **GET** `/api/admin/invoicing` - List engagements requiring manual invoicing
- **POST** `/api/admin/invoicing` - Update invoicing status

## Manual Invoicing Process

When an engagement reaches `accepted` status, the following manual invoicing workflow is triggered:

### 1. Notification System
- **Admin Users**: Receive high-priority notification about manual invoicing requirement
- **Talent Seeker**: Receives payment requirement notification
- **All Stakeholders**: Receive status change notification

### 2. Manual Process Steps
1. **Talent Seeker Payment**: Platform invoices talent seeker for full amount
2. **Platform Receives Payment**: Talent seeker pays the platform
3. **Provider Invoice**: Talent provider invoices the platform
4. **Platform Pays Provider**: Platform pays talent provider minus 5% facilitation fee

### 3. Fee Structure
- **Total Amount**: Full engagement amount
- **Facilitation Fee**: 5% of total amount
- **Provider Payment**: 95% of total amount

## Database Schema Updates

### EngagementStatus Enum
```prisma
enum EngagementStatus {
  staged
  interviewing
  accepted
  rejected
  active
  completed
  terminated
  disputed
}
```

### NotificationType Enum
```prisma
enum NotificationType {
  // ... existing types
  engagement_status_changed
  manual_invoice_required
  payment_required
  // ... other types
}
```

### New Models
- **Invoice**: Tracks manual invoice generation and status
- **ManualPayment**: Tracks manual payment processing

## API Request/Response Examples

### Update Interview Status
```json
POST /api/engagements/engagement-123/interview
{
  "status": "interviewing",
  "notes": "Scheduling technical interview",
  "interviewDate": "2024-01-15T10:00:00Z",
  "interviewDuration": 60,
  "interviewerName": "John Doe",
  "interviewType": "video",
  "interviewLocation": "Zoom Meeting",
  "interviewNotes": "Focus on React and Node.js experience"
}
```

### Response
```json
{
  "success": true,
  "engagement": {
    "id": "engagement-123",
    "status": "interviewing",
    "updatedAt": "2024-01-10T15:30:00Z",
    "offer": {
      "id": "offer-456",
      "talentRequest": {
        "id": "request-789",
        "title": "Senior React Developer",
        "company": {
          "id": "company-1",
          "name": "TechCorp"
        }
      },
      "talentProfile": {
        "id": "profile-101",
        "name": "Jane Smith",
        "company": {
          "id": "company-2",
          "name": "DevStudio"
        }
      }
    }
  }
}
```

## Validation Rules

### Status Transitions
- `staged` → `interviewing`, `rejected`
- `interviewing` → `accepted`, `rejected`
- `accepted` → `active` (admin only)
- `rejected` → (terminal state)

### Interview Data Validation
- **Notes**: Max 1000 characters
- **Interview Duration**: 1-480 minutes
- **Interviewer Name**: Required when scheduling, max 100 characters
- **Interview Location**: Max 200 characters
- **Interview Notes**: Max 2000 characters

## Security & Permissions

### Access Control
- **Talent Seeker Company**: Can update engagements for their requests
- **Talent Provider Company**: Can update engagements for their profiles
- **Admin Users**: Can update any engagement and access invoicing endpoints

### Authentication
- All endpoints require valid user authentication
- Role-based access control for admin functions

## Testing

### Test Coverage
- Status transition validation
- Permission checks
- Notification triggering
- Manual invoicing workflow
- Error handling
- Input validation

### Test Files
- `__tests__/api/engagements/interview.test.ts`

## Future Enhancements

### Automation Opportunities
1. **Invoice Generation**: Automated PDF invoice creation
2. **Payment Tracking**: Integration with payment gateways
3. **Escrow System**: Automated escrow management
4. **Milestone Verification**: AI-powered milestone validation
5. **Tax Handling**: Automated tax calculations and reporting

### Integration Points
- **Email Service**: Automated invoice delivery
- **Payment Gateways**: Direct payment processing
- **Accounting Systems**: Automated bookkeeping
- **CRM Integration**: Customer relationship management

## Monitoring & Logging

### Key Metrics
- Interview success rates
- Time to acceptance
- Manual invoicing processing time
- Payment processing efficiency

### Log Events
- Status changes with user context
- Manual invoicing actions
- Payment processing events
- Error conditions and resolutions

## Deployment Notes

### Environment Variables
- Ensure notification service is configured
- Verify email service settings
- Check payment gateway configurations

### Database Migration
- Run `npx prisma generate` after schema updates
- Verify enum values are correctly applied
- Test notification type compatibility
