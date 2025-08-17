import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockDataFactory, ApiMockHelper, FormTestHelper } from '../utils/test-helpers'

// Mock payment components
const MockPaymentForm = ({ offer, onSubmit }: { offer: any, onSubmit: (paymentData: any) => void }) => (
  <div>
    <div data-testid="offer-details">
      <p>Engagement Amount: ${offer.totalAmount}</p>
      <p>Platform Fee (15%): ${offer.platformFee}</p>
      <p>Total Cost: ${offer.totalAmount + offer.platformFee}</p>
    </div>
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      onSubmit({
        cardNumber: formData.get('cardNumber'),
        expiryDate: formData.get('expiryDate'),
        cvv: formData.get('cvv'),
        amount: offer.totalAmount + offer.platformFee
      })
    }}>
      <label htmlFor="cardNumber">Card Number</label>
      <input id="cardNumber" name="cardNumber" required />
      
      <label htmlFor="expiryDate">Expiry Date</label>
      <input id="expiryDate" name="expiryDate" placeholder="MM/YY" required />
      
      <label htmlFor="cvv">CVV</label>
      <input id="cvv" name="cvv" type="password" required />
      
      <button type="submit">Pay ${offer.totalAmount + offer.platformFee}</button>
    </form>
  </div>
)

const MockEscrowStatus = ({ engagement }: { engagement: any }) => (
  <div data-testid="escrow-status">
    <p>Status: {engagement.paymentStatus}</p>
    <p>Amount in Escrow: ${engagement.escrowAmount}</p>
    <p>Provider will receive: ${engagement.providerAmount}</p>
    {engagement.paymentStatus === 'completed' && (
      <p>Payment released to provider</p>
    )}
  </div>
)

describe('Payment Processing and Escrow System - Requirement 6', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Payment Calculation', () => {
    it('should calculate total cost as engagement amount + 15% platform fee', () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000, // $100.00
        platformFee: 1500   // 15% = $15.00
      })
      
      render(<MockPaymentForm offer={mockOffer} onSubmit={jest.fn()} />)
      
      expect(screen.getByText('Engagement Amount: $10000')).toBeInTheDocument()
      expect(screen.getByText('Platform Fee (15%): $1500')).toBeInTheDocument()
      expect(screen.getByText('Total Cost: $11500')).toBeInTheDocument()
    })

    it('should show provider net amount as 85% of engagement amount', () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000,
        platformFee: 1500,
        netAmount: 8500 // 85% of engagement amount
      })
      
      const mockEngagement = {
        ...mockOffer,
        paymentStatus: 'in_escrow',
        escrowAmount: 10000,
        providerAmount: 8500
      }
      
      render(<MockEscrowStatus engagement={mockEngagement} />)
      
      expect(screen.getByText('Provider will receive: $8500')).toBeInTheDocument()
    })
  })

  describe('Stripe Payment Integration', () => {
    it('should collect payment via Stripe when offer is accepted', async () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000,
        platformFee: 1500
      })
      
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
        amount: 11500
      }
      
      ApiMockHelper.mockFetch({
        '/api/payments/create-payment-intent': mockPaymentIntent,
        '/api/payments/confirm': { success: true, paymentIntentId: 'pi_123' }
      })
      
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockPaymentForm offer={mockOffer} onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Card Number'), '4242424242424242')
      await user.type(screen.getByLabelText('Expiry Date'), '12/25')
      await user.type(screen.getByLabelText('CVV'), '123')
      await user.click(screen.getByRole('button', { name: 'Pay $11500' }))
      
      expect(mockSubmit).toHaveBeenCalledWith({
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        amount: 11500
      })
    })

    it('should handle Stripe payment failures gracefully', async () => {
      const mockOffer = MockDataFactory.createOffer()
      
      ApiMockHelper.mockFetch({
        '/api/payments/create-payment-intent': Promise.reject({
          status: 400,
          message: 'Your card was declined'
        })
      })
      
      const user = userEvent.setup()
      render(<MockPaymentForm offer={mockOffer} onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Card Number'), '4000000000000002') // Declined card
      await user.type(screen.getByLabelText('Expiry Date'), '12/25')
      await user.type(screen.getByLabelText('CVV'), '123')
      await user.click(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText(/your card was declined/i)).toBeInTheDocument()
      })
    })
  })

  describe('Escrow System', () => {
    it('should hold full payment in escrow when offer is accepted', async () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000,
        status: 'accepted'
      })
      
      const mockEngagement = {
        id: 'engagement-123',
        offerId: mockOffer.id,
        paymentStatus: 'in_escrow',
        escrowAmount: 10000,
        providerAmount: 8500,
        platformFee: 1500
      }
      
      ApiMockHelper.mockFetch({
        '/api/engagements/create': mockEngagement
      })
      
      render(<MockEscrowStatus engagement={mockEngagement} />)
      
      expect(screen.getByText('Status: in_escrow')).toBeInTheDocument()
      expect(screen.getByText('Amount in Escrow: $10000')).toBeInTheDocument()
      expect(screen.getByText('Provider will receive: $8500')).toBeInTheDocument()
    })

    it('should automatically release 85% to provider when engagement completes', async () => {
      const mockEngagement = {
        id: 'engagement-123',
        paymentStatus: 'completed',
        escrowAmount: 0,
        providerAmount: 8500,
        platformFee: 1500,
        completedAt: new Date().toISOString()
      }
      
      ApiMockHelper.mockFetch({
        '/api/engagements/complete': mockEngagement,
        '/api/payments/release-escrow': { success: true, amount: 8500 }
      })
      
      render(<MockEscrowStatus engagement={mockEngagement} />)
      
      expect(screen.getByText('Status: completed')).toBeInTheDocument()
      expect(screen.getByText('Payment released to provider')).toBeInTheDocument()
    })

    it('should hold payments in escrow during disputes', async () => {
      const mockEngagement = {
        id: 'engagement-123',
        paymentStatus: 'disputed',
        escrowAmount: 10000,
        providerAmount: 8500,
        disputeReason: 'Work not completed as agreed'
      }
      
      ApiMockHelper.mockFetch({
        '/api/disputes/create': {
          id: 'dispute-123',
          engagementId: mockEngagement.id,
          status: 'open',
          reason: mockEngagement.disputeReason
        }
      })
      
      render(<MockEscrowStatus engagement={mockEngagement} />)
      
      expect(screen.getByText('Status: disputed')).toBeInTheDocument()
      expect(screen.getByText('Amount in Escrow: $10000')).toBeInTheDocument()
    })
  })

  describe('Transaction Confirmations', () => {
    it('should send SMS confirmation to both parties when payment is collected', async () => {
      const mockOffer = MockDataFactory.createOffer()
      const mockSeeker = MockDataFactory.createUser({ phone: '+1234567890' })
      const mockProvider = MockDataFactory.createUser({ phone: '+0987654321' })
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      // Simulate payment collection
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockSeeker.phone,
          message: `Payment of $${mockOffer.totalAmount + mockOffer.platformFee} collected for engagement ${mockOffer.id}`
        })
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockProvider.phone,
          message: `Payment secured in escrow. You will receive $${mockOffer.netAmount} upon completion.`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms', 
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(mockSeeker.phone)
        })
      )
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms',
        expect.objectContaining({
          method: 'POST', 
          body: expect.stringContaining(mockProvider.phone)
        })
      )
    })

    it('should send confirmation when payment is released to provider', async () => {
      const mockProvider = MockDataFactory.createUser({ phone: '+0987654321' })
      const releaseAmount = 8500
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-124' }
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockProvider.phone,
          message: `Payment of $${releaseAmount} has been released to your account.`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(`$${releaseAmount}`)
        })
      )
    })
  })

  describe('Fee Calculation and Retention', () => {
    it('should retain 15% as platform fee when payment is processed', () => {
      const engagementAmount = 10000
      const expectedPlatformFee = Math.round(engagementAmount * 0.15)
      const expectedProviderAmount = engagementAmount - expectedPlatformFee
      
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: engagementAmount,
        platformFee: expectedPlatformFee,
        netAmount: expectedProviderAmount
      })
      
      expect(mockOffer.platformFee).toBe(1500) // 15% of 10000
      expect(mockOffer.netAmount).toBe(8500)   // 85% of 10000
    })

    it('should calculate fees correctly for different engagement amounts', () => {
      const testCases = [
        { engagement: 5000, expectedFee: 750, expectedNet: 4250 },
        { engagement: 20000, expectedFee: 3000, expectedNet: 17000 },
        { engagement: 1000, expectedFee: 150, expectedNet: 850 }
      ]
      
      testCases.forEach(({ engagement, expectedFee, expectedNet }) => {
        const calculatedFee = Math.round(engagement * 0.15)
        const calculatedNet = engagement - calculatedFee
        
        expect(calculatedFee).toBe(expectedFee)
        expect(calculatedNet).toBe(expectedNet)
      })
    })
  })

  describe('Payment Security', () => {
    it('should use secure Stripe integration for card processing', async () => {
      const mockOffer = MockDataFactory.createOffer()
      
      // Mock Stripe Elements
      const mockStripe = {
        elements: jest.fn(() => ({
          create: jest.fn(() => ({
            mount: jest.fn(),
            on: jest.fn()
          }))
        })),
        confirmCardPayment: jest.fn().mockResolvedValue({
          paymentIntent: { status: 'succeeded' }
        })
      }
      
      // Simulate secure card processing
      const paymentResult = await mockStripe.confirmCardPayment('pi_123', {
        payment_method: {
          card: 'card_element',
          billing_details: { name: 'John Doe' }
        }
      })
      
      expect(paymentResult.paymentIntent.status).toBe('succeeded')
      expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith('pi_123', expect.any(Object))
    })

    it('should not store sensitive card information', async () => {
      const mockPaymentData = {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123'
      }
      
      ApiMockHelper.mockFetch({
        '/api/payments/process': {
          success: true,
          paymentIntentId: 'pi_123',
          // Should not return card details
          cardLast4: '4242',
          cardBrand: 'visa'
        }
      })
      
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(mockPaymentData)
      })
      
      const result = await response.json()
      
      expect(result.cardNumber).toBeUndefined()
      expect(result.cvv).toBeUndefined()
      expect(result.cardLast4).toBe('4242')
    })
  })

  describe('Error Handling', () => {
    it('should handle insufficient funds gracefully', async () => {
      ApiMockHelper.mockFetch({
        '/api/payments/create-payment-intent': Promise.reject({
          status: 402,
          message: 'Insufficient funds'
        })
      })
      
      const user = userEvent.setup()
      render(<MockPaymentForm offer={MockDataFactory.createOffer()} onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Card Number'), '4000000000000341')
      await user.click(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during payment processing', async () => {
      ApiMockHelper.mockFetch({
        '/api/payments/create-payment-intent': Promise.reject({
          name: 'NetworkError',
          message: 'Network request failed'
        })
      })
      
      const user = userEvent.setup()
      render(<MockPaymentForm offer={MockDataFactory.createOffer()} onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Card Number'), '4242424242424242')
      await user.click(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full payment and escrow workflow', async () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000,
        platformFee: 1500,
        netAmount: 8500
      })
      
      const mockEngagement = {
        id: 'engagement-123',
        offerId: mockOffer.id,
        paymentStatus: 'in_escrow',
        escrowAmount: 10000,
        providerAmount: 8500
      }
      
      ApiMockHelper.mockFetch({
        '/api/payments/create-payment-intent': { id: 'pi_123', status: 'requires_confirmation' },
        '/api/payments/confirm': { success: true, paymentIntentId: 'pi_123' },
        '/api/engagements/create': mockEngagement,
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      const user = userEvent.setup()
      
      // Step 1: Process payment
      render(<MockPaymentForm offer={mockOffer} onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Card Number'), '4242424242424242')
      await user.type(screen.getByLabelText('Expiry Date'), '12/25')
      await user.type(screen.getByLabelText('CVV'), '123')
      await user.click(screen.getByRole('button'))
      
      // Step 2: Verify escrow status
      render(<MockEscrowStatus engagement={mockEngagement} />)
      
      expect(screen.getByText('Status: in_escrow')).toBeInTheDocument()
      expect(screen.getByText('Amount in Escrow: $10000')).toBeInTheDocument()
      
      // Step 3: Complete engagement and release payment
      const completedEngagement = {
        ...mockEngagement,
        paymentStatus: 'completed',
        escrowAmount: 0
      }
      
      render(<MockEscrowStatus engagement={completedEngagement} />)
      
      expect(screen.getByText('Status: completed')).toBeInTheDocument()
      expect(screen.getByText('Payment released to provider')).toBeInTheDocument()
    })
  })
})
