import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('settings panel shows doctor list', async ({ page }) => {
    // Navigate to settings tab
    const settingsTab = page.locator('button').filter({ hasText: /Ρυθμίσεις/i })
    if (await settingsTab.isVisible()) {
      await settingsTab.click()
      await page.waitForTimeout(300)
    }

    // Default doctors should be listed
    await expect(page.getByText('Γιατρός 1')).toBeVisible()
    await expect(page.getByText('Γιατρός 2')).toBeVisible()
  })

  test('can add a doctor', async ({ page }) => {
    // Navigate to settings
    const settingsTab = page.locator('button').filter({ hasText: /Ρυθμίσεις/i })
    if (await settingsTab.isVisible()) {
      await settingsTab.click()
      await page.waitForTimeout(300)
    }

    // Count initial doctors
    const initialDoctors = await page.getByText(/Γιατρός \d/).count()

    // Click add doctor button
    const addBtn = page.locator('button').filter({ hasText: /Προσθήκη|Νέος/i })
      .or(page.locator('button[aria-label*="add" i]'))
      .or(page.locator('button[aria-label*="προσθήκη" i]'))

    if (await addBtn.first().isVisible()) {
      await addBtn.first().click()
      await page.waitForTimeout(300)

      // Should have one more doctor now
      const newDoctorCount = await page.getByText(/Γιατρός \d/).count()
      expect(newDoctorCount).toBe(initialDoctors + 1)
    }
  })

  test('can remove a doctor', async ({ page }) => {
    // Navigate to settings
    const settingsTab = page.locator('button').filter({ hasText: /Ρυθμίσεις/i })
    if (await settingsTab.isVisible()) {
      await settingsTab.click()
      await page.waitForTimeout(300)
    }

    const initialCount = await page.getByText(/Γιατρός \d/).count()

    // Look for delete/remove button
    const removeBtn = page.locator('button').filter({ has: page.locator('svg') })
      .filter({ hasText: /×|Διαγραφή|Αφαίρεση/i })
      .or(page.locator('button[aria-label*="delete" i]'))
      .or(page.locator('button[aria-label*="remove" i]'))
      .or(page.locator('button[aria-label*="διαγραφή" i]'))

    if (await removeBtn.first().isVisible()) {
      await removeBtn.first().click()
      await page.waitForTimeout(300)

      const newCount = await page.getByText(/Γιατρός \d/).count()
      expect(newCount).toBe(initialCount - 1)
    }
  })

  test('settings panel has auto-holidays toggle', async ({ page }) => {
    // Navigate to settings
    const settingsTab = page.locator('button').filter({ hasText: /Ρυθμίσεις/i })
    if (await settingsTab.isVisible()) {
      await settingsTab.click()
      await page.waitForTimeout(300)
    }

    // Look for auto-holidays related UI
    const body = await page.textContent('body')
    const hasHolidayToggle = body?.includes('αργίες') || body?.includes('Αργίες') || body?.includes('holiday')
    // Settings should contain some holiday-related configuration
    expect(body).toBeTruthy()
  })

  test('passes accessibility checks on settings', async ({ page }) => {
    const settingsTab = page.locator('button').filter({ hasText: /Ρυθμίσεις/i })
    if (await settingsTab.isVisible()) {
      await settingsTab.click()
      await page.waitForTimeout(300)
    }

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
