# BenchWarmers Marketplace Test Suite

Comprehensive frontend and integration tests following SOLID principles for the BenchWarmers B2B talent marketplace.

## Test Architecture

### SOLID Principles Implementation

- **Single Responsibility**: Each test utility class has one specific purpose
- **Open/Closed**: Test utilities are extensible without modification
- **Liskov Substitution**: Mock components can replace real components seamlessly
- **Interface Segregation**: Specific test interfaces for different concerns
- **Dependency Inversion**: Tests depend on abstractions, not concrete implementations

## Test Structure

```
__tests__/
├── utils/
│   └── test-helpers.ts          # Reusable test utilities following SRP
├── features/                    # Feature-specific tests
│   ├── company-registration.test.tsx
│   ├── phone-authentication.test.tsx
│   ├── payment-processing.test.tsx
│   ├── offer-management.test.tsx
│   └── talent-management.test.tsx
└── integration/
    └── complete-marketplace-flow.test.tsx
```

## Test Utilities

### MockDataFactory
Creates consistent test data following the Factory pattern:
```typescript
const company = MockDataFactory.createCompany({ type: 'provider' })
const user = MockDataFactory.createUser({ role: 'admin' })
const talent = MockDataFactory.createTalentProfile({ hourlyRate: 85 })
```

### ApiMockHelper
Handles API mocking with consistent responses:
```typescript
ApiMockHelper.mockFetch({
  '/api/companies': mockCompany,
  '/api/auth/send-otp': { success: true }
})
```

### FormTestHelper
Simplifies form interaction testing:
```typescript
await FormTestHelper.fillInput(getByLabelText, 'Phone Number', '+1234567890')
await FormTestHelper.submitForm(getByRole, 'Submit')
```

### ValidationTestHelper
Tests validation scenarios consistently:
```typescript
const cases = ValidationTestHelper.getValidationTestCases()
await ValidationTestHelper.testFieldValidation(...)
```

## Test Coverage by Requirement

### ✅ Requirement 1: Company Registration and Verification
- Form rendering and validation
- Domain verification process
- OTP sending and verification
- Admin approval workflow
- SMS notifications
- Error handling

### ✅ Requirement 2: Phone-Based Authentication System
- Phone-only authentication (no email)
- 6-digit OTP generation via Twilio
- 5-minute OTP expiry
- 3-attempt lockout with 15-minute cooldown
- 60-second resend cooldown
- JWT token creation with roles/permissions

### ✅ Requirement 6: Payment Processing and Escrow System
- 15% platform fee calculation
- Stripe payment integration
- Escrow holding and release
- Provider net amount (85%)
- Dispute handling
- Transaction confirmations via SMS

### ✅ Requirement 7: Offer Management and Negotiation
- Offer creation with cost breakdown
- Accept/decline/counter-offer responses
- 48-hour response window
- Counter-offer negotiation
- Engagement creation on acceptance
- SMS notifications throughout process

### ✅ Requirement 4: Talent Profile Management
- Profile creation with required fields
- File upload for certifications (PDF, DOC, images up to 10MB)
- Availability calendar interface
- Rate setting (hourly/daily/weekly)
- Visibility toggle
- Review integration

### ✅ Integration Tests
- Complete marketplace workflow
- Buyer-driven marketplace rule enforcement
- Payment commitment for profile access
- Multi-step verification process
- Data consistency across operations
- Error handling throughout flow
- Notification flow verification
- Performance and scalability tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration
```

## Test Configuration

- **Jest**: Test runner with jsdom environment
- **Testing Library**: React component testing
- **MSW**: API mocking for integration tests
- **User Event**: Realistic user interactions

## Key Test Scenarios

### Core Business Rule Testing
- Only paying seekers can approach providers
- Providers cannot cold-approach seekers
- Payment commitment required for full profile access

### Error Handling
- Network failures
- Validation errors
- Payment failures
- SMS delivery failures
- Domain verification failures

### Security Testing
- Secure Stripe integration
- No sensitive card data storage
- JWT token validation
- OTP security measures

### Performance Testing
- Concurrent offer processing
- Load testing for multiple operations
- Response time validation

## Best Practices

1. **Test Independence**: Each test can run in isolation
2. **Realistic Data**: Use MockDataFactory for consistent test data
3. **User-Centric**: Tests focus on user interactions and outcomes
4. **Error Coverage**: Both happy path and error scenarios tested
5. **Integration Focus**: End-to-end workflows validated

## Extending Tests

To add new tests following SOLID principles:

1. **Single Responsibility**: Create focused test utilities
2. **Open/Closed**: Extend existing utilities rather than modifying
3. **Interface Segregation**: Use specific mock interfaces
4. **Dependency Inversion**: Mock external dependencies

Example:
```typescript
// Good: Focused utility
class NotificationTestHelper {
  static mockSMSDelivery(responses: Record<string, any>) {
    // Implementation
  }
}

// Good: Extending without modification
class ExtendedMockDataFactory extends MockDataFactory {
  static createNotification(overrides = {}) {
    // New functionality
  }
}
```
