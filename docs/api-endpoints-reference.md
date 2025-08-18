# API Endpoints Reference

## Overview

This document provides a comprehensive reference for all API endpoints in the marketplace platform, with special focus on the new engagement management and admin functionality.

## Authentication

All API endpoints require authentication unless otherwise specified. Include the following headers:

```
Authorization: Bearer <token>
Content-Type: application/json
```

## Admin Endpoints

### 1. Admin Engagements

#### GET `/api/admin/engagements`

Retrieves all engagements with statistics for admin dashboard.

**Query Parameters:**
- `status` (optional): Filter by engagement status
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Response:**
```json
{
  "engagements": [
    {
      "id": "string",
      "status": "staged|interviewing|accepted|rejected|active|completed|terminated|disputed",
      "createdAt": "ISO string",
      "updatedAt": "ISO string",
      "talentRequest": {
        "id": "string",
        "title": "string",
        "company": {
          "id": "string",
          "name": "string"
        }
      },
      "talentProfile": {
        "id": "string",
        "name": "string",
        "title": "string",
        "company": {
          "id": "string",
          "name": "string"
        }
      },
      "interviewDetails": {
        "interviewDate": "ISO string",
        "interviewDuration": "number",
        "interviewerName": "string",
        "interviewType": "phone|video|in_person",
        "interviewLocation": "string",
        "interviewNotes": "string"
      },
      "totalAmount": "number",
      "facilitationFee": "number",
      "netAmount": "number"
    }
  ],
  "stats": {
    "total": "number",
    "staged": "number",
    "interviewing": "number",
    "accepted": "number",
    "active": "number",
    "completed": "number",
    "rejected": "number",
    "terminated": "number",
    "disputed": "number",
    "needsInvoice": "number"
  },
  "pagination": {
    "page": "number",
    "limit": "number",
    "totalCount": "number",
    "totalPages": "number"
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (non-admin user)

### 2. Admin Invoicing

#### GET `/api/admin/invoicing`

Retrieves engagements requiring manual invoice processing.

**Query Parameters:**
- `status` (optional): Filter by invoice status
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "status": "string",
      "totalAmount": "number",
      "facilitationFee": "number",
      "netAmount": "number",
      "createdAt": "ISO string",
      "updatedAt": "ISO string",
      "talentRequest": {
        "id": "string",
        "title": "string",
        "company": {
          "id": "string",
          "name": "string"
        }
      },
      "talentProfile": {
        "id": "string",
        "name": "string",
        "company": {
          "id": "string",
          "name": "string"
        }
      }
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "totalCount": "number",
    "totalPages": "number"
  }
}
```

#### POST `/api/admin/invoicing`

Updates invoice processing status for engagements.

**Request Body:**
```json
{
  "engagementId": "string",
  "invoiceStatus": "sent|paid|overdue",
  "invoiceNumber": "string",
  "sentDate": "ISO string",
  "paidDate": "ISO string",
  "notes": "string",
  "seekerInvoiceSent": "boolean",
  "providerInvoiceSent": "boolean",
  "seekerPaymentReceived": "boolean",
  "providerPaymentSent": "boolean"
}
```

**Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "engagement": {
    "id": "string",
    "invoiceStatus": "string",
    "updatedAt": "ISO string"
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid data)
- `401`: Unauthorized
- `403`: Forbidden (non-admin user)
- `404`: Engagement not found

### 3. Admin Companies

#### GET `/api/admin/companies`

Retrieves companies for admin approval management.

**Query Parameters:**
- `status` (optional): Filter by company status
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for company name/domain
- `type` (optional): Filter by company type
- `domainVerified` (optional): Filter by domain verification status

**Response:**
```json
{
  "companies": [
    {
      "id": "string",
      "name": "string",
      "domain": "string",
      "type": "provider|seeker|both",
      "status": "pending|active|suspended",
      "domainVerified": "boolean",
      "domainVerifiedAt": "ISO string",
      "createdAt": "ISO string",
      "users": [
        {
          "id": "string",
          "name": "string",
          "email": "string",
          "phoneNumber": "string",
          "phoneVerified": "boolean",
          "createdAt": "ISO string"
        }
      ]
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "totalCount": "number",
    "totalPages": "number"
  }
}
```

#### POST `/api/admin/companies`

Approves or rejects company applications.

**Request Body:**
```json
{
  "companyId": "string",
  "action": "approve|reject",
  "reason": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "company": {
    "id": "string",
    "status": "string",
    "updatedAt": "ISO string"
  }
}
```

## Engagement Endpoints

### 1. Engagement Management

#### GET `/api/engagements`

Retrieves engagements for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by engagement status
- `companyId` (optional): Filter by company ID
- `talentProfileId` (optional): Filter by talent profile ID
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Response:**
```json
{
  "engagements": [
    {
      "id": "string",
      "status": "string",
      "createdAt": "ISO string",
      "updatedAt": "ISO string",
      "talentRequest": {
        "id": "string",
        "title": "string",
        "company": {
          "id": "string",
          "name": "string"
        }
      },
      "talentProfile": {
        "id": "string",
        "name": "string",
        "title": "string",
        "company": {
          "id": "string",
          "name": "string"
        }
      }
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "totalCount": "number",
    "totalPages": "number"
  }
}
```

#### POST `/api/engagements`

Creates a new engagement.

**Request Body:**
```json
{
  "requestId": "string",
  "talentProfileId": "string",
  "status": "staged|interviewing|accepted|rejected"
}
```

**Response:**
```json
{
  "success": "boolean",
  "engagement": {
    "id": "string",
    "status": "string",
    "createdAt": "ISO string",
    "updatedAt": "ISO string",
    "talentRequest": {
      "id": "string",
      "title": "string",
      "seekerCompany": {
        "id": "string",
        "name": "string"
      }
    },
    "talentProfile": {
      "id": "string",
      "user": {
        "id": "string",
        "name": "string"
      }
    }
  }
}
```

#### GET `/api/engagements/[id]`

Retrieves a specific engagement by ID.

**Response:**
```json
{
  "success": "boolean",
  "engagement": {
    "id": "string",
    "status": "string",
    "createdAt": "ISO string",
    "updatedAt": "ISO string",
    "talentRequest": {
      "id": "string",
      "title": "string",
      "description": "string",
      "company": {
        "id": "string",
        "name": "string"
      }
    },
    "talentProfile": {
      "id": "string",
      "name": "string",
      "title": "string",
      "company": {
        "id": "string",
        "name": "string"
      }
    },
    "interviewDetails": {
      "interviewDate": "ISO string",
      "interviewDuration": "number",
      "interviewerName": "string",
      "interviewType": "phone|video|in_person",
      "interviewLocation": "string",
      "interviewNotes": "string"
    }
  }
}
```

#### PUT `/api/engagements/[id]`

Updates an engagement.

**Request Body:**
```json
{
  "status": "string",
  "totalHours": "number",
  "completionNotes": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "engagement": {
    "id": "string",
    "status": "string",
    "totalHours": "number",
    "completionNotes": "string",
    "updatedAt": "ISO string"
  }
}
```

### 2. Engagement Interview Management

#### POST `/api/engagements/[id]/interview`

Updates engagement interview status and triggers notifications.

**Request Body:**
```json
{
  "status": "staged|interviewing|accepted|rejected",
  "notes": "string",
  "interviewDate": "ISO string",
  "interviewDuration": "number",
  "interviewerName": "string",
  "interviewType": "phone|video|in_person",
  "interviewLocation": "string",
  "interviewNotes": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "engagement": {
    "id": "string",
    "status": "string",
    "interviewDetails": {
      "interviewDate": "ISO string",
      "interviewDuration": "number",
      "interviewerName": "string",
      "interviewType": "string",
      "interviewLocation": "string",
      "interviewNotes": "string"
    },
    "updatedAt": "ISO string"
  },
  "notifications": [
    {
      "id": "string",
      "type": "string",
      "title": "string",
      "message": "string"
    }
  ]
}
```

#### GET `/api/engagements/[id]/interview`

Retrieves engagement interview details.

**Response:**
```json
{
  "success": "boolean",
  "interviewDetails": {
    "interviewDate": "ISO string",
    "interviewDuration": "number",
    "interviewerName": "string",
    "interviewType": "string",
    "interviewLocation": "string",
    "interviewNotes": "string"
  }
}
```

### 3. Engagement Completion

#### POST `/api/engagements/completion`

Confirms engagement completion by seeker or provider.

**Request Body:**
```json
{
  "engagementId": "string",
  "confirmedBy": "seeker|provider",
  "completionNotes": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "engagement": {
    "id": "string",
    "status": "string",
    "completionConfirmed": "boolean",
    "updatedAt": "ISO string"
  }
}
```

## Subscription Endpoints

### 1. Subscription Management

#### GET `/api/subscriptions`

Retrieves subscription status for the authenticated user.

**Response:**
```json
{
  "success": "boolean",
  "subscription": {
    "id": "string",
    "status": "active|inactive|cancelled",
    "planCode": "string",
    "amount": "number",
    "currency": "string",
    "nextBillingDate": "ISO string",
    "createdAt": "ISO string"
  }
}
```

#### POST `/api/subscriptions`

Creates a new subscription for the authenticated user.

**Request Body:**
```json
{
  "planCode": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "subscription": {
    "id": "string",
    "status": "string",
    "planCode": "string",
    "amount": "number",
    "currency": "string",
    "nextBillingDate": "ISO string",
    "createdAt": "ISO string"
  },
  "paymentUrl": "string"
}
```

#### POST `/api/subscriptions/cancel`

Cancels the user's subscription.

**Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "subscription": {
    "id": "string",
    "status": "cancelled",
    "cancelledAt": "ISO string"
  }
}
```

## Webhook Endpoints

### 1. Paystack Webhooks

#### POST `/api/webhooks/paystack`

Handles Paystack webhook events.

**Headers:**
```
X-Paystack-Signature: <signature>
```

**Request Body:**
```json
{
  "event": "charge.success|subscription.create|subscription.disable|transfer.success|transfer.failed",
  "data": {
    // Event-specific data
  }
}
```

**Response:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "string",
  "message": "string",
  "code": "string",
  "details": "object"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Request data validation failed
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., duplicate engagement)
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per IP
- **Admin endpoints**: 50 requests per minute per user
- **Webhook endpoints**: 1000 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 20, max: 100)

Pagination metadata is included in responses:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

### Filtering
- Use query parameters to filter results
- Multiple filters can be combined
- Filter values are case-insensitive

### Sorting
- Use `sort` parameter with field name
- Use `order` parameter: `asc` or `desc`
- Default sorting is by creation date (newest first)

**Example:**
```
GET /api/admin/engagements?status=accepted&sort=updatedAt&order=desc&page=1&limit=10
```

## Versioning

API versioning is handled through URL paths:

- Current version: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

Version headers are also supported:
```
Accept: application/vnd.api+json;version=1
```

## Testing

### Test Headers

For testing purposes, include these headers:

```
X-Test-Mode: true
X-User-ID: <test-user-id>
X-Is-Admin: true|false
```

### Test Data

Test endpoints are available for development:

- `GET /api/test/engagements` - Generate test engagement data
- `POST /api/test/reset` - Reset test data
- `GET /api/test/status` - Check test environment status

## SDK and Client Libraries

Official client libraries are available:

- **JavaScript/TypeScript**: `@benchwarmers/api-client`
- **Python**: `benchwarmers-api`
- **Ruby**: `benchwarmers-api-ruby`

## Support

For API support and questions:

- **Documentation**: https://docs.benchwarmers.com/api
- **Status Page**: https://status.benchwarmers.com
- **Support Email**: api-support@benchwarmers.com
- **Developer Forum**: https://community.benchwarmers.com
