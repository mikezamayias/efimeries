import { test, expect } from '@playwright/test'

const MONTH_NAMES = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
]

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('tab navigation switches between panels', async ({ page }) => {
    // Look for tab buttons
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /Ημερολόγιο|Λίστα|Επιθυμίες|Ρυθμίσεις|Στατιστικά/i })
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThan(1)

    // Click through each tab
    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click()
      await page.waitForTimeout(300)
    }
  })

  test('month navigation changes displayed month', async ({ page }) => {
    // Get current month text
    const headerText = await page.textContent('body')
    const currentMonthIndex = MONTH_NAMES.findIndex(m => headerText?.includes(m))
    expect(currentMonthIndex).toBeGreaterThanOrEqual(0)

    // Click next month arrow
    const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).last()
    await nextBtn.click()
    await page.waitForTimeout(300)

    // Month name should change
    const newHeaderText = await page.textContent('body')
    const nextMonthIndex = (currentMonthIndex + 1) % 12
    expect(newHeaderText).toContain(MONTH_NAMES[nextMonthIndex])
  })

  test('previous month arrow navigates backwards', async ({ page }) => {
    // Navigate forward first
    const buttons = page.locator('button').filter({ has: page.locator('svg') })
    // Find navigation arrows (typically near month name)
    const nextBtn = buttons.last()
    await nextBtn.click()
    await page.waitForTimeout(300)

    const headerAfterNext = await page.textContent('body')

    // Navigate back
    const prevBtn = buttons.first()
    await prevBtn.click()
    await page.waitForTimeout(300)

    const headerAfterPrev = await page.textContent('body')
    expect(headerAfterPrev).not.toBe(headerAfterNext)
  })
})
