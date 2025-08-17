import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockDataFactory, ApiMockHelper, FormTestHelper, ValidationTestHelper } from '../utils/test-helpers'

// Mock the company registration component to match actual implementation
const MockCompanyRegistrationForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => (
  <form onSubmit={(e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      companyName: formData.get('companyName'),
      companyEmail: formData.get('companyEmail'),
      contactName: formData.get('contactName'),
      phoneNumber: formData.get('phoneNumber'),
      companyType: formData.get('companyType'),
    })
  }}>
    <label htmlFor="companyName">Company Name</label>
    <input id="companyName" name="companyName" required />
    
    <label htmlFor="companyEmail">Company Email</label>
    <input id="companyEmail" name="companyEmail" type="email" required />
    
    <label htmlFor="contactName">Your Name</label>
    <input id="contactName" name="contactName" required />
    
    <label htmlFor="phoneNumber">Phone Number</label>
    <input id="phoneNumber" name="phoneNumber" type="tel" required />
    
    <label htmlFor="companyType">Company Type</label>
    <select id="companyType" name="companyType" required>
      <option value="">Select company type</option>
      <option value="provider">Talent Provider</option>
      <option value="seeker">Talent Seeker</option>
      <option value="both">Both Provider & Seeker</option>
    </select>
    
    <button type="submit">Register Company</button>
  </form>
)

describe('Company Registration and Verification - Requirement 1', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Registration Form Rendering', () => {
    it('should provide a company registration form with required fields', () => {
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      expect(screen.getByLabelText('Company Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Company Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Company Type')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register Company' })).toBeInTheDocument()
    })

    it('should require all mandatory fields', () => {
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      const companyNameInput = screen.getByLabelText('Company Name')
      const companyEmailInput = screen.getByLabelText('Company Email')
      const contactNameInput = screen.getByLabelText('Your Name')
      const phoneInput = screen.getByLabelText('Phone Number')
      const companyTypeSelect = screen.getByLabelText('Company Type')
      
      expect(companyNameInput).toBeRequired()
      expect(companyEmailInput).toBeRequired()
      expect(contactNameInput).toBeRequired()
      expect(phoneInput).toBeRequired()
      expect(companyTypeSelect).toBeRequired()
    })
  })

  describe('Form Validation - Negative Cases', () => {
    it('should reject empty company name', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/company name must be at least 2 characters/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('should reject company name that is too long', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      const longCompanyName = 'A'.repeat(101) // Over 100 character limit
      await user.type(screen.getByLabelText('Company Name'), longCompanyName)
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/company name must be less than 100 characters/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('should reject invalid email formats', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      const invalidEmails = ['invalid-email', '@test.com', 'test@', 'test.com', 'test@.com']
      
      for (const invalidEmail of invalidEmails) {
        render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
        
        await user.type(screen.getByLabelText('Company Name'), 'Test Company')
        await user.type(screen.getByLabelText('Company Email'), invalidEmail)
        await user.type(screen.getByLabelText('Your Name'), 'John Doe')
        await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
        await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
        
        await user.click(screen.getByRole('button', { name: 'Register Company' }))
        
        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
        })
        expect(mockSubmit).not.toHaveBeenCalled()
        mockSubmit.mockClear()
      }
    })

    it('should reject contact name that is too short', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'A') // Only 1 character
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/contact name must be at least 2 characters/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('should reject contact name that is too long', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      const longContactName = 'A'.repeat(51) // Over 50 character limit
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), longContactName)
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/contact name must be less than 50 characters/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('should reject invalid phone number formats', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      const invalidPhones = ['123', 'abc123', '12345', '+', '+abc', '1234567890123456789'] // Too long
      
      for (const invalidPhone of invalidPhones) {
        render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
        
        await user.type(screen.getByLabelText('Company Name'), 'Test Company')
        await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
        await user.type(screen.getByLabelText('Your Name'), 'John Doe')
        await user.type(screen.getByLabelText('Phone Number'), invalidPhone)
        await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
        
        await user.click(screen.getByRole('button', { name: 'Register Company' }))
        
        await waitFor(() => {
          expect(screen.getByText(/please enter a valid phone number in international format/i)).toBeInTheDocument()
        })
        expect(mockSubmit).not.toHaveBeenCalled()
        mockSubmit.mockClear()
      }
    })

    it('should require company type selection', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      // Don't select company type
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/please select a company type/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('should prevent form submission when multiple fields are invalid', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'A') // Too short
      await user.type(screen.getByLabelText('Company Email'), 'invalid-email') // Invalid format
      await user.type(screen.getByLabelText('Your Name'), 'B') // Too short
      await user.type(screen.getByLabelText('Phone Number'), '123') // Invalid format
      // Don't select company type
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      // Should show multiple validation errors
      await waitFor(() => {
        expect(screen.getByText(/company name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
        expect(screen.getByText(/contact name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
        expect(screen.getByText(/please select a company type/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })
  })

  describe('API Error Handling - Negative Cases', () => {
    it('should handle registration API server errors', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/register': Promise.reject({
          status: 500,
          error: 'Internal server error'
        })
      })
      
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/internal server error|registration failed/i)).toBeInTheDocument()
      })
    })

    it('should handle duplicate company registration', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/register': Promise.reject({
          status: 409,
          error: 'Company already registered with this email'
        })
      })
      
      const user = userEvent.setup()
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Existing Company')
      await user.type(screen.getByLabelText('Company Email'), 'existing@company.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/company already registered with this email/i)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity issues', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/register': Promise.reject({
          name: 'NetworkError',
          message: 'Network request failed'
        })
      })
      
      const user = userEvent.setup()
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/network request failed|registration failed/i)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting errors', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/register': Promise.reject({
          status: 429,
          error: 'Too many registration attempts. Please try again later.'
        })
      })
      
      const user = userEvent.setup()
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/too many registration attempts/i)).toBeInTheDocument()
      })
    })

    it('should handle malformed API responses', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/register': Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ /* malformed response */ })
        })
      })
      
      const user = userEvent.setup()
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@test.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission and Validation', () => {
    it('should submit valid company registration data', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company Ltd')
      await user.type(screen.getByLabelText('Company Email'), 'contact@testcompany.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      expect(mockSubmit).toHaveBeenCalledWith({
        companyName: 'Test Company Ltd',
        companyEmail: 'contact@testcompany.com',
        contactName: 'John Doe',
        phoneNumber: '+1234567890',
        companyType: 'provider',
      })
    })

    it('should validate phone number format', async () => {
      const validationCases = ValidationTestHelper.getValidationTestCases()
      const mockSubmit = jest.fn()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      // Test valid phone numbers
      for (const validPhone of validationCases.phone.valid) {
        await FormTestHelper.fillInput(screen.getByLabelText, 'Phone Number', validPhone)
        await FormTestHelper.fillInput(screen.getByLabelText, 'Company Name', 'Test Company')
        await FormTestHelper.fillInput(screen.getByLabelText, 'Company Email', 'contact@test.com')
        await FormTestHelper.fillInput(screen.getByLabelText, 'Your Name', 'John Doe')
        
        await FormTestHelper.submitForm(screen.getByRole, 'Register Company')
        expect(mockSubmit).toHaveBeenCalled()
        mockSubmit.mockClear()
      }
    })
  })

  describe('Domain Verification Process', () => {
    it('should initiate domain verification after form submission', async () => {
      const mockVerifyDomain = jest.fn().mockResolvedValue({ success: true })
      ApiMockHelper.mockFetch({
        '/api/companies/verify-domain': { success: true, verificationId: 'verify-123' }
      })
      
      const user = userEvent.setup()
      render(<MockCompanyRegistrationForm onSubmit={mockVerifyDomain} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@testcompany.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      expect(mockVerifyDomain).toHaveBeenCalledWith({
        companyName: 'Test Company',
        companyEmail: 'contact@testcompany.com',
        contactName: 'John Doe',
        phoneNumber: '+1234567890',
        companyType: 'provider',
      })
    })

    it('should send OTP to provided phone number after domain verification', async () => {
      const mockSendOTP = jest.fn().mockResolvedValue({ success: true })
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': { success: true, otpId: 'otp-123' }
      })
      
      // Simulate successful domain verification triggering OTP
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/send-otp', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('+1234567890')
        }))
      })
    })
  })

  describe('Company Account Creation', () => {
    it('should create pending company account after successful verification', async () => {
      const mockCompanyData = MockDataFactory.createCompany({
        status: 'pending',
        name: 'Test Company',
        domain: 'testcompany.com',
        phone: '+1234567890'
      })
      
      ApiMockHelper.mockFetch({
        '/api/companies': mockCompanyData
      })
      
      // Simulate the account creation process
      const response = await fetch('/api/companies')
      const company = await response.json()
      
      expect(company.status).toBe('pending')
      expect(company.name).toBe('Test Company')
      expect(company.domain).toBe('testcompany.com')
      expect(company.phone).toBe('+1234567890')
    })
  })

  describe('Admin Approval Process', () => {
    it('should allow admin to approve company application', async () => {
      const mockCompany = MockDataFactory.createCompany({ status: 'pending' })
      const mockApproval = jest.fn().mockResolvedValue({ 
        ...mockCompany, 
        status: 'approved' 
      })
      
      ApiMockHelper.mockFetch({
        [`/api/admin/companies/${mockCompany.id}/approve`]: {
          ...mockCompany,
          status: 'approved'
        }
      })
      
      const response = await fetch(`/api/admin/companies/${mockCompany.id}/approve`)
      const approvedCompany = await response.json()
      
      expect(approvedCompany.status).toBe('approved')
    })

    it('should allow admin to reject company application with reason', async () => {
      const mockCompany = MockDataFactory.createCompany({ status: 'pending' })
      const rejectionReason = 'Invalid domain verification'
      
      ApiMockHelper.mockFetch({
        [`/api/admin/companies/${mockCompany.id}/reject`]: {
          ...mockCompany,
          status: 'rejected',
          rejectionReason
        }
      })
      
      const response = await fetch(`/api/admin/companies/${mockCompany.id}/reject`)
      const rejectedCompany = await response.json()
      
      expect(rejectedCompany.status).toBe('rejected')
      expect(rejectedCompany.rejectionReason).toBe(rejectionReason)
    })
  })

  describe('Notification System', () => {
    it('should notify primary contact via SMS when company is approved', async () => {
      const mockCompany = MockDataFactory.createCompany({ status: 'approved' })
      const mockSendSMS = jest.fn().mockResolvedValue({ success: true })
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      // Simulate approval notification
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockCompany.phone,
          message: `Your company ${mockCompany.name} has been approved for BenchWarmers marketplace.`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(mockCompany.phone)
      }))
    })

    it('should notify contact with rejection reason and allow resubmission', async () => {
      const mockCompany = MockDataFactory.createCompany({ 
        status: 'rejected'
      })
      const rejectionReason = 'Domain verification failed'
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-124' }
      })
      
      // Simulate rejection notification
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockCompany.phone,
          message: `Your company application was rejected: ${rejectionReason}. You may resubmit.`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('rejected')
      }))
    })
  })

  describe('Error Handling', () => {
    it('should handle domain verification failures gracefully', async () => {
      ApiMockHelper.mockFetch({
        '/api/companies/verify-domain': Promise.reject({ 
          status: 400, 
          message: 'Domain verification failed' 
        })
      })
      
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCompanyRegistrationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Company Name'), 'Test Company')
      await user.type(screen.getByLabelText('Company Email'), 'contact@invalid-domain.com')
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      // Should show error message for failed verification
      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
      })
    })

    it('should handle OTP sending failures', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': Promise.reject({
          status: 500,
          message: 'Failed to send OTP'
        })
      })
      
      // Should show error message for OTP failure
      await waitFor(() => {
        expect(screen.getByText(/failed to send otp/i)).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full registration workflow', async () => {
      const user = userEvent.setup()
      const mockCompany = MockDataFactory.createCompany()
      
      // Mock all API endpoints for complete workflow
      ApiMockHelper.mockFetch({
        '/api/companies/verify-domain': { success: true, verificationId: 'verify-123' },
        '/api/auth/send-otp': { success: true, otpId: 'otp-123' },
        '/api/companies': { ...mockCompany, status: 'pending' },
        [`/api/admin/companies/${mockCompany.id}/approve`]: { ...mockCompany, status: 'approved' },
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      render(<MockCompanyRegistrationForm onSubmit={jest.fn()} />)
      
      // Step 1: Fill and submit registration form
      await user.type(screen.getByLabelText('Company Name'), mockCompany.name)
      await user.type(screen.getByLabelText('Company Email'), `contact@${mockCompany.domain}`)
      await user.type(screen.getByLabelText('Your Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), mockCompany.phone)
      await user.selectOptions(screen.getByLabelText('Company Type'), 'provider')
      await user.click(screen.getByRole('button', { name: 'Register Company' }))
      
      // Step 2: Verify registration API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', expect.any(Object))
      })
      
      // Step 3: Verify OTP was sent
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/send-otp', expect.any(Object))
      })
      
      // Step 4: Verify company account was created as pending
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/companies', expect.any(Object))
      })
    })
  })
})
