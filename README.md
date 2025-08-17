# 🚀 Talent Brew - BenchWarmers Marketplace

<div align="center">

![Talent Brew Logo](https://via.placeholder.com/200x80/1f2937/ffffff?text=Talent+Brew)

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

Talent Brew revolutionises how organisations manage talent resources by creating a seamless marketplace where:

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
| **Frontend** | Next.js 14 + TypeScript | Modern React framework with type safety |
| **UI/UX** | Tailwind CSS + shadcn/ui | Responsive design & accessible components |
| **Backend** | Node.js + Prisma ORM | Scalable API with type-safe database access |
| **Database** | PostgreSQL + Redis | Primary data store + caching/sessions |
| **Authentication** | NextAuth.js + 2FA | Secure user authentication with MFA |
| **Payments** | Stripe + Stripe Connect | Payment processing & marketplace payouts |
| **Storage** | Appwrite Storage | File uploads & document management |
| **Real-time** | Pusher | Live notifications & updates |
| **Email** | SendGrid | Transactional emails & notifications |
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
cd benchwarmers-marketplace

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

🎉 **Open [http://localhost:3000](http://localhost:3000) to see Talent Brew in action!**

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
```

### Docker Operations
```bash
npm run docker:up    # Start Docker containers
npm run docker:down  # Stop Docker containers
```

## 📁 Project Structure

```
📦 talent-brew/
├── 📂 src/
│   ├── 📂 app/                    # Next.js 14 app directory
│   │   ├── 📂 api/               # API routes
│   │   ├── 📂 auth/              # Authentication pages
│   │   ├── 📂 admin/             # Admin dashboard
│   │   └── 📄 layout.tsx         # Root layout
│   ├── 📂 components/            # React components
│   │   ├── 📂 ui/               # Base UI components (shadcn/ui)
│   │   ├── 📂 auth/             # Authentication components
│   │   ├── 📂 talent/           # Talent-related components
│   │   ├── 📂 requests/         # Request management
│   │   ├── 📂 offers/           # Offer management
│   │   └── 📂 admin/            # Admin components
│   ├── 📂 lib/                   # Utility functions & configs
│   │   ├── 📂 api/              # API utilities
│   │   ├── 📂 auth/             # Auth utilities
│   │   ├── 📂 payments/         # Payment integrations
│   │   └── 📂 utils/            # General utilities
│   ├── 📂 hooks/                 # Custom React hooks
│   └── 📂 types/                 # TypeScript definitions
├── 📂 prisma/
│   ├── 📄 schema.prisma          # Database schema
│   ├── 📂 migrations/           # Database migrations
│   └── 📄 seed.ts               # Database seeding
├── 📂 __tests__/                 # Test suites
│   ├── 📂 api/                  # API tests
│   ├── 📂 components/           # Component tests
│   └── 📂 integration/          # Integration tests
├── 📂 docs/                      # Documentation
├── 📂 docker/                    # Docker configurations
└── 📂 scripts/                   # Utility scripts
```

## ⚙️ Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/talentbrew"
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email
SENDGRID_API_KEY="SG..."
SENDGRID_FROM_EMAIL="noreply@talentbrew.com"

# File Storage
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your-project-id"
APPWRITE_API_KEY="your-api-key"

# Monitoring
SENTRY_DSN="https://..."
LOG_LEVEL="info"

# Real-time
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
```

> 📝 **Note**: See `.env.example` for complete configuration options

## 🏗️ Architecture & Features

### Core Features

- 🏢 **Company Management** - Provider and seeker company profiles
- 👥 **User Management** - Role-based access control (Admin, Company Admin, Talent)
- 🎯 **Talent Profiles** - Comprehensive skill and experience tracking
- 📋 **Request Management** - Detailed project requirements and matching
- 💼 **Offer System** - Negotiation and contract management
- 💳 **Payment Processing** - Secure escrow and payout system
- 📊 **Analytics Dashboard** - Performance metrics and insights
- 🔔 **Real-time Notifications** - Live updates and messaging
- 📄 **Document Management** - Contract generation and e-signatures
- 🛡️ **Security & Compliance** - GDPR compliance and audit trails

### Database Schema

PostgreSQL database with 15+ interconnected models:

- **Companies** - Provider/seeker organisations
- **Users** - Platform users with role-based permissions
- **TalentProfiles** - Professional skills and experience
- **Requests** - Project requirements and specifications
- **Offers** - Proposals and negotiations
- **Engagements** - Active work relationships
- **Payments** - Transaction and escrow management
- **Reviews** - Performance feedback system
- **Notifications** - Real-time communication
- **AuditLogs** - Compliance and security tracking

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

**Talent Brew** is proudly developed by [TOSH (The Only Software Hub)](https://tosh.co.za/), a leading software development company specialising in innovative digital solutions.

---

<div align="center">

**Made with ❤️ by [TOSH](https://tosh.co.za/)**

[Website](https://tosh.co.za/) • [Contact](mailto:info@tosh.co.za) • [LinkedIn](https://linkedin.com/company/tosh)

</div>
