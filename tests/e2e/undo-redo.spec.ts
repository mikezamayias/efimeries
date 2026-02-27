import { test, expect } from '@playwright/test'

test.describe('Undo / Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('undo after generate shows Αναίρεση toast', async ({ page }) => {
    // Generate schedule
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    await generateBtn.click()
    await page.waitForTimeout(1000)

    // Click undo
    const undoBtn = page.locator('button[title*="Αναίρεση"]')
      .or(page.locator('button[aria-label*="Αναίρεση"]'))
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-undo-2, svg.lucide-undo') }).first())

    await undoBtn.first().click()
    await page.waitForTimeout(500)

    // Toast with "Αναίρεση" should appear
    const body = await page.textContent('body')
    expect(body).toContain('Αναίρεση')
  })

  test('redo after undo shows Επανάληψη toast', async ({ page }) => {
    // Generate schedule
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    await generateBtn.click()
    await page.waitForTimeout(1000)

    // Undo
    const undoBtn = page.locator('button[title*="Αναίρεση"]')
      .or(page.locator('button[aria-label*="Αναίρεση"]'))
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-undo-2, svg.lucide-undo') }).first())
    await undoBtn.first().click()
    await page.waitForTimeout(500)

    // Redo
    const redoBtn = page.locator('button[title*="Επαναφορά"]')
      .or(page.locator('button[title*="Επανάληψη"]'))
      .or(page.locator('button[aria-label*="Redo"]'))
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-redo-2, svg.lucide-redo') }).first())
    await redoBtn.first().click()
    await page.waitForTimeout(500)

    // Toast with "Επανάληψη" should appear
    const body = await page.textContent('body')
    expect(body).toContain('Επανάληψη')
  })
})
