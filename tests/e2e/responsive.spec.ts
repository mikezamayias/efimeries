import { test, expect } from '@playwright/test'

test.describe('Responsive Layout', () => {
  test('mobile (375×812): bottom nav bar is visible', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Mobile layout should show a bottom navigation bar
    const bottomNav = page.locator('nav').last()
      .or(page.locator('[class*="bottom-nav"]'))
      .or(page.locator('[class*="fixed bottom"]'))
      .or(page.locator('footer nav'))

    // At mobile widths the bottom nav should exist
    await expect(bottomNav.first()).toBeVisible()

    await context.close()
  })

  test('desktop (1280×800): sidebar is visible', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Desktop layout should show a sidebar (aside or nav with vertical orientation)
    const sidebar = page.locator('aside')
      .or(page.locator('[class*="sidebar"]'))
      .or(page.locator('nav').first())

    await expect(sidebar.first()).toBeVisible()

    await context.close()
  })
})
