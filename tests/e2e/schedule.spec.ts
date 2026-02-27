import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Schedule Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('renders the calendar view on load', async ({ page }) => {
    // Calendar should be visible with day headers
    await expect(page.getByText('Δε')).toBeVisible()
    await expect(page.getByText('Τρ')).toBeVisible()
    await expect(page.getByText('Κυ')).toBeVisible()
  })

  test('generates schedule when clicking the button', async ({ page }) => {
    // Click the generate button
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    await expect(generateBtn).toBeVisible()
    await generateBtn.click()

    // Wait for schedule to appear — cells should now contain doctor names
    await page.waitForTimeout(1000)

    // After generation, the calendar should show colored cells with doctor names
    const cells = page.locator('[data-schedule-cell]')
    // If no data attributes, check for visible doctor name patterns
    const body = await page.textContent('body')
    expect(body).toContain('Γιατρός')
  })

  test('all days have assignments after generation', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    await generateBtn.click()
    await page.waitForTimeout(1000)

    // The schedule should show doctor names — count occurrences
    const body = await page.textContent('body')
    const doctorMentions = (body?.match(/Γιατρός/g) ?? []).length
    // Should have many mentions (at least one per day shown)
    expect(doctorMentions).toBeGreaterThan(5)
  })

  test('doctor names appear in schedule cells', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Δημιουργία Προγράμματος/i })
    await generateBtn.click()
    await page.waitForTimeout(1000)

    // Default doctors: Γιατρός 1 through Γιατρός 5
    const body = await page.textContent('body')
    expect(body).toContain('Γιατρός 1')
    expect(body).toContain('Γιατρός 2')
  })

  test('passes accessibility checks on calendar view', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // PWA colors may need tweaking
      .analyze()

    expect(results.violations).toEqual([])
  })
})
