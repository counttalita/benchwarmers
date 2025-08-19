# Benchwarmers Marketplace - Technical Documentation

## Overview
Benchwarmers is a talent marketplace platform that connects talent seekers with talent providers through an AI-powered matching system. The platform operates on a seeker-driven model where talent seekers post projects and view matches, while talent providers create profiles and wait for interview notifications.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Docker (optional)

### Environment Setup
```bash
# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Docker Setup
```bash
# Start services
docker-compose up -d

# Verify services
docker-compose ps
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Payments**: Paystack
- **Real-time**: Pusher
- **Email**: Resend
- **SMS**: Twilio
- **Monitoring**: Sentry, Vercel Analytics

### Core Models
- **User**: Authentication and profile management
- **Company**: Organization management (seeker/provider)
- **TalentProfile**: Talent information and skills
- **TalentRequest**: Project requirements and specifications
- **Match**: AI-powered talent matching results
- **Offer**: Contract proposals between parties
- **Engagement**: Active work relationships
- **Payment**: Financial transactions and escrow
- **Subscription**: Monthly platform subscriptions

## Key Features

### 1. AI-Powered Matching
- Skill compatibility scoring with synonyms
- Experience and seniority matching
- Availability and budget analysis
- Culture fit assessment
- ML-based success prediction

### 2. Seeker-Driven Workflow
1. Talent seekers post projects with requirements
2. AI matches suitable talent profiles
3. Seekers view and select talent for interviews
4. Successful interviews lead to engagements
5. Platform handles invoicing and payments

### 3. Payment System
- **Subscription**: 850 ZAR monthly for platform access
- **Facilitation Fee**: 5% on successful deals
- **Manual Invoicing**: Current process (future automation)
- **Paystack Integration**: Payment processing and transfers

### 4. Real-time Communication
- In-app notifications via Pusher
- Email notifications via Resend
- SMS notifications via Twilio
- Real-time chat between parties

### 5. Interview Management
- Calendar integration for scheduling
- Multiple meeting types (video, audio, in-person)
- Status tracking (scheduled, completed, cancelled)
- Automated notifications

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP for phone verification
- `POST /api/auth/verify-otp` - Verify OTP and authenticate
- `POST /api/auth/register` - User registration

### Talent Management
- `GET /api/talent/profiles` - List talent profiles
- `POST /api/talent/profiles` - Create talent profile
- `GET /api/talent/profiles/[id]` - Get specific profile

### Project Management
- `GET /api/requests` - List talent requests
- `POST /api/requests` - Create new request
- `GET /api/requests/[id]` - Get specific request
- `POST /api/requests/matching` - Run matching algorithm

### Matching & Offers
- `GET /api/requests/[id]/matches` - Get matches for request
- `POST /api/requests/[id]/initiate-interview` - Schedule interview
- `GET /api/offers` - List offers
- `POST /api/offers/[id]/respond` - Respond to offer

### Engagements
- `GET /api/engagements` - List engagements
- `POST /api/engagements` - Create engagement
- `PUT /api/engagements/[id]/interview` - Update interview status
- `GET /api/engagements/[id]` - Get specific engagement

### Payments
- `POST /api/subscriptions` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/webhooks/paystack` - Paystack webhook handler

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/engagements` - All engagements
- `POST /api/admin/invoicing` - Manual invoicing tracking

### Chat
- `GET /api/chat/conversations` - User conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations/[id]/messages` - Get messages
- `POST /api/chat/conversations/[id]/messages` - Send message

## Database Schema

### Core Relations
```
User → Company (Many-to-One)
Company → TalentProfile (One-to-Many)
Company → TalentRequest (One-to-Many)
TalentRequest → Match (One-to-Many)
Match → Offer (One-to-Many)
Offer → Engagement (One-to-Many)
Engagement → Payment (One-to-Many)
Engagement → Review (One-to-Many)
```

### Key Enums
- **EngagementStatus**: `staged`, `interviewing`, `accepted`, `rejected`, `active`, `completed`
- **PaymentStatus**: `pending`, `held_in_escrow`, `released`, `refunded`
- **CompanyType**: `provider`, `seeker`, `both`
- **UserRole**: `admin`, `member`

## Development

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Database
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Code Quality
```bash
# Lint code
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

## Deployment

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
PAYSTACK_PLAN_CODE=PLN_...

# Pusher
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...

# Email
RESEND_API_KEY=...

# SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Monitoring
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled

## Security

### Authentication
- Phone-based OTP verification
- JWT tokens for session management
- Role-based access control
- Company-based permissions

### Data Protection
- Input sanitization and validation
- SQL injection prevention via Prisma
- XSS protection
- CSRF protection
- Rate limiting on API endpoints

### Payment Security
- Paystack PCI compliance
- Webhook signature verification
- Encrypted sensitive data
- Audit trails for all transactions

## Monitoring & Logging

### Error Tracking
- Sentry integration for error monitoring
- Structured logging with Winston
- Performance monitoring
- User session tracking

### Business Metrics
- User engagement tracking
- Payment success rates
- Matching algorithm performance
- Platform usage analytics

## Support

### Documentation
- [API Reference](./api-endpoints-reference.md)
- [Database Models](./DATABASE_VALIDATION_REPORT.md)
- [Feature Documentation](./FEATURES_DOCUMENTATION.md)
- [Enhancement Plan](./ENHANCEMENT_PLAN.md)

### Development
- [Testing Guide](./TESTING_INFRASTRUCTURE.md)
- [Error Handling](./ERROR_HANDLING_LOGGING.md)
- [Security Guide](./SECURITY_MONITORING.md)

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready
