# Testing Infrastructure

## Overview

Talent Brew is a B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills. The platform implements a comprehensive testing infrastructure to ensure code quality, reliability, and maintainability. The testing strategy covers unit tests, integration tests, API tests, end-to-end tests, and performance testing. setup uses Jest as the primary testing framework with additional tools for specific testing scenarios.

## Testing Stack

### Core Testing Technologies
- **Jest**: Primary testing framework with jsdom environment
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework
- **Supertest**: HTTP assertion library for API testing
- **Docker**: Containerized test databases
- **PostgreSQL**: Test database with testcontainers
- **Redis**: In-memory data store for testing

### Test Environment Configuration

#### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed from 'node' for React component testing
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ]
}
```

#### Jest Setup (`jest.setup.js`)
- **DOM APIs**: `jsdom` environment for React component testing
- **Navigator Mocks**: `navigator.clipboard` and `window.matchMedia` mocks
- **Prisma Mocks**: Complete database client mocking
- **External Service Mocks**: Stripe, DocuSign, SendGrid, Sentry
- **Authentication Mocks**: NextAuth.js session management

## Test Categories

### 1. Unit Tests (`__tests__/lib/`, `__tests__/components/`)

#### Component Tests
- **Location**: `__tests__/components/`
- **Purpose**: Test React components in isolation
- **Tools**: React Testing Library, Jest
- **Coverage**: Form components, UI components, business logic components

Example test structure:
```typescript
// __tests__/components/forms/talent-request-form.test.tsx
import { render, screen } from '@testing-library/react'
import TalentRequestForm from '@/components/requests/talent-request-form'

describe('TalentRequestForm', () => {
  it('should render the form', () => {
    render(<TalentRequestForm />)
    expect(screen.getByRole('form')).toBeInTheDocument()
  })
})
```

#### Library Tests
- **Location**: `__tests__/lib/`
- **Purpose**: Test utility functions and business logic
- **Coverage**: Payment calculations, matching algorithms, validation schemas

### 2. API Tests (`__tests__/api/`)

#### Endpoint Testing
- **Location**: `__tests__/api/`
- **Purpose**: Test API routes and business logic
- **Tools**: Jest, Supertest, Prisma mocks
- **Coverage**: All API endpoints with request/response validation

Test structure by domain:
```
__tests__/api/
├── admin/           # Admin functionality tests
├── auth/            # Authentication tests
├── companies/       # Company management tests
├── contracts/       # Contract lifecycle tests
├── engagements/     # Engagement management tests
├── matches/         # Matching system tests
├── offers/          # Offer management tests
├── payments/        # Payment processing tests
├── requests/        # Talent request tests
├── reviews/         # Review system tests
├── security/        # Security feature tests
└── talent/          # Talent profile tests
```

### 3. Integration Tests (`__tests__/integration/`)

#### Database Integration
- **File**: `database-integration.test.ts`
- **Purpose**: Test database operations and transactions
- **Tools**: PostgreSQL testcontainers, Prisma

#### API Integration
- **File**: `api-endpoints.test.ts`
- **Purpose**: Test complete API workflows
- **Coverage**: End-to-end API request flows

#### Stripe Integration
- **File**: `stripe-integration.test.ts`
- **Purpose**: Test payment processing workflows
- **Coverage**: Payment intents, escrow, fee calculations

### 4. End-to-End Tests (`e2e/`)

#### User Journey Tests
- **Tool**: Playwright
- **Coverage**: Complete user workflows from login to engagement completion
- **Files**:
  - `auth.setup.ts`: Authentication setup
  - `user-journeys.spec.ts`: Complete user flows
  - `payment-flows.spec.ts`: Payment processing flows

### 5. Performance Tests (`__tests__/performance/`)

#### Load Testing
- **File**: `load-testing.test.ts`
- **Purpose**: Test API response times and concurrent request handling
- **Metrics**: Response time thresholds, concurrent user simulation

## Test Scripts

### NPM Scripts
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest __tests__/lib __tests__/components",
  "test:integration": "jest __tests__/integration --config jest.config.integration.js",
  "test:e2e": "playwright test",
  "test:api": "jest __tests__/api",
  "test:business": "jest __tests__/unit/matching-algorithm.test.ts __tests__/unit/payment-calculations.test.ts",
  "test:all": "npm run test:unit && npm run test:integration && npm run test:api",
  "test:ci": "npm run test:coverage && npm run test:integration -- --ci --coverage"
}
```

### Database Test Scripts
```json
{
  "test:db:setup": "./scripts/test-db-setup.sh",
  "test:db:teardown": "docker-compose -f docker-compose.test.yml down",
  "db:seed:test": "tsx scripts/seed-test-data.ts"
}
```

## Mock Implementations

### Prisma Database Mocks
Complete mock implementation for all database models:
```javascript
// jest.setup.js
const mockPrisma = {
  company: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  // ... all other models
}
```

### External Service Mocks

#### Stripe Mock
```javascript
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn(),
    },
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    }
  }))
}))
```

#### DocuSign Mock
```javascript
jest.mock('@/lib/esignature/docusign-integration', () => ({
  DocuSignIntegration: {
    createEnvelope: jest.fn(),
    getEnvelopeStatus: jest.fn(),
    downloadDocument: jest.fn(),
  }
}))
```

## Test Data Management

### Test Data Seeding
- **File**: `scripts/seed-test-data.ts`
- **Purpose**: Generate realistic test data for development and testing
- **Coverage**: Companies, users, talent profiles, requests, offers, engagements

### Test Database Setup
- **File**: `scripts/test-db-setup.sh`
- **Purpose**: Set up PostgreSQL and Redis containers for testing
- **Tools**: Docker Compose with test configuration

## Coverage Requirements

### Coverage Thresholds
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Coverage Reports
- **HTML Report**: Generated in `coverage/` directory
- **JSON Report**: Machine-readable coverage data
- **LCOV Report**: For CI/CD integration

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test-monitoring.yml
name: Test Monitoring
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Monitoring
- **File**: `scripts/test-monitor.js`
- **Purpose**: Monitor test execution and generate reports
- **Features**: Performance tracking, failure analysis, trend reporting

## Test Environment Variables

### Required Environment Variables
```bash
# Test Database
DATABASE_URL="postgresql://test:test@localhost:5432/benchwarmers_test"
REDIS_URL="redis://localhost:6379"

# External Services (Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
DOCUSIGN_INTEGRATION_KEY="test_key"
SENDGRID_API_KEY="test_key"

# Authentication
NEXTAUTH_SECRET="test_secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Best Practices

### Test Organization
1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern for test structure
3. **Mock External Dependencies**: Mock all external services and APIs
4. **Test Edge Cases**: Include error conditions and boundary cases

### Component Testing
1. **User-Centric Testing**: Test from user perspective
2. **Accessibility Testing**: Include ARIA and keyboard navigation tests
3. **Responsive Testing**: Test different screen sizes and devices
4. **State Management**: Test component state changes and side effects

### API Testing
1. **Request Validation**: Test input validation and sanitization
2. **Response Format**: Verify response structure and data types
3. **Error Handling**: Test error conditions and status codes
4. **Authentication**: Test protected routes and permissions

## Troubleshooting

### Common Issues

#### Jest Configuration Issues
- **Problem**: Tests failing due to module resolution
- **Solution**: Check `moduleNameMapping` in `jest.config.js`

#### Mock Issues
- **Problem**: External service mocks not working
- **Solution**: Verify mock implementation in `jest.setup.js`

#### Database Test Issues
- **Problem**: Database connection failures in tests
- **Solution**: Ensure test database containers are running

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- __tests__/api/offers/offers.test.ts

# Run tests with coverage
npm run test:coverage

# Debug test database
npm run db:studio
```

## Performance Benchmarks

### Test Execution Times
- **Unit Tests**: < 5 seconds
- **Integration Tests**: < 30 seconds
- **API Tests**: < 60 seconds
- **E2E Tests**: < 5 minutes

### API Response Time Thresholds
- **Simple Queries**: < 200ms
- **Complex Queries**: < 500ms
- **Payment Processing**: < 2000ms
- **File Operations**: < 5000ms

## Future Enhancements

### Planned Improvements
1. **Visual Regression Testing**: Screenshot comparison for UI components
2. **Contract Testing**: API contract validation with Pact
3. **Chaos Engineering**: Fault injection and resilience testing
4. **Security Testing**: Automated vulnerability scanning

### Tool Upgrades
1. **Jest 30**: Upgrade to latest Jest version
2. **Playwright Updates**: Latest browser automation features
3. **Testing Library**: Enhanced accessibility testing utilities
4. **Coverage Tools**: Advanced coverage analysis and reporting

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Maintainer**: Development Team
