import { expect, test } from '@playwright/test'

test.describe('SEO and static hosting', () => {
  test('the document has a title, description, Open Graph and Twitter metadata', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('GoldenFace — Facial Proportion Analyzer')
    const meta = (selector: string) => page.locator(`head meta[${selector}]`).getAttribute('content')
    const description = (await meta('name="description"'))!
    expect(description).toMatch(/facial proportions/i)
    expect(description).not.toMatch(/beauty (score|rating)|attractiveness score|measure.*beauty objectively/i)
    expect(description).toMatch(/not a measure of beauty/i)
    expect(await meta('property="og:title"')).toBe('GoldenFace — Facial Proportion Analyzer')
    expect(await meta('property="og:description"')).toBeTruthy()
    expect(await meta('property="og:type"')).toBe('website')
    expect(await meta('name="twitter:card"')).toBe('summary_large_image')
    expect(await page.locator('html').getAttribute('lang')).toBe('en')
    expect(await meta('name="viewport"')).toContain('width=device-width')
  })

  test('each route has its own pre-rendered shell with the right title (served with HTTP 200)', async ({ request }) => {
    for (const [path, title] of [
      ['/analysis/', 'Analyze a Photo — GoldenFace'],
      ['/about/', 'About the Golden Ratio — GoldenFace'],
      ['/privacy/', 'Privacy Policy — GoldenFace'],
    ] as const) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
      expect(await response.text()).toContain(`<title>${title}</title>`)
    }
  })

  test('404.html exists as the single-page-app fallback and robots.txt allows crawling', async ({ request }) => {
    const fallback = await request.get('/404.html')
    expect(fallback.status()).toBe(200)
    expect(await fallback.text()).toContain('<div id="root">')
    const robots = await request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect(await robots.text()).toMatch(/User-agent: \*\s+Allow: \//)
  })

  test('uses semantic landmarks and exactly one h1 per page', async ({ page }) => {
    for (const path of ['/', '/analysis', '/about', '/privacy']) {
      await page.goto(path)
      await expect(page.getByRole('banner')).toHaveCount(1)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    }
  })

  test('only the home page entry is loaded for the home page (route and model code are lazy)', async ({ page }) => {
    const scripts: string[] = []
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname)
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // The app entry plus the shared chunks it needs (translations, preload helper) — never a route or the model.
    expect(scripts.length).toBeLessThanOrEqual(4)
    expect(scripts.some((s) => /Analysis|vision_bundle/.test(s))).toBe(false)
  })
})
