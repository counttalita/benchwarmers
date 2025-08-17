import { test, expect } from '@playwright/test'

test.describe('Complete User Journeys', () => {
  test.describe('Seeker Company Journey', () => {
    test('should complete full talent request to engagement flow', async ({ page }) => {
      // 1. Navigate to dashboard and create talent request
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      
      await page.click('[data-testid="create-request-button"]')
      await expect(page).toHaveURL('/requests/create')
      
      // 2. Fill out talent request form
      await page.fill('[data-testid="request-title"]', 'Senior React Developer')
      await page.fill('[data-testid="request-description"]', 'Looking for an experienced React developer for a 3-month project')
      await page.fill('[data-testid="request-budget"]', '15000')
      await page.selectOption('[data-testid="request-duration"]', '90')
      await page.selectOption('[data-testid="experience-level"]', 'senior')
      
      // Add skills
      await page.click('[data-testid="add-skill-button"]')
      await page.fill('[data-testid="skill-input"]', 'React')
      await page.press('[data-testid="skill-input"]', 'Enter')
      await page.fill('[data-testid="skill-input"]', 'TypeScript')
      await page.press('[data-testid="skill-input"]', 'Enter')
      
      // Submit request
      await page.click('[data-testid="submit-request"]')
      await expect(page.getByText('Talent request created successfully')).toBeVisible()
      
      // 3. View request in dashboard
      await page.goto('/dashboard')
      await expect(page.getByText('Senior React Developer')).toBeVisible()
      
      // 4. Navigate to request details
      await page.click('[data-testid="request-card"]:has-text("Senior React Developer")')
      await expect(page).toHaveURL(/\/requests\/[a-f0-9-]+/)
      await expect(page.getByText('$15,000')).toBeVisible()
      
      // 5. View incoming offers (simulate offers exist)
      await page.click('[data-testid="offers-tab"]')
      await expect(page.getByText('Incoming Offers')).toBeVisible()
      
      // 6. Accept an offer
      await page.click('[data-testid="offer-card"]:first-child [data-testid="accept-offer"]')
      await expect(page.getByText('Offer accepted successfully')).toBeVisible()
      
      // 7. Navigate to engagements
      await page.goto('/engagements')
      await expect(page.getByText('Senior React Developer')).toBeVisible()
      await expect(page.getByText('Active')).toBeVisible()
    })

    test('should handle payment flow for milestones', async ({ page }) => {
      // Navigate to active engagement
      await page.goto('/engagements')
      await page.click('[data-testid="engagement-card"]:first-child')
      
      // View milestones
      await page.click('[data-testid="milestones-tab"]')
      await expect(page.getByText('Project Milestones')).toBeVisible()
      
      // Process payment for completed milestone
      await page.click('[data-testid="milestone-card"]:has-text("Completed") [data-testid="pay-milestone"]')
      
      // Payment form
      await page.fill('[data-testid="payment-amount"]', '5000')
      await page.selectOption('[data-testid="payment-method"]', 'pm_card_visa')
      await page.click('[data-testid="process-payment"]')
      
      // Confirm payment
      await expect(page.getByText('Payment processed successfully')).toBeVisible()
      await expect(page.getByText('$5,000.00 paid')).toBeVisible()
    })
  })

  test.describe('Provider User Journey', () => {
    test('should complete profile setup and offer submission', async ({ page }) => {
      // 1. Navigate to profile setup
      await page.goto('/profile/setup')
      await expect(page.getByRole('heading', { name: 'Complete Your Profile' })).toBeVisible()
      
      // 2. Fill out talent profile
      await page.fill('[data-testid="profile-title"]', 'Senior Full-Stack Developer')
      await page.fill('[data-testid="profile-bio"]', 'Experienced developer with 8+ years in React, Node.js, and cloud technologies')
      await page.fill('[data-testid="hourly-rate"]', '85')
      await page.selectOption('[data-testid="experience-level"]', 'senior')
      await page.fill('[data-testid="years-experience"]', '8')
      
      // Add skills
      await page.click('[data-testid="add-skill-button"]')
      await page.fill('[data-testid="skill-input"]', 'React')
      await page.press('[data-testid="skill-input"]', 'Enter')
      await page.fill('[data-testid="skill-input"]', 'Node.js')
      await page.press('[data-testid="skill-input"]', 'Enter')
      await page.fill('[data-testid="skill-input"]', 'AWS')
      await page.press('[data-testid="skill-input"]', 'Enter')
      
      // Set availability
      await page.selectOption('[data-testid="availability"]', 'available')
      await page.selectOption('[data-testid="timezone"]', 'UTC')
      
      // Submit profile
      await page.click('[data-testid="save-profile"]')
      await expect(page.getByText('Profile updated successfully')).toBeVisible()
      
      // 3. Browse available requests
      await page.goto('/browse')
      await expect(page.getByRole('heading', { name: 'Browse Opportunities' })).toBeVisible()
      
      // 4. Filter requests
      await page.selectOption('[data-testid="experience-filter"]', 'senior')
      await page.fill('[data-testid="skills-filter"]', 'React')
      await page.click('[data-testid="apply-filters"]')
      
      // 5. View request details
      await page.click('[data-testid="request-card"]:first-child')
      await expect(page).toHaveURL(/\/requests\/[a-f0-9-]+/)
      
      // 6. Submit offer
      await page.click('[data-testid="submit-offer-button"]')
      await page.fill('[data-testid="proposed-rate"]', '80')
      await page.fill('[data-testid="proposed-duration"]', '90')
      await page.fill('[data-testid="offer-message"]', 'I am very interested in this project and believe my experience with React and TypeScript makes me a great fit.')
      
      await page.click('[data-testid="submit-offer"]')
      await expect(page.getByText('Offer submitted successfully')).toBeVisible()
      
      // 7. View submitted offers
      await page.goto('/offers')
      await expect(page.getByText('Senior React Developer')).toBeVisible()
      await expect(page.getByText('Pending')).toBeVisible()
    })

    test('should manage active engagement and timesheet', async ({ page }) => {
      // Navigate to active engagements
      await page.goto('/engagements')
      await page.click('[data-testid="engagement-card"]:first-child')
      
      // Submit timesheet entry
      await page.click('[data-testid="timesheet-tab"]')
      await page.click('[data-testid="add-time-entry"]')
      
      await page.fill('[data-testid="hours-worked"]', '8')
      await page.fill('[data-testid="work-description"]', 'Implemented user authentication and dashboard components')
      await page.fill('[data-testid="entry-date"]', '2024-01-15')
      
      await page.click('[data-testid="save-time-entry"]')
      await expect(page.getByText('Time entry saved')).toBeVisible()
      
      // Submit weekly timesheet
      await page.click('[data-testid="submit-timesheet"]')
      await expect(page.getByText('Timesheet submitted for approval')).toBeVisible()
    })
  })

  test.describe('Admin Workflows', () => {
    test('should handle dispute resolution', async ({ page }) => {
      // Navigate to admin panel
      await page.goto('/admin')
      await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
      
      // View disputes
      await page.click('[data-testid="disputes-tab"]')
      await expect(page.getByText('Open Disputes')).toBeVisible()
      
      // Handle dispute
      await page.click('[data-testid="dispute-card"]:first-child')
      await page.fill('[data-testid="resolution-notes"]', 'After reviewing evidence, partial refund of 50% is appropriate')
      await page.selectOption('[data-testid="resolution-action"]', 'partial_refund')
      await page.fill('[data-testid="refund-amount"]', '2500')
      
      await page.click('[data-testid="resolve-dispute"]')
      await expect(page.getByText('Dispute resolved successfully')).toBeVisible()
    })

    test('should verify company domains', async ({ page }) => {
      await page.goto('/admin/companies')
      
      // Find unverified company
      await page.click('[data-testid="company-card"]:has-text("Unverified")')
      
      // Verify domain
      await page.click('[data-testid="verify-domain"]')
      await expect(page.getByText('Domain verification initiated')).toBeVisible()
      
      // Approve verification
      await page.click('[data-testid="approve-verification"]')
      await expect(page.getByText('Company verified successfully')).toBeVisible()
    })
  })

  test.describe('Cross-Platform Compatibility', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Test mobile navigation
      await page.goto('/dashboard')
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]')
      await expect(page.getByTestId('mobile-nav')).toBeVisible()
      
      // Navigate via mobile menu
      await page.click('[data-testid="mobile-nav-browse"]')
      await expect(page).toHaveURL('/browse')
      
      // Test mobile form interactions
      await page.click('[data-testid="request-card"]:first-child')
      await page.click('[data-testid="submit-offer-button"]')
      
      // Mobile form should be responsive
      await expect(page.getByTestId('offer-form')).toBeVisible()
      await expect(page.getByTestId('proposed-rate')).toBeVisible()
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('should meet accessibility standards', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
      
      // Test ARIA labels
      const createButton = page.getByRole('button', { name: 'Create New Request' })
      await expect(createButton).toBeVisible()
      
      // Test screen reader compatibility
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()
    })

    test('should load pages within performance budgets', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Check for performance metrics
      const performanceEntries = await page.evaluate(() => {
        return JSON.stringify(performance.getEntriesByType('navigation'))
      })
      
      const entries = JSON.parse(performanceEntries)
      expect(entries.length).toBeGreaterThan(0)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())
      
      await page.goto('/dashboard')
      await page.click('[data-testid="create-request-button"]')
      
      // Should show error message
      await expect(page.getByText('Network error occurred')).toBeVisible()
      await expect(page.getByText('Please try again')).toBeVisible()
    })

    test('should handle form validation errors', async ({ page }) => {
      await page.goto('/requests/create')
      
      // Submit empty form
      await page.click('[data-testid="submit-request"]')
      
      // Should show validation errors
      await expect(page.getByText('Title is required')).toBeVisible()
      await expect(page.getByText('Description is required')).toBeVisible()
      await expect(page.getByText('Budget is required')).toBeVisible()
    })
  })
})
