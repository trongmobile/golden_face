import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, fixture, hasFixtures } from './helpers'

const storage = (page: Page) =>
  page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
    databases: (await indexedDB.databases?.())?.length ?? 0,
  }))

const ROUTES = ['/', '/analysis', '/about', '/privacy'] as const
const vi = (route: string) => (route === '/' ? '/vi' : `/vi${route}`)

test.describe('languages have their own addresses', () => {
  test('English lives at /, Vietnamese at /vi, and the switch moves between them', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')

    await page.getByRole('button', { name: /Tiếng Việt/ }).click()
    await expect(page).toHaveURL(/\/vi\/?$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Khám phá hình học trên khuôn mặt bạn')
    await expect(page.getByRole('link', { name: 'Tải ảnh lên' }).first()).toBeVisible()
    await expect(page).toHaveTitle('GoldenFace — Phân tích tỷ lệ khuôn mặt')
    await expect(page.getByRole('button', { name: /Tiếng Việt/ })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: /English/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')
    expect(await storage(page)).toEqual({ local: 0, session: 0, cookies: '', databases: 0 })
  })

  test('every link keeps you in your language', async ({ page, isMobile }) => {
    await page.goto('/vi')
    await page.getByRole('link', { name: 'Tải ảnh lên' }).first().click()
    await expect(page).toHaveURL(/\/vi\/analysis\?source=upload/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Phân tích ảnh')

    if (isMobile) await page.getByRole('button', { name: 'Mở menu' }).click()
    await page.getByRole('link', { name: 'Quyền riêng tư' }).first().click()
    await expect(page).toHaveURL(/\/vi\/privacy$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ảnh của bạn ở lại trên thiết bị của bạn')
    await expect(page).toHaveTitle('Chính sách quyền riêng tư — GoldenFace')

    await page.getByRole('link', { name: 'Điều khoản sử dụng' }).click()
    await expect(page).toHaveURL(/\/vi\/privacy#terms$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Điều khoản sử dụng' })).toBeVisible()
  })

  test('/vi/about opens in Vietnamese, can be switched back, and stays where you were reading', async ({ page }) => {
    await page.goto('/vi/about')
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Một con số nổi tiếng')

    await page.evaluate(() => window.scrollTo(0, 700))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
    await page.getByRole('button', { name: /English/ }).click()
    await expect(page).toHaveURL(/\/about$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A famous number')
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
  })

  test('the measurements table is translated too', async ({ page }) => {
    await page.goto('/vi/about')
    const table = page.getByRole('table')
    await expect(table.getByRole('rowheader', { name: /Chiều rộng miệng ÷ chiều rộng mũi/ })).toBeVisible()
    await expect(table.getByText('Có').first()).toBeVisible()
    await expect(table).not.toContainText('Mouth width')
  })

  test('has no horizontal scrolling in Vietnamese, even on a 320 px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    for (const route of ROUTES) {
      await page.goto(vi(route))
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    }
  })

  test('Vietnamese pages pass the accessibility audit', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(vi(route))
      await page.waitForLoadState('networkidle')
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), route).toEqual([])
    }
  })
})

test.describe('pages arrive with their content already in place', () => {
  const PAGES: [path: string, lang: string, title: string, h1: string][] = [
    ['/', 'en', 'GoldenFace — Facial Proportion Analyzer', 'Discover the Geometry of Your Face'],
    ['/vi/', 'vi', 'GoldenFace — Phân tích tỷ lệ khuôn mặt', 'Khám phá hình học trên khuôn mặt bạn'],
    ['/about/', 'en', 'About the Golden Ratio — GoldenFace', 'A famous number, and an honest look at its limits'],
    ['/vi/about/', 'vi', 'Về tỷ lệ vàng — GoldenFace', 'Một con số nổi tiếng, và cái nhìn trung thực về giới hạn của nó'],
    ['/analysis/', 'en', 'Analyze a Photo — GoldenFace', 'Analyze a photo'],
    ['/vi/analysis/', 'vi', 'Phân tích ảnh — GoldenFace', 'Phân tích ảnh'],
    ['/privacy/', 'en', 'Privacy Policy — GoldenFace', 'Your photo stays on your device'],
    ['/vi/privacy/', 'vi', 'Chính sách quyền riêng tư — GoldenFace', 'Ảnh của bạn ở lại trên thiết bị của bạn'],
  ]

  test('the HTML a search engine downloads already has the language, title, heading and text', async ({ request }) => {
    for (const [path, lang, title, h1] of PAGES) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
      const html = await response.text()
      expect(html, path).toContain(`<html lang="${lang}"`)
      expect(html).toContain(`<title>${title}</title>`)
      expect(html).toMatch(new RegExp(`<h1[^>]*>${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`))
      // The real page, not a loading placeholder with a hidden copy of the content.
      expect(html).not.toMatch(/Loading page|Đang tải trang|id="S:\d/)
      expect(html.length).toBeGreaterThan(15_000)
    }
  })

  test('each language page has its own description', async ({ request }) => {
    const description = async (path: string) =>
      (await (await request.get(path)).text()).match(/name="description"\s+content="([^"]*)"/)?.[1]
    const all = await Promise.all(PAGES.map(([path]) => description(path)))
    expect(all.every(Boolean)).toBe(true)
    expect(new Set(all).size).toBe(PAGES.length)
  })

  test.describe('with JavaScript switched off', () => {
    test.use({ javaScriptEnabled: false })

    test('the page can still be read, in the right language', async ({ page }) => {
      await page.goto('/vi/')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Khám phá hình học trên khuôn mặt bạn')
      await expect(page.getByRole('heading', { name: 'Từ ảnh đến tỷ lệ chỉ trong ba bước' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Tải ảnh lên' }).first()).toHaveAttribute('href', '/vi/analysis?source=upload')
      await page.goto('/about/')
      await expect(page.getByRole('heading', { level: 2, name: 'What is the golden ratio?' })).toBeVisible()
    })
  })

  test('the app takes over every page without hydration errors or console errors', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
    for (const [path] of PAGES) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    }
    expect(problems).toEqual([])
  })

  test('hydrated pages are interactive: the language switch works on a freshly loaded page', async ({ page }) => {
    await page.goto('/vi/privacy/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /English/ }).click()
    await expect(page).toHaveURL(/\/privacy\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your photo stays on your device')
  })
})

test.describe('visitors whose browser prefers Vietnamese', () => {
  test.use({ locale: 'vi-VN' })

  test('are offered the Vietnamese page, not sent there', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A famous number')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const offer = page.getByRole('link', { name: 'Xem bằng tiếng Việt' })
    await expect(offer).toHaveAttribute('href', /\/vi\/about$/)

    await offer.click()
    await expect(page).toHaveURL(/\/vi\/about$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Một con số nổi tiếng')
    await expect(page.getByRole('link', { name: 'Xem bằng tiếng Việt' })).toHaveCount(0)
  })

  test('can dismiss the offer and keep reading English', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Đóng', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Xem bằng tiếng Việt' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')
  })
})

test.describe('visitors whose browser prefers another language', () => {
  test.use({ locale: 'fr-FR' })

  test('see English and no offer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')
    await expect(page.getByRole('link', { name: 'Xem bằng tiếng Việt' })).toHaveCount(0)
  })
})

test.describe('analysis in Vietnamese with the real model', () => {
  test.skip(!hasFixtures, 'The sample portrait could not be downloaded (offline?).')

  test('results, skipped-measurement reasons and quality notes follow the language switch live', async ({ page }) => {
    await page.goto('/vi/analysis')
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

    // Switch while the results are on screen: the address changes, nothing is re-analysed.
    await page.getByRole('button', { name: /English/ }).click()
    await expect(page).toHaveURL(/\/analysis$/)
    await expect(page.getByRole('heading', { name: 'Your facial proportions' })).toBeVisible()
    const upperEn = page.getByRole('article').filter({ hasText: 'Upper third ÷ middle third' })
    await expect(upperEn.getByText(/hairline cannot be located reliably/i)).toBeVisible()
    await expect(page.getByText('Capture quality')).toBeVisible()
  })
})
