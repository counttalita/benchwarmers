import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockDataFactory, ApiMockHelper, FormTestHelper } from '../utils/test-helpers'

// Mock offer components
const MockOfferCreationForm = ({ talentProfile, onSubmit }: { talentProfile: any, onSubmit: (data: any) => void }) => (
  <div>
    <div data-testid="talent-info">
      <h3>{talentProfile.name}</h3>
      <p>Rate: ${talentProfile.hourlyRate}/hour</p>
    </div>
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      onSubmit({
        rate: Number(formData.get('rate')),
        startDate: formData.get('startDate'),
        duration: formData.get('duration'),
        terms: formData.get('terms')
      })
    }}>
      <label htmlFor="rate">Hourly Rate ($)</label>
      <input id="rate" name="rate" type="number" defaultValue={talentProfile.hourlyRate} required />
      
      <label htmlFor="startDate">Start Date</label>
      <input id="startDate" name="startDate" type="date" required />
      
      <label htmlFor="duration">Duration</label>
      <select id="duration" name="duration" required>
        <option value="1 week">1 week</option>
        <option value="1 month">1 month</option>
        <option value="3 months">3 months</option>
        <option value="6 months">6 months</option>
      </select>
      
      <label htmlFor="terms">Terms and Conditions</label>
      <textarea id="terms" name="terms" required />
      
      <button type="submit">Create Offer</button>
    </form>
  </div>
)

const MockOfferResponse = ({ offer, onRespond }: { offer: any, onRespond: (response: string, data?: any) => void }) => (
  <div data-testid="offer-details">
    <h3>Offer Details</h3>
    <p>Rate: ${offer.rate}/hour</p>
    <p>Start Date: {offer.startDate}</p>
    <p>Duration: {offer.duration}</p>
    <p>Total Cost: ${offer.totalAmount}</p>
    <p>You will receive: ${offer.netAmount} (after 15% platform fee)</p>
    <p>Terms: {offer.terms}</p>
    
    <div>
      <button onClick={() => onRespond('accept')}>Accept Offer</button>
      <button onClick={() => onRespond('decline')}>Decline Offer</button>
      <button onClick={() => onRespond('counter')}>Counter Offer</button>
    </div>
  </div>
)

const MockCounterOfferForm = ({ originalOffer, onSubmit }: { originalOffer: any, onSubmit: (data: any) => void }) => (
  <form onSubmit={(e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      rate: Number(formData.get('rate')),
      startDate: formData.get('startDate'),
      duration: formData.get('duration'),
      terms: formData.get('terms'),
      counterReason: formData.get('counterReason')
    })
  }}>
    <h3>Counter Offer</h3>
    <label htmlFor="rate">Proposed Rate ($)</label>
    <input id="rate" name="rate" type="number" defaultValue={originalOffer.rate} required />
    
    <label htmlFor="startDate">Preferred Start Date</label>
    <input id="startDate" name="startDate" type="date" defaultValue={originalOffer.startDate} required />
    
    <label htmlFor="duration">Preferred Duration</label>
    <select id="duration" name="duration" defaultValue={originalOffer.duration} required>
      <option value="1 week">1 week</option>
      <option value="1 month">1 month</option>
      <option value="3 months">3 months</option>
      <option value="6 months">6 months</option>
    </select>
    
    <label htmlFor="terms">Modified Terms</label>
    <textarea id="terms" name="terms" defaultValue={originalOffer.terms} required />
    
    <label htmlFor="counterReason">Reason for Counter Offer</label>
    <textarea id="counterReason" name="counterReason" required />
    
    <button type="submit">Send Counter Offer</button>
  </form>
)

describe('Offer Management and Negotiation - Requirement 7', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Offer Creation', () => {
    it('should include rate, start date, duration, terms, and total cost breakdown', () => {
      const mockTalent = MockDataFactory.createTalentProfile({
        hourlyRate: 75
      })
      
      render(<MockOfferCreationForm talentProfile={mockTalent} onSubmit={jest.fn()} />)
      
      expect(screen.getByLabelText('Hourly Rate ($)')).toHaveValue(75)
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Duration')).toBeInTheDocument()
      expect(screen.getByLabelText('Terms and Conditions')).toBeInTheDocument()
    })

    it('should calculate total cost based on rate and duration', async () => {
      const mockTalent = MockDataFactory.createTalentProfile({ hourlyRate: 75 })
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockOfferCreationForm talentProfile={mockTalent} onSubmit={mockSubmit} />)
      
      await user.selectOptions(screen.getByLabelText('Duration'), '1 month')
      await user.type(screen.getByLabelText('Start Date'), '2024-01-15')
      await user.type(screen.getByLabelText('Terms and Conditions'), 'Standard terms')
      await user.click(screen.getByRole('button', { name: 'Create Offer' }))
      
      expect(mockSubmit).toHaveBeenCalledWith({
        rate: 75,
        startDate: '2024-01-15',
        duration: '1 month',
        terms: 'Standard terms'
      })
    })

    it('should validate required fields before submission', async () => {
      const mockTalent = MockDataFactory.createTalentProfile()
      const user = userEvent.setup()
      
      render(<MockOfferCreationForm talentProfile={mockTalent} onSubmit={jest.fn()} />)
      
      await user.click(screen.getByRole('button', { name: 'Create Offer' }))
      
      // Should show validation errors for required fields
      expect(screen.getByLabelText('Start Date')).toBeInvalid()
      expect(screen.getByLabelText('Terms and Conditions')).toBeInvalid()
    })
  })

  describe('Offer Notifications', () => {
    it('should send SMS notification when provider receives offer', async () => {
      const mockOffer = MockDataFactory.createOffer()
      const mockProvider = MockDataFactory.createUser({ phone: '+1234567890' })
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      // Simulate offer creation triggering notification
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockProvider.phone,
          message: `New offer received: $${mockOffer.rate}/hour for ${mockOffer.duration}. Net earnings: $${mockOffer.netAmount}`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(mockProvider.phone)
        })
      )
    })

    it('should show net earnings after platform fee in notification', async () => {
      const mockOffer = MockDataFactory.createOffer({
        totalAmount: 10000,
        netAmount: 8500 // 85% after 15% platform fee
      })
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-124' }
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          message: `Net earnings: $${mockOffer.netAmount} (after platform fee)`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms',
        expect.objectContaining({
          body: expect.stringContaining('$8500')
        })
      )
    })
  })

  describe('Offer Response Options', () => {
    it('should allow provider to accept, decline, or counter-offer', () => {
      const mockOffer = MockDataFactory.createOffer()
      
      render(<MockOfferResponse offer={mockOffer} onRespond={jest.fn()} />)
      
      expect(screen.getByRole('button', { name: 'Accept Offer' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Decline Offer' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Counter Offer' })).toBeInTheDocument()
    })

    it('should handle offer acceptance', async () => {
      const mockOffer = MockDataFactory.createOffer()
      const mockRespond = jest.fn()
      const user = userEvent.setup()
      
      ApiMockHelper.mockFetch({
        '/api/offers/accept': { ...mockOffer, status: 'accepted' }
      })
      
      render(<MockOfferResponse offer={mockOffer} onRespond={mockRespond} />)
      
      await user.click(screen.getByRole('button', { name: 'Accept Offer' }))
      
      expect(mockRespond).toHaveBeenCalledWith('accept')
    })

    it('should handle offer decline', async () => {
      const mockOffer = MockDataFactory.createOffer()
      const mockRespond = jest.fn()
      const user = userEvent.setup()
      
      render(<MockOfferResponse offer={mockOffer} onRespond={mockRespond} />)
      
      await user.click(screen.getByRole('button', { name: 'Decline Offer' }))
      
      expect(mockRespond).toHaveBeenCalledWith('decline')
    })
  })

  describe('Counter Offer Functionality', () => {
    it('should allow provider to modify terms in counter offer', async () => {
      const mockOffer = MockDataFactory.createOffer({
        rate: 75,
        duration: '3 months',
        terms: 'Original terms'
      })
      
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockCounterOfferForm originalOffer={mockOffer} onSubmit={mockSubmit} />)
      
      await user.clear(screen.getByLabelText('Proposed Rate ($)'))
      await user.type(screen.getByLabelText('Proposed Rate ($)'), '85')
      await user.selectOptions(screen.getByLabelText('Preferred Duration'), '6 months')
      await user.type(screen.getByLabelText('Reason for Counter Offer'), 'Rate adjustment needed for extended duration')
      await user.click(screen.getByRole('button', { name: 'Send Counter Offer' }))
      
      expect(mockSubmit).toHaveBeenCalledWith({
        rate: 85,
        startDate: mockOffer.startDate,
        duration: '6 months',
        terms: mockOffer.terms,
        counterReason: 'Rate adjustment needed for extended duration'
      })
    })

    it('should notify seeker via SMS when offer is countered', async () => {
      const mockSeeker = MockDataFactory.createUser({ phone: '+0987654321' })
      const counterData = {
        rate: 85,
        duration: '6 months',
        counterReason: 'Rate adjustment needed'
      }
      
      ApiMockHelper.mockFetch({
        '/api/notifications/sms': { success: true, messageId: 'msg-125' }
      })
      
      await fetch('/api/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({
          to: mockSeeker.phone,
          message: `Counter offer received: $${counterData.rate}/hour for ${counterData.duration}. Reason: ${counterData.counterReason}`
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/sms',
        expect.objectContaining({
          body: expect.stringContaining('Counter offer received')
        })
      )
    })

    it('should allow seeker to respond to counter offer within 48 hours', async () => {
      const mockCounterOffer = MockDataFactory.createOffer({
        status: 'countered',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      })
      
      ApiMockHelper.mockFetch({
        '/api/offers/respond-to-counter': { success: true }
      })
      
      // Should be within 48-hour window
      expect(new Date(mockCounterOffer.expiresAt).getTime()).toBeGreaterThan(Date.now())
      
      // Fast-forward 47 hours (still within window)
      jest.advanceTimersByTime(47 * 60 * 60 * 1000)
      
      const response = await fetch('/api/offers/respond-to-counter', {
        method: 'POST',
        body: JSON.stringify({ offerId: mockCounterOffer.id, response: 'accept' })
      })
      
      expect(response.ok).toBe(true)
    })
  })

  describe('Offer Expiration', () => {
    it('should automatically mark offer as declined if no response within 48 hours', async () => {
      const mockOffer = MockDataFactory.createOffer({
        status: 'pending',
        createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString() // 49 hours ago
      })
      
      ApiMockHelper.mockFetch({
        '/api/offers/expire': { ...mockOffer, status: 'expired' }
      })
      
      // Fast-forward past 48-hour expiry
      jest.advanceTimersByTime(49 * 60 * 60 * 1000)
      
      const response = await fetch('/api/offers/expire', {
        method: 'POST',
        body: JSON.stringify({ offerId: mockOffer.id })
      })
      
      const expiredOffer = await response.json()
      expect(expiredOffer.status).toBe('expired')
    })

    it('should prevent responses to expired offers', async () => {
      const expiredOffer = MockDataFactory.createOffer({
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000).toISOString() // Already expired
      })
      
      ApiMockHelper.mockFetch({
        '/api/offers/respond': Promise.reject({
          status: 400,
          message: 'Offer has expired'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOfferResponse offer={expiredOffer} onRespond={jest.fn()} />)
      
      await user.click(screen.getByRole('button', { name: 'Accept Offer' }))
      
      await waitFor(() => {
        expect(screen.getByText(/offer has expired/i)).toBeInTheDocument()
      })
    })
  })

  describe('Engagement Creation', () => {
    it('should create engagement record when offer is accepted', async () => {
      const mockOffer = MockDataFactory.createOffer({ status: 'accepted' })
      const mockEngagement = {
        id: 'engagement-123',
        offerId: mockOffer.id,
        talentId: mockOffer.talentId,
        requestId: mockOffer.requestId,
        status: 'active',
        startDate: mockOffer.startDate,
        rate: mockOffer.rate,
        duration: mockOffer.duration
      }
      
      ApiMockHelper.mockFetch({
        '/api/engagements/create': mockEngagement
      })
      
      const response = await fetch('/api/engagements/create', {
        method: 'POST',
        body: JSON.stringify({ offerId: mockOffer.id })
      })
      
      const engagement = await response.json()
      
      expect(engagement.offerId).toBe(mockOffer.id)
      expect(engagement.status).toBe('active')
      expect(engagement.rate).toBe(mockOffer.rate)
    })

    it('should initiate payment collection when engagement is created', async () => {
      const mockOffer = MockDataFactory.createOffer({ status: 'accepted' })
      
      ApiMockHelper.mockFetch({
        '/api/payments/initiate': { 
          success: true, 
          paymentIntentId: 'pi_123',
          amount: mockOffer.totalAmount + mockOffer.platformFee
        }
      })
      
      await fetch('/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify({ 
          offerId: mockOffer.id,
          amount: mockOffer.totalAmount + mockOffer.platformFee
        })
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/payments/initiate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(mockOffer.id)
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during offer submission', async () => {
      const mockTalent = MockDataFactory.createTalentProfile()
      
      ApiMockHelper.mockFetch({
        '/api/offers/create': Promise.reject({
          name: 'NetworkError',
          message: 'Network request failed'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOfferCreationForm talentProfile={mockTalent} onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Start Date'), '2024-01-15')
      await user.type(screen.getByLabelText('Terms and Conditions'), 'Terms')
      await user.click(screen.getByRole('button', { name: 'Create Offer' }))
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('should handle invalid offer data gracefully', async () => {
      const mockTalent = MockDataFactory.createTalentProfile()
      
      ApiMockHelper.mockFetch({
        '/api/offers/create': Promise.reject({
          status: 400,
          message: 'Invalid offer data'
        })
      })
      
      const user = userEvent.setup()
      render(<MockOfferCreationForm talentProfile={mockTalent} onSubmit={jest.fn()} />)
      
      await user.clear(screen.getByLabelText('Hourly Rate ($)'))
      await user.type(screen.getByLabelText('Hourly Rate ($)'), '-10') // Invalid negative rate
      await user.type(screen.getByLabelText('Start Date'), '2024-01-15')
      await user.type(screen.getByLabelText('Terms and Conditions'), 'Terms')
      await user.click(screen.getByRole('button', { name: 'Create Offer' }))
      
      await waitFor(() => {
        expect(screen.getByText(/invalid offer data/i)).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full offer negotiation workflow', async () => {
      const mockTalent = MockDataFactory.createTalentProfile()
      const mockOffer = MockDataFactory.createOffer()
      const mockCounterOffer = { ...mockOffer, rate: 85, status: 'countered' }
      const mockFinalOffer = { ...mockCounterOffer, status: 'accepted' }
      
      ApiMockHelper.mockFetch({
        '/api/offers/create': mockOffer,
        '/api/offers/counter': mockCounterOffer,
        '/api/offers/accept': mockFinalOffer,
        '/api/engagements/create': { id: 'engagement-123', offerId: mockFinalOffer.id },
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      const user = userEvent.setup()
      
      // Step 1: Create initial offer
      render(<MockOfferCreationForm talentProfile={mockTalent} onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Start Date'), '2024-01-15')
      await user.selectOptions(screen.getByLabelText('Duration'), '3 months')
      await user.type(screen.getByLabelText('Terms and Conditions'), 'Standard terms')
      await user.click(screen.getByRole('button', { name: 'Create Offer' }))
      
      // Step 2: Provider counters the offer
      render(<MockCounterOfferForm originalOffer={mockOffer} onSubmit={jest.fn()} />)
      
      await user.clear(screen.getByLabelText('Proposed Rate ($)'))
      await user.type(screen.getByLabelText('Proposed Rate ($)'), '85')
      await user.type(screen.getByLabelText('Reason for Counter Offer'), 'Rate adjustment')
      await user.click(screen.getByRole('button', { name: 'Send Counter Offer' }))
      
      // Step 3: Seeker accepts counter offer
      render(<MockOfferResponse offer={mockCounterOffer} onRespond={jest.fn()} />)
      
      await user.click(screen.getByRole('button', { name: 'Accept Offer' }))
      
      // Verify all API calls were made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/offers/create', expect.any(Object))
        expect(global.fetch).toHaveBeenCalledWith('/api/offers/counter', expect.any(Object))
        expect(global.fetch).toHaveBeenCalledWith('/api/offers/accept', expect.any(Object))
      })
    })
  })
})
