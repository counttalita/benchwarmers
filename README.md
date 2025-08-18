# 🚀 BenchWarmers Marketplace

<div align="center">

![BenchWarmers Logo](https://via.placeholder.com/200x80/1f2937/ffffff?text=BenchWarmers)

**Transforming Downtime into Opportunity**

A B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills. The platform optimises resource utilisation, reduces bench costs, and accelerates project delivery by transforming downtime into opportunity.

---

**Proudly developed by [TOSH (The Only Software Hub)](https://tosh.co.za/)**

[![Website](https://img.shields.io/badge/Website-tosh.co.za-blue?style=for-the-badge)](https://tosh.co.za/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

</div>

## 🌟 Overview

BenchWarmers revolutionises how organisations manage talent resources by creating a seamless marketplace where:

- **Provider Companies** can monetise their benched professionals during downtime
- **Seeker Companies** can access specialised skills without long-term commitments
- **Talent** can continue growing professionally while between projects

### Key Benefits

- 📈 **Optimise Resource Utilisation** - Turn idle time into productive revenue
- 💰 **Reduce Bench Costs** - Generate income from benched professionals
- ⚡ **Accelerate Project Delivery** - Access skilled talent immediately
- 🎯 **Flexible Engagements** - From short-term tasks to extended projects

## 🛠️ Tech Stack

<div align="center">

| Category | Technology | Purpose |
|----------|------------|----------|
| **Frontend** | Next.js 15 + TypeScript | Modern React framework with type safety |
| **UI/UX** | Tailwind CSS + shadcn/ui | Responsive design & accessible components |
| **Backend** | Node.js + Prisma ORM | Scalable API with type-safe database access |
| **Database** | PostgreSQL + Redis | Primary data store + caching/sessions |
| **Authentication** | NextAuth.js | Secure user authentication |
| **Payments** | Paystack | Payment processing & marketplace transactions |
| **Real-time** | Pusher | Live notifications & updates |
| **Email** | Resend | Transactional emails & notifications |
| **SMS** | Twilio | Phone verification & notifications |
| **Monitoring** | Sentry + Winston | Error tracking & structured logging |
| **Testing** | Jest + Playwright | Unit, integration & E2E testing |
| **DevOps** | Docker + GitHub Actions | Containerisation & CI/CD pipelines |

</div>

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Docker** and Docker Compose
- **npm** or yarn
- **Git** for version control

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd benchwarmers

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Start development environment
npm run setup

# 5. Seed database (optional)
npm run db:seed

# 6. Start the application
npm run dev
```

🎉 **Open [http://localhost:3000](http://localhost:3000) to see BenchWarmers in action!**

### What `npm run setup` does:

- 🐳 Starts PostgreSQL and Redis containers
- 📊 Pushes database schema to PostgreSQL
- 🔧 Generates Prisma client
- ✅ Verifies all services are running

## 📋 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run setup        # Complete development setup
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with test data
```

### Testing
```bash
npm run test         # Run unit tests
npm run test:api     # Run API tests
npm run test:e2e     # Run end-to-end tests
npm run test:coverage # Generate coverage report
npm run test:all     # Run all test suites
```

### Docker Operations
```bash
npm run docker:up    # Start Docker containers
npm run docker:down  # Stop Docker containers
npm run docker:logs  # View container logs
```

## 📁 Project Structure

```
📦 benchwarmers/
├── 📂 src/
│   ├── 📂 app/                    # Next.js 15 app directory
│   │   ├── 📂 api/               # API routes
│   │   │   ├── 📂 admin/         # Admin endpoints
│   │   │   ├── 📂 auth/          # Authentication endpoints
│   │   │   ├── 📂 engagements/   # Engagement management
│   │   │   ├── 📂 offers/        # Offer management
│   │   │   ├── 📂 payments/      # Payment processing
│   │   │   ├── 📂 subscriptions/ # Subscription management
│   │   │   └── 📂 webhooks/      # Webhook handlers
│   │   ├── 📂 admin/             # Admin dashboard
│   │   ├── 📂 auth/              # Authentication pages
│   │   ├── 📂 dashboard/         # User dashboard
│   │   ├── 📂 profile/           # User profile management
│   │   └── 📄 layout.tsx         # Root layout
│   ├── 📂 components/            # React components
│   │   ├── 📂 ui/               # Base UI components (shadcn/ui)
│   │   ├── 📂 admin/            # Admin components
│   │   ├── 📂 auth/             # Authentication components
│   │   ├── 📂 dashboard/        # Dashboard components
│   │   ├── 📂 engagements/      # Engagement management
│   │   ├── 📂 matching/         # Talent matching
│   │   ├── 📂 notifications/    # Notification components
│   │   ├── 📂 offers/           # Offer management
│   │   ├── 📂 profile/          # Profile components
│   │   ├── 📂 requests/         # Request management
│   │   └── 📂 talent/           # Talent-related components
│   ├── 📂 lib/                   # Utility functions & configs
│   │   ├── 📂 payments/         # Payment integrations (Paystack)
│   │   ├── 📂 auth/             # Auth utilities
│   │   ├── 📂 notifications/    # Notification system
│   │   └── 📂 utils/            # General utilities
│   ├── 📂 hooks/                 # Custom React hooks
│   ├── 📂 types/                 # TypeScript definitions
│   └── 📂 middleware/           # Middleware functions
├── 📂 prisma/
│   ├── 📄 schema.prisma          # Database schema
│   ├── 📂 migrations/           # Database migrations
│   └── 📄 seed.ts               # Database seeding
├── 📂 __tests__/                 # Test suites
│   ├── 📂 api/                  # API tests
│   ├── 📂 components/           # Component tests
│   ├── 📂 integration/          # Integration tests
│   └── 📂 unit/                 # Unit tests
├── 📂 docs/                      # Documentation
├── 📂 docker/                    # Docker configurations
├── 📂 e2e/                      # End-to-end tests
└── 📂 scripts/                   # Utility scripts
```

## ⚙️ Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/benchwarmers_dev"
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Payments (Paystack)
PAYSTACK_PUBLIC_KEY="pk_test_..."
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_WEBHOOK_SECRET="whsec_..."
PAYSTACK_PLAN_CODE="PLN_..."

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@benchwarmers.com"

# SMS
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."

# Real-time
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"

# Monitoring
SENTRY_DSN="https://..."
LOG_LEVEL="info"
```

> 📝 **Note**: See `.env.example` for complete configuration options

## 🏗️ Architecture & Features

### Core Features

- 🏢 **Company Management** - Provider and seeker company profiles
- 👥 **User Management** - Role-based access control (Admin, Company Admin, Talent)
- 🎯 **Talent Profiles** - Comprehensive skill and experience tracking
- 📋 **Request Management** - Detailed project requirements and matching
- 💼 **Offer System** - Negotiation and contract management
- 💳 **Payment Processing** - Secure Paystack integration with escrow
- 📊 **Analytics Dashboard** - Performance metrics and insights
- 🔔 **Real-time Notifications** - Live updates and messaging
- 📄 **Document Management** - Contract generation and file uploads
- 🛡️ **Security & Compliance** - GDPR compliance and audit trails

### Database Schema

PostgreSQL database with 20+ interconnected models:

- **Companies** - Provider/seeker organisations
- **Users** - Platform users with role-based permissions
- **TalentProfiles** - Professional skills and experience
- **Requests** - Project requirements and specifications
- **Offers** - Proposals and negotiations
- **Engagements** - Active work relationships with status flow
- **Payments** - Transaction and escrow management
- **Subscriptions** - Monthly subscription management (850 ZAR)
- **Reviews** - Performance feedback system
- **Notifications** - Real-time communication
- **AuditLogs** - Compliance and security tracking

### Engagement Status Flow

The platform implements a comprehensive interview workflow:

1. **Staged** - Talent shortlisted for project
2. **Interviewing** - Interview process in progress
3. **Accepted** - Interview successful, ready for engagement
4. **Rejected** - Interview unsuccessful
5. **Active** - Engagement currently running
6. **Completed** - Engagement finished successfully
7. **Terminated** - Engagement ended early
8. **Disputed** - Dispute resolution needed

## 🧪 Testing Strategy

### Test Coverage

- **Unit Tests** - Component and utility function testing
- **API Tests** - Endpoint validation and error handling
- **Integration Tests** - Database and external service integration
- **E2E Tests** - Complete user journey validation
- **Performance Tests** - Load testing and benchmarking

### Quality Assurance

```bash
# Run all tests
npm run test:all

# Generate coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:api
npm run test:e2e
```

## 📚 Documentation

Comprehensive documentation available in `/docs/`:

- 📖 **[System Overview](docs/SYSTEM_OVERVIEW.md)** - Architecture and components
- 🗄️ **[Database Models](docs/DATABASE_MODELS.md)** - Schema and relationships
- 🔌 **[API Endpoints](docs/API_ENDPOINTS.md)** - Complete API reference
- 👤 **[User Workflows](docs/USER_WORKFLOWS.md)** - User journey documentation
- 🛡️ **[Security Guide](docs/SECURITY_MONITORING.md)** - Security measures and monitoring
- 🧪 **[Testing Guide](docs/TESTING_INFRASTRUCTURE.md)** - Testing strategy and setup
- 🏗️ **[Component Architecture](docs/COMPONENT_ARCHITECTURE.md)** - UI component library
- 📝 **[Error Handling](docs/ERROR_HANDLING_LOGGING.md)** - Error management and logging
- 💰 **[Payment Flows](docs/payment-flows.md)** - Paystack integration and billing
- 🎯 **[Client Presentation](docs/client-presentation.md)** - Sales and marketing materials
- 🎨 **[User Experience Guide](docs/user-experience-guide.md)** - UX design and flows
- 📊 **[Business Case](docs/business-case.md)** - Financial projections and ROI

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. ✨ **Make** your changes
4. 🧪 **Test** your changes (`npm run test:all`)
5. 📝 **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. 🚀 **Push** to the branch (`git push origin feature/amazing-feature`)
7. 🔄 **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow conventional commit messages
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About TOSH

**BenchWarmers** is proudly developed by [The Only Software Hub](https://tosh.co.za/), a leading software development company specialising in innovative digital solutions.

---

<div align="center">

**Made with ❤️ by [TOSH](https://tosh.co.za/)**

[Website](https://tosh.co.za/) • [Contact](mailto:ask@tosh.co.za) • [LinkedIn](https://linkedin.com/company/tosh)

</div>
