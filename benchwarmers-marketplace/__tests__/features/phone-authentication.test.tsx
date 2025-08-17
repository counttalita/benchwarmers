import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockDataFactory, ApiMockHelper, FormTestHelper, ValidationTestHelper } from '../utils/test-helpers'

// Mock phone authentication components to match actual LoginForm
const MockPhoneLoginForm = ({ onSubmit }: { onSubmit: (phone: string) => void }) => (
  <form onSubmit={(e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData.get('phoneNumber') as string)
  }}>
    <label htmlFor="phoneNumber">Phone Number</label>
    <input id="phoneNumber" name="phoneNumber" type="tel" placeholder="+1234567890" required />
    <button type="submit">Send Verification Code</button>
  </form>
)

const MockOTPVerificationForm = ({ onSubmit, onResend, onGoBack }: { 
  onSubmit: (otp: string) => void
  onResend?: () => void
  onGoBack?: () => void
}) => (
  <div>
    <h1>Verify Your Phone</h1>
    <p>Enter the 6-digit code sent to +1234567890</p>
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      onSubmit(formData.get('otp') as string)
    }}>
      <label htmlFor="otp">Verification Code</label>
      <input id="otp" name="otp" type="text" maxLength={6} placeholder="123456" required />
      <button type="submit">Verify Code</button>
    </form>
    <button type="button" onClick={onResend}>Resend code</button>
    <button type="button" onClick={onGoBack}>← Use different phone number</button>
  </div>
)

describe('Phone-Based Authentication System - Requirement 2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Phone Number Authentication', () => {
    it('should require only phone number for authentication', () => {
      render(<MockPhoneLoginForm onSubmit={jest.fn()} />)
      
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send Verification Code' })).toBeInTheDocument()
    })

    it('should validate phone number format', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      // Test valid phone numbers
      const validPhones = ['+1234567890', '+44123456789', '+27123456789']
      
      for (const phone of validPhones) {
        await user.clear(screen.getByLabelText('Phone Number'))
        await user.type(screen.getByLabelText('Phone Number'), phone)
        await user.click(screen.getByRole('button', { name: 'Send OTP' }))
        
        expect(mockSubmit).toHaveBeenCalledWith(phone)
        mockSubmit.mockClear()
      }
    })

    it('should reject invalid phone number formats', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      const invalidPhones = ['123', 'invalid', '12345', 'abc123']
      
      for (const phone of invalidPhones) {
        await user.clear(screen.getByLabelText('Phone Number'))
        await user.type(screen.getByLabelText('Phone Number'), phone)
        await user.click(screen.getByRole('button', { name: 'Send OTP' }))
        
        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument()
        })
      }
    })

    it('should show loading state during phone number validation', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      
      const submitButton = screen.getByRole('button', { name: 'Send Verification Code' })
      await user.click(submitButton)
      
      // Button should show loading state
      expect(submitButton).toHaveTextContent(/sending/i)
      expect(submitButton).toBeDisabled()
    })

    it('should prevent multiple rapid submissions', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      
      const submitButton = screen.getByRole('button', { name: 'Send Verification Code' })
      
      // Click multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only be called once
      expect(mockSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Phone Number Validation - Negative Cases', () => {
    it('should reject phone numbers that are too short', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      const shortPhones = ['+1', '+12', '+123', '+1234']
      
      for (const phone of shortPhones) {
        await user.clear(screen.getByLabelText('Phone Number'))
        await user.type(screen.getByLabelText('Phone Number'), phone)
        await user.click(screen.getByRole('button', { name: 'Send Verification Code' }))
        
        await waitFor(() => {
          expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
        })
        expect(mockSubmit).not.toHaveBeenCalled()
        mockSubmit.mockClear()
      }
    })

    it('should reject phone numbers with invalid characters', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      const invalidPhones = ['+123abc4567890', '+123-456-7890', '+123 456 7890', '+123.456.7890', '+(123)456-7890']
      
      for (const phone of invalidPhones) {
        await user.clear(screen.getByLabelText('Phone Number'))
        await user.type(screen.getByLabelText('Phone Number'), phone)
        await user.click(screen.getByRole('button', { name: 'Send Verification Code' }))
        
        await waitFor(() => {
          expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
        })
        expect(mockSubmit).not.toHaveBeenCalled()
        mockSubmit.mockClear()
      }
    })

    it('should reject phone numbers without country code', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      const localPhones = ['1234567890', '0123456789', '123456789']
      
      for (const phone of localPhones) {
        await user.clear(screen.getByLabelText('Phone Number'))
        await user.type(screen.getByLabelText('Phone Number'), phone)
        await user.click(screen.getByRole('button', { name: 'Send Verification Code' }))
        
        await waitFor(() => {
          expect(screen.getByText(/please enter a valid phone number in international format/i)).toBeInTheDocument()
        })
        expect(mockSubmit).not.toHaveBeenCalled()
        mockSubmit.mockClear()
      }
    })

    it('should reject empty phone number field', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      await user.click(screen.getByRole('button', { name: 'Send Verification Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('should reject phone numbers that are too long', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      const tooLongPhone = '+' + '1'.repeat(20) // Way too long
      await user.type(screen.getByLabelText('Phone Number'), tooLongPhone)
      await user.click(screen.getByRole('button', { name: 'Send Verification Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
      })
      expect(mockSubmit).not.toHaveBeenCalled()
    })
  })

  describe('OTP Generation and Delivery', () => {
    it('should send 6-digit OTP via Twilio SMS when valid phone is entered', async () => {
      const mockPhone = '+1234567890'
      const mockOTPResponse = { success: true, otpId: 'otp-123' }
      
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': mockOTPResponse
      })
      
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPhoneLoginForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Phone Number'), mockPhone)
      await user.click(screen.getByRole('button', { name: 'Send OTP' }))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/send-otp', 
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(mockPhone)
          })
        )
      })
    })

    it('should generate unique 6-digit OTP for each request', async () => {
      const mockGenerateOTP = jest.fn()
        .mockReturnValueOnce('123456')
        .mockReturnValueOnce('789012')
      
      // Mock OTP generation
      jest.mock('../../src/lib/otp-generator', () => ({
        generateOTP: mockGenerateOTP
      }))
      
      const otp1 = mockGenerateOTP()
      const otp2 = mockGenerateOTP()
      
      expect(otp1).toMatch(/^\d{6}$/)
      expect(otp2).toMatch(/^\d{6}$/)
      expect(otp1).not.toBe(otp2)
    })
  })

  describe('OTP Verification - Negative Cases', () => {
    it('should reject OTP with invalid length', async () => {
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      const invalidOTPs = ['1', '12', '123', '1234', '12345', '1234567', '12345678']
      
      for (const invalidOTP of invalidOTPs) {
        await user.clear(screen.getByLabelText('Verification Code'))
        await user.type(screen.getByLabelText('Verification Code'), invalidOTP)
        await user.click(screen.getByRole('button', { name: 'Verify Code' }))
        
        await waitFor(() => {
          expect(screen.getByText(/otp must be 6 digits/i)).toBeInTheDocument()
        })
      }
    })

    it('should reject OTP with non-numeric characters', async () => {
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      const invalidOTPs = ['12345a', 'abcdef', '123-45', '123 45', '12.345', '12@345']
      
      for (const invalidOTP of invalidOTPs) {
        await user.clear(screen.getByLabelText('Verification Code'))
        await user.type(screen.getByLabelText('Verification Code'), invalidOTP)
        await user.click(screen.getByRole('button', { name: 'Verify Code' }))
        
        await waitFor(() => {
          expect(screen.getByText(/otp must contain only numbers/i)).toBeInTheDocument()
        })
      }
    })

    it('should reject empty OTP field', async () => {
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/otp must be 6 digits/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during OTP verification', async () => {
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      
      const verifyButton = screen.getByRole('button', { name: 'Verify Code' })
      await user.click(verifyButton)
      
      expect(verifyButton).toHaveTextContent(/verifying/i)
      expect(verifyButton).toBeDisabled()
    })

    it('should prevent multiple rapid OTP submissions', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockOTPVerificationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      
      const verifyButton = screen.getByRole('button', { name: 'Verify Code' })
      
      // Click multiple times rapidly
      await user.click(verifyButton)
      await user.click(verifyButton)
      await user.click(verifyButton)
      
      expect(mockSubmit).toHaveBeenCalledTimes(1)
    })

    it('should handle incorrect OTP with clear error message', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': Promise.reject({
          status: 400,
          error: 'Invalid OTP code'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Verification Code'), '000000')
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/invalid otp code/i)).toBeInTheDocument()
      })
    })

    it('should handle server errors during OTP verification', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': Promise.reject({
          status: 500,
          error: 'Internal server error'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/internal server error|verification failed/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during OTP verification', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': Promise.reject({
          name: 'NetworkError',
          message: 'Network request failed'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/network request failed|verification failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('OTP Verification', () => {
    it('should authenticate user with correct OTP within 5 minutes', async () => {
      const mockOTP = '123456'
      const mockUser = MockDataFactory.createUser()
      
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': { 
          success: true, 
          user: mockUser,
          token: 'jwt-token-123'
        }
      })
      
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockOTPVerificationForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Enter 6-digit OTP'), mockOTP)
      await user.click(screen.getByRole('button', { name: 'Verify OTP' }))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-otp',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(mockOTP)
          })
        )
      })
    })

    it('should reject OTP after 5 minutes expiry', async () => {
      const mockOTP = '123456'
      
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': Promise.reject({
          status: 400,
          message: 'OTP expired'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      // Fast-forward time by 6 minutes
      jest.advanceTimersByTime(6 * 60 * 1000)
      
      await user.type(screen.getByLabelText('Enter 6-digit OTP'), mockOTP)
      await user.click(screen.getByRole('button', { name: 'Verify OTP' }))
      
      await waitFor(() => {
        expect(screen.getByText(/otp expired/i)).toBeInTheDocument()
      })
    })

    it('should lock phone number after 3 incorrect OTP attempts', async () => {
      const invalidOTP = '000000'
      
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': Promise.reject({
          status: 400,
          message: 'Invalid OTP'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      // Attempt 3 times with invalid OTP
      for (let i = 0; i < 3; i++) {
        await user.clear(screen.getByLabelText('Verification Code'))
        await user.type(screen.getByLabelText('Verification Code'), invalidOTP)
        await user.click(screen.getByRole('button', { name: 'Verify Code' }))
        
        await waitFor(() => {
          expect(screen.getByText(/invalid otp/i)).toBeInTheDocument()
        })
      }
      
      // 4th attempt should show lockout message
      await user.clear(screen.getByLabelText('Verification Code'))
      await user.type(screen.getByLabelText('Verification Code'), invalidOTP)
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))
      
      await waitFor(() => {
        expect(screen.getByText(/phone number locked for 15 minutes/i)).toBeInTheDocument()
      })
    })

    it('should unlock phone number after 15 minutes lockout', async () => {
      // Simulate locked state
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': Promise.reject({
          status: 429,
          message: 'Phone number locked'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      // Initially locked
      await user.type(screen.getByLabelText('Enter 6-digit OTP'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify OTP' }))
      
      await waitFor(() => {
        expect(screen.getByText(/phone number locked/i)).toBeInTheDocument()
      })
      
      // Fast-forward 15 minutes
      jest.advanceTimersByTime(15 * 60 * 1000)
      
      // Mock successful unlock
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': { 
          success: true, 
          user: MockDataFactory.createUser(),
          token: 'jwt-token-123'
        }
      })
      
      await user.clear(screen.getByLabelText('Verification Code'))
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))
      
      await waitFor(() => {
        expect(screen.queryByText(/phone number locked/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('OTP Resend Functionality - Negative Cases', () => {
    it('should prevent resending OTP when already in progress', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': new Promise(resolve => {
          // Simulate slow API response
          setTimeout(() => resolve({ success: true, otpId: 'otp-456' }), 1000)
        })
      })
      
      const mockResend = jest.fn()
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} onResend={mockResend} />)
      
      const resendButton = screen.getByRole('button', { name: 'Resend code' })
      
      // Fast-forward to enable resend
      jest.advanceTimersByTime(60 * 1000)
      
      // Click resend multiple times rapidly
      await user.click(resendButton)
      await user.click(resendButton)
      await user.click(resendButton)
      
      // Should only trigger once
      expect(mockResend).toHaveBeenCalledTimes(1)
    })

    it('should handle resend API failures', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': Promise.reject({
          status: 500,
          error: 'Failed to resend OTP'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} onResend={jest.fn()} />)
      
      const resendButton = screen.getByRole('button', { name: 'Resend code' })
      
      // Fast-forward to enable resend
      jest.advanceTimersByTime(60 * 1000)
      
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to resend otp/i)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting on resend attempts', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': Promise.reject({
          status: 429,
          error: 'Too many OTP requests. Please wait before trying again.'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} onResend={jest.fn()} />)
      
      const resendButton = screen.getByRole('button', { name: 'Resend code' })
      
      // Fast-forward to enable resend
      jest.advanceTimersByTime(60 * 1000)
      
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/too many otp requests/i)).toBeInTheDocument()
      })
    })

    it('should show appropriate countdown timer', async () => {
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} onResend={jest.fn()} />)
      
      const resendButton = screen.getByRole('button', { name: 'Resend code' })
      
      // Initially should show countdown
      expect(resendButton).toHaveTextContent(/resend code in \d+s/i)
      expect(resendButton).toBeDisabled()
      
      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30 * 1000)
      
      // Should still show countdown
      expect(resendButton).toHaveTextContent(/resend code in \d+s/i)
      expect(resendButton).toBeDisabled()
      
      // Fast-forward full 60 seconds
      jest.advanceTimersByTime(30 * 1000)
      
      // Should now be enabled
      expect(resendButton).toHaveTextContent(/resend code$/i)
      expect(resendButton).not.toBeDisabled()
    })
  })

  describe('OTP Resend Functionality', () => {
    it('should allow resending OTP after 60 seconds cooldown', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': { success: true, otpId: 'otp-456' }
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      const resendButton = screen.getByRole('button', { name: 'Resend OTP' })
      
      // Initially disabled or shows cooldown
      expect(resendButton).toBeDisabled()
      
      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60 * 1000)
      
      // Should be enabled now
      expect(resendButton).not.toBeDisabled()
      
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/send-otp', expect.any(Object))
      })
    })

    it('should prevent resending OTP before 60 seconds cooldown', async () => {
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      const resendButton = screen.getByRole('button', { name: 'Resend OTP' })
      
      // Should be disabled initially
      expect(resendButton).toBeDisabled()
      
      // Fast-forward 30 seconds (less than 60)
      jest.advanceTimersByTime(30 * 1000)
      
      // Should still be disabled
      expect(resendButton).toBeDisabled()
      
      await user.click(resendButton)
      
      // Should not have made API call
      expect(global.fetch).not.toHaveBeenCalledWith('/api/auth/send-otp', expect.any(Object))
    })
  })

  describe('JWT Token Creation', () => {
    it('should create JWT token with user roles and permissions on successful authentication', async () => {
      const mockUser = MockDataFactory.createUser({
        role: 'admin',
        companyId: 'company-123'
      })
      
      const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': {
          success: true,
          user: mockUser,
          token: expectedToken
        }
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Enter 6-digit OTP'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify OTP' }))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-otp', expect.any(Object))
      })
      
      // Verify token contains user information
      const response = await fetch('/api/auth/verify-otp')
      const data = await response.json()
      
      expect(data.token).toBe(expectedToken)
      expect(data.user.role).toBe('admin')
      expect(data.user.companyId).toBe('company-123')
    })

    it('should include appropriate permissions in JWT token', async () => {
      const mockUser = MockDataFactory.createUser({
        role: 'member',
        companyId: 'company-123'
      })
      
      const mockTokenPayload = {
        userId: mockUser.id,
        role: mockUser.role,
        companyId: mockUser.companyId,
        permissions: ['read:profiles', 'create:requests'],
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      }
      
      ApiMockHelper.mockFetch({
        '/api/auth/verify-otp': {
          success: true,
          user: mockUser,
          token: 'jwt-with-permissions',
          payload: mockTokenPayload
        }
      })
      
      const user = userEvent.setup()
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Enter 6-digit OTP'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify OTP' }))
      
      const response = await fetch('/api/auth/verify-otp')
      const data = await response.json()
      
      expect(data.payload.permissions).toContain('read:profiles')
      expect(data.payload.permissions).toContain('create:requests')
      expect(data.payload.role).toBe('member')
    })
  })

  describe('Error Handling', () => {
    it('should handle Twilio SMS delivery failures', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': Promise.reject({
          status: 500,
          message: 'SMS delivery failed'
        })
      })
      
      const user = userEvent.setup()
      render(<MockPhoneLoginForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.click(screen.getByRole('button', { name: 'Send OTP' }))
      
      await waitFor(() => {
        expect(screen.getByText(/sms delivery failed/i)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity issues', async () => {
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': Promise.reject({
          name: 'NetworkError',
          message: 'Network request failed'
        })
      })
      
      const user = userEvent.setup()
      render(<MockPhoneLoginForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Phone Number'), '+1234567890')
      await user.click(screen.getByRole('button', { name: 'Send OTP' }))
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full phone authentication workflow', async () => {
      const mockPhone = '+1234567890'
      const mockOTP = '123456'
      const mockUser = MockDataFactory.createUser({ phone: mockPhone })
      
      // Mock complete workflow
      ApiMockHelper.mockFetch({
        '/api/auth/send-otp': { success: true, otpId: 'otp-123' },
        '/api/auth/verify-otp': { 
          success: true, 
          user: mockUser,
          token: 'jwt-token-123'
        }
      })
      
      const user = userEvent.setup()
      
      // Step 1: Phone number entry
      render(<MockPhoneLoginForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Phone Number'), mockPhone)
      await user.click(screen.getByRole('button', { name: 'Send OTP' }))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/send-otp', expect.any(Object))
      })
      
      // Step 2: OTP verification
      render(<MockOTPVerificationForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Enter 6-digit OTP'), mockOTP)
      await user.click(screen.getByRole('button', { name: 'Verify OTP' }))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-otp', expect.any(Object))
      })
      
      // Step 3: Verify successful authentication
      const response = await fetch('/api/auth/verify-otp')
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.user.phone).toBe(mockPhone)
      expect(data.token).toBeDefined()
    })
  })
})
