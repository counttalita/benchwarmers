import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/auth/signin')
  
  // Fill in login form
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'testpassword')
  await page.click('[data-testid="signin-button"]')
  
  // Wait until the page receives the cookies
  await page.waitForURL('/dashboard')
  
  // Alternatively, you can wait until the page reaches a state where all cookies are set
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  
  // End of authentication steps
  await page.context().storageState({ path: authFile })
})
