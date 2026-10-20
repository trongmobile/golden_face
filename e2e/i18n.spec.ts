import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, fixture, hasFixtures } from './helpers'

const storage = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
    databases: (await indexedDB.databases?.())?.length ?? 0,
  }))

test.describe('languages', () => {
  test('starts in English and switches the whole page to Vietnamese, storing nothing', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')

    await page.getByRole('button', { name: 'Tiếng Việt' }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Khám phá hình học trên khuôn mặt bạn')
    await expect(page.getByRole('link', { name: 'Tải ảnh lên' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Chụp ảnh' }).first()).toBeVisible()
    await expect(page).toHaveTitle('GoldenFace — Phân tích tỷ lệ khuôn mặt')
    await expect(page.getByRole('group', { name: 'Ngôn ngữ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tiếng Việt' })).toHaveAttribute('aria-pressed', 'true')
    expect(await storage(page)).toEqual({ local: 0, session: 0, cookies: '', databases: 0 })
  })

  test('the chosen language follows you to the other pages', async ({ page, isMobile }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Tiếng Việt' }).click()
    if (isMobile) await page.getByRole('button', { name: 'Mở menu' }).click()
    await page.getByRole('link', { name: 'Quyền riêng tư' }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ảnh của bạn ở lại trên thiết bị của bạn')
    await expect(page).toHaveTitle('Chính sách quyền riêng tư — GoldenFace')
    await page.getByRole('link', { name: 'Điều khoản sử dụng' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Điều khoản sử dụng' })).toBeVisible()
  })

  test('a ?lang=vi link opens in Vietnamese and can be switched back', async ({ page }) => {
    await page.goto('/about?lang=vi')
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Một con số nổi tiếng')
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A famous number')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('the measurements table is translated too', async ({ page }) => {
    await page.goto('/about?lang=vi')
    const table = page.getByRole('table')
    await expect(table.getByRole('rowheader', { name: /Chiều rộng miệng ÷ chiều rộng mũi/ })).toBeVisible()
    await expect(table.getByText('Có').first()).toBeVisible()
    await expect(table).not.toContainText('Mouth width')
  })

  test('has no horizontal scrolling in Vietnamese, even on a 320 px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    for (const path of ['/?lang=vi', '/analysis?lang=vi', '/about?lang=vi', '/privacy?lang=vi']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    }
  })

  test('Vietnamese pages pass the accessibility audit', async ({ page }) => {
    for (const path of ['/?lang=vi', '/analysis?lang=vi', '/about?lang=vi', '/privacy?lang=vi']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), path).toEqual([])
    }
  })

  test.describe('with a Vietnamese browser', () => {
    test.use({ locale: 'vi-VN' })

    test('uses the browser language without being asked', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Khám phá hình học trên khuôn mặt bạn')
    })
  })

  test.describe('with an unsupported browser language', () => {
    test.use({ locale: 'fr-FR' })

    test('falls back to English', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')
    })
  })
})

test.describe('analysis in Vietnamese with the real model', () => {
  test.skip(!hasFixtures, 'The sample portrait could not be downloaded (offline?).')

  test('results, skipped-measurement reasons and quality notes follow the language switch live', async ({ page }) => {
    await page.goto('/analysis?lang=vi')
    await page.getByTestId('photo-input').setInputFiles(fixture('portrait.jpg'))
    await expect(page.getByRole('heading', { name: 'Kiểm tra ảnh của bạn' })).toBeVisible()
    await page.getByRole('button', { name: 'Phân tích ảnh này' }).click()
    await expect(page.getByRole('heading', { name: 'Tỷ lệ khuôn mặt của bạn' })).toBeVisible({ timeout: 90_000 })

    const upper = page.getByRole('article').filter({ hasText: 'Phần trên ÷ phần giữa' })
    await expect(upper.getByText('Không đo được')).toBeVisible()
    await expect(upper.getByText(/Không thể xác định đường chân tóc/)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Ba phần theo chiều dọc' })).toBeVisible()
    await expect(page.getByText('Chất lượng ảnh chụp')).toBeVisible()
    expect(await storage(page)).toEqual({ local: 0, session: 0, cookies: '', databases: 0 })

    // Switch while the results are on screen: nothing is re-analysed, everything re-translates.
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByRole('heading', { name: 'Your facial proportions' })).toBeVisible()
    const upperEn = page.getByRole('article').filter({ hasText: 'Upper third ÷ middle third' })
    await expect(upperEn.getByText(/hairline cannot be located reliably/i)).toBeVisible()
    await expect(page.getByText('Capture quality')).toBeVisible()
  })
})
