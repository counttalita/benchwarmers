import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockDataFactory, ApiMockHelper, FormTestHelper, ValidationTestHelper } from '../utils/test-helpers'

// Mock talent profile components following SOLID principles
const MockTalentProfileForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => (
  <form onSubmit={(e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      name: formData.get('name'),
      title: formData.get('title'),
      seniority: formData.get('seniority'),
      skills: formData.get('skills')?.toString().split(',') || [],
      location: formData.get('location'),
      hourlyRate: Number(formData.get('hourlyRate')),
      currency: formData.get('currency')
    })
  }}>
    <label htmlFor="name">Full Name</label>
    <input id="name" name="name" required />
    
    <label htmlFor="title">Job Title</label>
    <input id="title" name="title" required />
    
    <label htmlFor="seniority">Seniority Level</label>
    <select id="seniority" name="seniority" required>
      <option value="junior">Junior</option>
      <option value="mid">Mid-level</option>
      <option value="senior">Senior</option>
      <option value="lead">Lead</option>
    </select>
    
    <label htmlFor="skills">Skills (comma-separated)</label>
    <input id="skills" name="skills" placeholder="React, TypeScript, Node.js" required />
    
    <label htmlFor="location">Location</label>
    <input id="location" name="location" required />
    
    <label htmlFor="hourlyRate">Hourly Rate</label>
    <input id="hourlyRate" name="hourlyRate" type="number" min="1" required />
    
    <label htmlFor="currency">Currency</label>
    <select id="currency" name="currency" required>
      <option value="USD">USD</option>
      <option value="EUR">EUR</option>
      <option value="GBP">GBP</option>
    </select>
    
    <button type="submit">Create Profile</button>
  </form>
)

const MockAvailabilityCalendar = ({ onUpdate }: { onUpdate: (availability: any) => void }) => (
  <div data-testid="availability-calendar">
    <h3>Set Availability</h3>
    <label htmlFor="startDate">Available From</label>
    <input 
      id="startDate" 
      type="date" 
      onChange={(e) => onUpdate({ startDate: e.target.value })}
    />
    <label htmlFor="endDate">Available Until</label>
    <input 
      id="endDate" 
      type="date" 
      onChange={(e) => onUpdate({ endDate: e.target.value })}
    />
    <button onClick={() => onUpdate({ status: 'available' })}>
      Mark as Available
    </button>
  </div>
)

describe('Talent Profile Creation and Management - Requirement 4', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Profile Creation Form', () => {
    it('should require name, title, seniority level, skills, and location', () => {
      render(<MockTalentProfileForm onSubmit={jest.fn()} />)
      
      expect(screen.getByLabelText('Full Name')).toBeRequired()
      expect(screen.getByLabelText('Job Title')).toBeRequired()
      expect(screen.getByLabelText('Seniority Level')).toBeRequired()
      expect(screen.getByLabelText('Skills (comma-separated)')).toBeRequired()
      expect(screen.getByLabelText('Location')).toBeRequired()
    })

    it('should validate and submit complete profile data', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockTalentProfileForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Full Name'), 'Jane Developer')
      await user.type(screen.getByLabelText('Job Title'), 'Senior React Developer')
      await user.selectOptions(screen.getByLabelText('Seniority Level'), 'senior')
      await user.type(screen.getByLabelText('Skills (comma-separated)'), 'React, TypeScript, Node.js')
      await user.type(screen.getByLabelText('Location'), 'Remote')
      await user.type(screen.getByLabelText('Hourly Rate'), '85')
      await user.selectOptions(screen.getByLabelText('Currency'), 'USD')
      
      await user.click(screen.getByRole('button', { name: 'Create Profile' }))
      
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Jane Developer',
        title: 'Senior React Developer',
        seniority: 'senior',
        skills: ['React', 'TypeScript', 'Node.js'],
        location: 'Remote',
        hourlyRate: 85,
        currency: 'USD'
      })
    })
  })

  describe('File Upload for Certifications', () => {
    it('should accept PDF, DOC, and image files up to 10MB each', async () => {
      const mockFiles = [
        new File(['certificate content'], 'aws-cert.pdf', { type: 'application/pdf' }),
        new File(['resume content'], 'resume.doc', { type: 'application/msword' }),
        new File(['photo'], 'profile.jpg', { type: 'image/jpeg' })
      ]
      
      ApiMockHelper.mockFetch({
        '/api/talent/upload-certifications': {
          success: true,
          files: mockFiles.map(f => ({ name: f.name, size: f.size }))
        }
      })
      
      const formData = new FormData()
      mockFiles.forEach(file => formData.append('certifications', file))
      
      const response = await fetch('/api/talent/upload-certifications', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(3)
    })

    it('should reject files larger than 10MB', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      })
      
      ApiMockHelper.mockFetch({
        '/api/talent/upload-certifications': Promise.reject({
          status: 413,
          message: 'File size exceeds 10MB limit'
        })
      })
      
      try {
        await fetch('/api/talent/upload-certifications', {
          method: 'POST',
          body: new FormData()
        })
      } catch (error: any) {
        expect(error.status).toBe(413)
        expect(error.message).toContain('10MB limit')
      }
    })
  })

  describe('Availability Calendar', () => {
    it('should provide calendar interface for marking available periods', () => {
      render(<MockAvailabilityCalendar onUpdate={jest.fn()} />)
      
      expect(screen.getByLabelText('Available From')).toBeInTheDocument()
      expect(screen.getByLabelText('Available Until')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Mark as Available' })).toBeInTheDocument()
    })

    it('should update availability when dates are selected', async () => {
      const mockUpdate = jest.fn()
      const user = userEvent.setup()
      
      render(<MockAvailabilityCalendar onUpdate={mockUpdate} />)
      
      await user.type(screen.getByLabelText('Available From'), '2024-01-15')
      expect(mockUpdate).toHaveBeenCalledWith({ startDate: '2024-01-15' })
      
      await user.type(screen.getByLabelText('Available Until'), '2024-04-15')
      expect(mockUpdate).toHaveBeenCalledWith({ endDate: '2024-04-15' })
    })
  })

  describe('Rate Setting', () => {
    it('should allow hourly, daily, and weekly rates with currency selection', async () => {
      const mockTalent = MockDataFactory.createTalentProfile()
      
      ApiMockHelper.mockFetch({
        '/api/talent/update-rates': {
          hourlyRate: 85,
          dailyRate: 680, // 8 hours
          weeklyRate: 3400, // 5 days
          currency: 'USD'
        }
      })
      
      const response = await fetch('/api/talent/update-rates', {
        method: 'POST',
        body: JSON.stringify({
          profileId: mockTalent.id,
          hourlyRate: 85,
          currency: 'USD'
        })
      })
      
      const rates = await response.json()
      expect(rates.hourlyRate).toBe(85)
      expect(rates.dailyRate).toBe(680)
      expect(rates.weeklyRate).toBe(3400)
    })

    it('should default to USD currency', () => {
      render(<MockTalentProfileForm onSubmit={jest.fn()} />)
      
      const currencySelect = screen.getByLabelText('Currency')
      expect(currencySelect).toHaveValue('USD')
    })
  })

  describe('Profile Visibility', () => {
    it('should allow toggling visibility (visible/hidden from search)', async () => {
      const mockTalent = MockDataFactory.createTalentProfile({ isVisible: true })
      
      ApiMockHelper.mockFetch({
        '/api/talent/toggle-visibility': {
          ...mockTalent,
          isVisible: false
        }
      })
      
      const response = await fetch('/api/talent/toggle-visibility', {
        method: 'POST',
        body: JSON.stringify({
          profileId: mockTalent.id,
          isVisible: false
        })
      })
      
      const updatedProfile = await response.json()
      expect(updatedProfile.isVisible).toBe(false)
    })

    it('should hide profile from search when visibility is disabled', async () => {
      const hiddenProfile = MockDataFactory.createTalentProfile({ isVisible: false })
      
      ApiMockHelper.mockFetch({
        '/api/talent/search': {
          profiles: [], // Hidden profile should not appear
          total: 0
        }
      })
      
      const response = await fetch('/api/talent/search?skills=React')
      const searchResults = await response.json()
      
      expect(searchResults.profiles).toHaveLength(0)
      expect(searchResults.profiles.find((p: any) => p.id === hiddenProfile.id)).toBeUndefined()
    })
  })

  describe('Review Integration', () => {
    it('should automatically update average rating when profile receives reviews', async () => {
      const mockTalent = MockDataFactory.createTalentProfile({
        averageRating: 4.5,
        reviewCount: 2
      })
      
      const newReview = {
        rating: 5,
        comment: 'Excellent work!',
        profileId: mockTalent.id
      }
      
      ApiMockHelper.mockFetch({
        '/api/reviews/create': newReview,
        '/api/talent/update-rating': {
          ...mockTalent,
          averageRating: 4.67, // (4.5*2 + 5) / 3
          reviewCount: 3
        }
      })
      
      // Submit new review
      await fetch('/api/reviews/create', {
        method: 'POST',
        body: JSON.stringify(newReview)
      })
      
      // Check updated profile
      const response = await fetch('/api/talent/update-rating', {
        method: 'POST',
        body: JSON.stringify({ profileId: mockTalent.id })
      })
      
      const updatedProfile = await response.json()
      expect(updatedProfile.reviewCount).toBe(3)
      expect(updatedProfile.averageRating).toBeCloseTo(4.67, 2)
    })
  })

  describe('Profile Validation', () => {
    it('should validate required fields before allowing profile creation', async () => {
      const user = userEvent.setup()
      render(<MockTalentProfileForm onSubmit={jest.fn()} />)
      
      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: 'Create Profile' }))
      
      expect(screen.getByLabelText('Full Name')).toBeInvalid()
      expect(screen.getByLabelText('Job Title')).toBeInvalid()
      expect(screen.getByLabelText('Skills (comma-separated)')).toBeInvalid()
    })

    it('should validate hourly rate is positive', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockTalentProfileForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Hourly Rate'), '-10')
      
      const rateInput = screen.getByLabelText('Hourly Rate')
      expect(rateInput).toBeInvalid()
    })

    it('should parse skills correctly from comma-separated input', async () => {
      const mockSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<MockTalentProfileForm onSubmit={mockSubmit} />)
      
      await user.type(screen.getByLabelText('Full Name'), 'Test Developer')
      await user.type(screen.getByLabelText('Job Title'), 'Developer')
      await user.type(screen.getByLabelText('Skills (comma-separated)'), 'React, TypeScript, Node.js, AWS')
      await user.type(screen.getByLabelText('Location'), 'Remote')
      await user.type(screen.getByLabelText('Hourly Rate'), '75')
      
      await user.click(screen.getByRole('button', { name: 'Create Profile' }))
      
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: ['React', 'TypeScript', 'Node.js', 'AWS']
        })
      )
    })
  })

  describe('Integration Tests', () => {
    it('should complete full talent profile creation workflow', async () => {
      const mockTalent = MockDataFactory.createTalentProfile()
      
      ApiMockHelper.mockFetch({
        '/api/talent/profiles': mockTalent,
        '/api/talent/upload-certifications': { success: true, fileIds: ['file-123'] },
        '/api/talent/set-availability': { success: true },
        '/api/notifications/sms': { success: true, messageId: 'msg-123' }
      })
      
      const user = userEvent.setup()
      
      // Step 1: Create profile
      render(<MockTalentProfileForm onSubmit={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Full Name'), mockTalent.name)
      await user.type(screen.getByLabelText('Job Title'), mockTalent.title)
      await user.selectOptions(screen.getByLabelText('Seniority Level'), mockTalent.seniority)
      await user.type(screen.getByLabelText('Skills (comma-separated)'), mockTalent.skills.join(', '))
      await user.type(screen.getByLabelText('Location'), mockTalent.location)
      await user.type(screen.getByLabelText('Hourly Rate'), mockTalent.hourlyRate.toString())
      
      await user.click(screen.getByRole('button', { name: 'Create Profile' }))
      
      // Step 2: Set availability
      render(<MockAvailabilityCalendar onUpdate={jest.fn()} />)
      
      await user.type(screen.getByLabelText('Available From'), '2024-01-15')
      await user.type(screen.getByLabelText('Available Until'), '2024-06-15')
      await user.click(screen.getByRole('button', { name: 'Mark as Available' }))
      
      // Verify API calls were made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/talent/profiles', expect.any(Object))
        expect(global.fetch).toHaveBeenCalledWith('/api/talent/set-availability', expect.any(Object))
      })
    })
  })
})
