import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, isExternal, trackRequests } from './helpers'

test.describe('home page', () => {
  test('shows the headline, description and both calls to action', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('GoldenFace — Golden Ratio Face Analyzer')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')
    await expect(page.getByText('Explore facial proportions through the mathematics of the golden ratio.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Upload Photo' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Take a Photo' }).first()).toBeVisible()
    await expect(page.getByRole('img', { name: /Illustration of a face outline/ })).toBeVisible()
  })

  test('does not download the face model or the MediaPipe engine until an analysis starts', async ({ page }) => {
    const requests = trackRequests(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const urls = requests.map((r) => r.url)
    expect(urls.filter((u) => /\.task|\.wasm|vision_bundle|mediapipe|Analysis-/.test(u))).toEqual([])
    expect(urls.filter(isExternal)).toEqual([])
  })

  test('"Upload Photo" opens the analysis page ready to choose a file', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Upload Photo' }).first().click()
    await expect(page).toHaveURL(/\/analysis\?source=upload/)
    await expect(page.getByRole('heading', { name: 'Analyze a photo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose a photo' })).toBeFocused()
  })

  test('"Take a Photo" opens the camera dialog without asking for permission yet', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __gum: number }).__gum = 0
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = (c) => {
        ;(window as unknown as { __gum: number }).__gum++
        return original(c)
      }
    })
    await page.goto('/')
    await page.getByRole('link', { name: 'Take a Photo' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Take a photo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __gum: number }).__gum)).toBe(0)
  })

  test('navigation reaches every page and keeps the title in sync', async ({ page, isMobile }) => {
    await page.goto('/')
    for (const [name, title, url] of [
      ['Analysis', 'Analyze a Photo — GoldenFace', '/analysis'],
      ['About Golden Ratio', 'About the Golden Ratio — GoldenFace', '/about'],
      ['Privacy', 'Privacy Policy — GoldenFace', '/privacy'],
      ['Home', 'GoldenFace — Golden Ratio Face Analyzer', '/'],
    ] as const) {
      if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
      await page.getByRole('navigation', { name: isMobile ? 'Mobile' : 'Primary' }).getByRole('link', { name }).click()
      await expect(page).toHaveTitle(title)
      expect(new URL(page.url()).pathname).toBe(url)
    }
  })

  test('the footer links to the privacy policy and terms', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByText(/never stored/i)).toBeVisible()
    await footer.getByRole('link', { name: 'Terms of use' }).click()
    await expect(page).toHaveURL(/\/privacy#terms/)
    await expect(page.getByRole('heading', { name: 'Terms of use' })).toBeInViewport()
  })

  test('unknown URLs show the 404 page', async ({ page }) => {
    await page.goto('/definitely-not-a-page')
    await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible()
  })
})

test.describe('responsive layout', () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    for (const path of ['/', '/analysis', '/about', '/privacy']) {
      test(`${path} has no horizontal scrolling at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await expectNoHorizontalOverflow(page)
      })
    }
  }

  test('the desktop navigation collapses into a menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden()
  })
})
