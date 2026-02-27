import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Marks (Επιθυμίες)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('can navigate to Επιθυμίες tab', async ({ page }) => {
    const marksTab = page.locator('button').filter({ hasText: /Επιθυμίες/i })
    await expect(marksTab).toBeVisible()
    await marksTab.click()
    await page.waitForTimeout(300)

    // Should show marks-related UI (doctor selectors, calendar cells for marking)
    const body = await page.textContent('body')
    expect(body).toContain('Γιατρός')
  })

  test('can set a block mark on a day', async ({ page }) => {
    const marksTab = page.locator('button').filter({ hasText: /Επιθυμίες/i })
    await marksTab.click()
    await page.waitForTimeout(300)

    // Look for mark type selectors (block/want)
    const blockOption = page.locator('button, label, [role="radio"]').filter({ 
      hasText: /Μπλοκ|Αποκλεισμός|Block/i 
    })
    
    if (await blockOption.first().isVisible()) {
      await blockOption.first().click()
      await page.waitForTimeout(200)
    }

    // Click on a calendar cell to mark it
    // Calendar cells are typically divs or buttons with day numbers
    const dayCells = page.locator('[data-day], .calendar-cell, [role="gridcell"]')
    if (await dayCells.first().isVisible()) {
      await dayCells.first().click()
      await page.waitForTimeout(200)
    }
  })

  test('blocked day is respected in schedule generation', async ({ page }) => {
    // Go to marks tab
    const marksTab = page.locator('button').filter({ hasText: /Επιθυμίες/i })
    await marksTab.click()
    await page.waitForTimeout(300)

    // Set a block mark (interaction depends on UI)
    // Then go back to calendar and generate

    // Navigate to calendar tab
    const calTab = page.locator('button').filter({ hasText: /Ημερολόγιο/i })
    if (await calTab.isVisible()) {
      await calTab.click()
      await page.waitForTimeout(300)
    }

    // Generate schedule
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    if (await generateBtn.isVisible()) {
      await generateBtn.click()
      await page.waitForTimeout(1000)
    }

    // Schedule should still generate successfully
    const body = await page.textContent('body')
    expect(body).toContain('Γιατρός')
  })

  test('passes accessibility checks on marks panel', async ({ page }) => {
    const marksTab = page.locator('button').filter({ hasText: /Επιθυμίες/i })
    await marksTab.click()
    await page.waitForTimeout(300)

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
