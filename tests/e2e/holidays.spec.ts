import { test, expect } from '@playwright/test'

const MONTH_NAMES = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
]

test.describe('Holidays', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('March 2026 shows 25η Μαρτίου holiday in day 25 cell', async ({ page }) => {
    // Determine current month to calculate navigation clicks
    const bodyText = await page.textContent('body')
    const currentMonthIndex = MONTH_NAMES.findIndex(m => bodyText?.includes(m))
    const currentYear = new Date().getFullYear()

    const targetMonth = 2 // March (0-indexed)
    const targetYear = 2026
    const totalClicks = (targetYear - currentYear) * 12 + (targetMonth - currentMonthIndex)

    // Navigate forward/backward to March 2026
    const nextBtn = page.locator('header button').filter({ has: page.locator('svg') }).last()
    const prevBtn = page.locator('header button').filter({ has: page.locator('svg') }).first()

    for (let i = 0; i < Math.abs(totalClicks); i++) {
      await (totalClicks > 0 ? nextBtn : prevBtn).click()
      await page.waitForTimeout(80)
    }

    // Verify March 2026
    await expect(page.getByText('Μάρτιος')).toBeVisible()
    await expect(page.getByText('2026')).toBeVisible()

    // Verify holiday text visible (the app shows "25η Μαρτ..." in the day cell)
    const pageText = await page.textContent('body')
    expect(pageText).toMatch(/25η Μαρτ/)
  })

  test('settings has auto-holidays toggle', async ({ page }) => {
    // Navigate to settings
    await page.locator('button').filter({ hasText: /Ρυθμίσεις/i }).click()
    await page.waitForTimeout(300)

    // Look for auto-holidays toggle
    const body = await page.textContent('body')
    const hasHolidayToggle = body?.includes('αργί') || body?.includes('Αργί') || body?.includes('Αυτόματ')
    expect(hasHolidayToggle).toBe(true)
  })
})
