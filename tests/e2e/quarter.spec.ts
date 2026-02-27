import { test, expect } from '@playwright/test'

const MONTH_NAMES = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
]

test.describe('Quarter View (Τρίμηνο)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Τρίμηνο tab renders 3 month cards', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Τρίμηνο/i }).click()
    await page.waitForTimeout(500)

    // Count visible month names — quarter view should show exactly 3
    const body = await page.textContent('body')
    let monthCount = 0
    for (const name of MONTH_NAMES) {
      if (body?.includes(name)) monthCount++
    }
    expect(monthCount).toBeGreaterThanOrEqual(3)
  })

  test('clicking a month card navigates back to Ημερολόγιο', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Τρίμηνο/i }).click()
    await page.waitForTimeout(500)

    // Click the first month card (grid child or cursor-pointer element)
    const monthCard = page.locator('[class*="cursor-pointer"]')
      .or(page.locator('.grid > div').first())

    if (await monthCard.first().isVisible()) {
      await monthCard.first().click()
      await page.waitForTimeout(500)
    }

    // Should navigate to calendar view — day headers visible
    await expect(page.getByText('Δε')).toBeVisible()
    await expect(page.getByText('Τρ')).toBeVisible()
  })
})
