// Test utilities following Single Responsibility Principle
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Mock Prisma client for tests
const mockPrisma = {
  company: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  oTPCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  otpCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  }
}

// Database Test Helpers - Single Responsibility: Database operations for tests
export async function createTestCompany(data: any) {
  const mockCompany = {
    id: 'company-123',
    name: data.name || 'Test Company',
    domain: data.domain || 'testcompany.com',
    type: data.type || 'provider',
    status: data.status || 'pending',
    domainVerified: data.domainVerified || false,
    domainVerificationToken: data.domainVerificationToken || null,
    domainVerifiedAt: data.domainVerifiedAt || null,
    adminNotes: data.adminNotes || null,
    rejectionReason: data.rejectionReason || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
  
  mockPrisma.company.create.mockResolvedValue(mockCompany)
  return mockCompany
}

export async function createTestUser(data: any) {
  const mockUser = {
    id: 'user-123',
    companyId: data.companyId || 'company-123',
    phoneNumber: data.phoneNumber || '+1234567890',
    email: data.email || null,
    name: data.name || 'Test User',
    role: data.role || 'admin',
    phoneVerified: data.phoneVerified || false,
    phoneVerifiedAt: data.phoneVerifiedAt || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
  
  mockPrisma.user.create.mockResolvedValue(mockUser)
  return mockUser
}

export async function cleanupTestData() {
  // Reset all mocks instead of actual database operations
  mockPrisma.otpCode.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.company.deleteMany.mockResolvedValue({ count: 0 })
  
  // Clear all mocks
  jest.clearAllMocks()
}

// Export mock prisma for use in tests
export { mockPrisma as prisma }

// Mock Data Factory - Single Responsibility: Create test data
export class MockDataFactory {
  static createCompany(overrides: Partial<any> = {}) {
    return {
      id: 'company-123',
      name: 'Test Company',
      domain: 'testcompany.com',
      phone: '+1234567890',
      status: 'approved',
      type: 'provider',
      createdAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 'user-123',
      phone: '+1234567890',
      name: 'John Doe',
      role: 'admin',
      companyId: 'company-123',
      isActive: true,
      createdAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createTalentProfile(overrides: Partial<any> = {}) {
    return {
      id: 'talent-123',
      name: 'Jane Developer',
      title: 'Senior React Developer',
      seniority: 'senior',
      skills: ['React', 'TypeScript', 'Node.js'],
      location: 'Remote',
      hourlyRate: 75,
      isVisible: true,
      companyId: 'company-123',
      availability: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      ...overrides,
    }
  }

  static createTalentRequest(overrides: Partial<any> = {}) {
    return {
      id: 'request-123',
      title: 'React Developer Needed',
      description: 'Looking for experienced React developer',
      requiredSkills: ['React', 'TypeScript'],
      budgetMin: 50,
      budgetMax: 100,
      startDate: new Date().toISOString(),
      duration: '3 months',
      companyId: 'company-456',
      status: 'active',
      ...overrides,
    }
  }

  static createOffer(overrides: Partial<any> = {}) {
    return {
      id: 'offer-123',
      talentId: 'talent-123',
      requestId: 'request-123',
      rate: 75,
      startDate: new Date().toISOString(),
      duration: '3 months',
      terms: 'Standard terms and conditions',
      status: 'pending',
      totalAmount: 22500,
      platformFee: 3375,
      netAmount: 19125,
      ...overrides,
    }
  }
}

// API Mock Helper - Single Responsibility: Mock API responses
export class ApiMockHelper {
  static mockSuccessResponse(data: any) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    })
  }

  static mockErrorResponse(status: number, message: string) {
    return Promise.reject({
      ok: false,
      status,
      message,
    })
  }

  static mockFetch(responses: Record<string, any>) {
    global.fetch = jest.fn((url: string) => {
      const response = responses[url] || responses['default']
      if (response) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
        })
      }
      return Promise.reject(new Error(`No mock response for ${url}`))
    }) as jest.Mock
  }
}

// Form Test Helper - Single Responsibility: Test form interactions
export class FormTestHelper {
  static async fillInput(getByLabelText: any, label: string, value: string) {
    const input = getByLabelText(label)
    await userEvent.clear(input)
    await userEvent.type(input, value)
    return input
  }

  static async submitForm(getByRole: any, buttonText: string = 'Submit') {
    const submitButton = getByRole('button', { name: buttonText })
    await userEvent.click(submitButton)
    return submitButton
  }
}

// Validation Test Helper - Single Responsibility: Test validation scenarios
export class ValidationTestHelper {
  static getValidationTestCases() {
    return {
      phone: {
        valid: ['+1234567890', '+44123456789'],
        invalid: ['123', 'invalid', ''],
      },
      email: {
        valid: ['test@example.com', 'user@company.co.uk'],
        invalid: ['invalid', '@example.com', 'test@'],
      },
      required: {
        valid: ['Some value'],
        invalid: ['', null, undefined],
      },
    }
  }

  static async testFieldValidation(
    getByLabelText: any,
    getByText: any,
    fieldLabel: string,
    validValues: string[],
    invalidValues: any[],
    expectedErrorMessage: string
  ) {
    // Test valid values
    for (const value of validValues) {
      await FormTestHelper.fillInput(getByLabelText, fieldLabel, value)
      expect(() => getByText(expectedErrorMessage)).toThrow()
    }

    // Test invalid values
    for (const value of invalidValues) {
      if (value !== null && value !== undefined) {
        await FormTestHelper.fillInput(getByLabelText, fieldLabel, value)
      }
      await FormTestHelper.submitForm(getByRole)
      expect(getByText(expectedErrorMessage)).toBeInTheDocument()
    }
  }
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options)
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
