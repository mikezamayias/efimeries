import { test, expect } from '@playwright/test'

test.describe('Print Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Εκτύπωση button exists after generating schedule', async ({ page }) => {
    // Generate schedule first
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    await generateBtn.click()
    await page.waitForTimeout(1000)

    // Open export panel if needed
    const exportToggle = page.locator('button').filter({ hasText: /Εξαγωγή|Export/i })
    if (await exportToggle.isVisible()) {
      await exportToggle.click()
      await page.waitForTimeout(300)
    }

    // Verify print button exists
    const printBtn = page.locator('button').filter({ hasText: /Εκτύπωση/i })
    await expect(printBtn.first()).toBeVisible()
  })
})
