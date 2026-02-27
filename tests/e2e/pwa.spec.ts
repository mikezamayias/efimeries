import { test, expect } from '@playwright/test'

test.describe('PWA Essentials', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('page has <link rel="manifest">', async ({ page }) => {
    const manifest = page.locator('link[rel="manifest"]')
    await expect(manifest).toHaveCount(1)
  })

  test('page has <meta name="theme-color">', async ({ page }) => {
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveCount(1)

    const content = await themeColor.getAttribute('content')
    expect(content).toBeTruthy()
  })

  test('service worker JS exists at /sw.js', async ({ page }) => {
    const response = await page.request.get('/sw.js')
    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType).toContain('javascript')
  })
})
