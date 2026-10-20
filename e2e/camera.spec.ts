import { expect, test, type Page } from '@playwright/test'
import { analyze, hasFixtures } from './helpers'

/** Records every stream handed out by getUserMedia so tests can verify that tracks are really stopped. */
async function recordStreams(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __streams: MediaStream[]; __requests: unknown[] }
    w.__streams = []
    w.__requests = []
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      w.__requests.push(constraints)
      const stream = await original(constraints)
      w.__streams.push(stream)
      return stream
    }
  })
}

const trackStates = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks().map((t) => t.readyState)),
  )

test.describe('camera capture', () => {
  test('shows a live preview, captures, and switches the camera off immediately', async ({ page }) => {
    await recordStreams(page)
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    const dialog = page.getByRole('dialog', { name: 'Take a photo' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Take photo' })).toBeVisible()

    const video = dialog.getByLabel('Live camera preview')
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0)
    expect(await trackStates(page)).toEqual(['live'])

    await dialog.getByRole('button', { name: 'Take photo' }).click()
    await expect(dialog.getByRole('img', { name: 'The photo you just took' })).toBeVisible()
    // Camera light off: every track ended as soon as the picture was taken.
    expect(await trackStates(page)).toEqual(['ended'])

    await dialog.getByRole('button', { name: 'Retake' }).click()
    await expect(dialog.getByRole('button', { name: 'Take photo' })).toBeVisible()
    expect(await trackStates(page)).toEqual(['ended', 'live'])
    await dialog.getByRole('button', { name: 'Take photo' }).click()
    await dialog.getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Check your photo' })).toBeVisible()
    await expect(page.getByText('Camera photo')).toBeVisible()
    expect(new Set(await trackStates(page))).toEqual(new Set(['ended']))
  })

  test('closing the dialog (button, Escape, Cancel) releases the camera each time', async ({ page }) => {
    await recordStreams(page)
    await page.goto('/analysis')
    for (const how of ['button', 'escape', 'cancel'] as const) {
      await page.getByRole('button', { name: 'Open camera' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: 'Take photo' })).toBeVisible()
      if (how === 'button') await dialog.getByRole('button', { name: 'Close dialog' }).click()
      if (how === 'escape') await page.keyboard.press('Escape')
      if (how === 'cancel') await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(new Set(await trackStates(page))).toEqual(new Set(['ended']))
    }
    expect(await trackStates(page)).toHaveLength(3)
  })

  test('leaving the page while the camera is on releases it', async ({ page }) => {
    await recordStreams(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Analyze a photo' }).first().click()
    await page.getByRole('button', { name: 'Open camera' }).click()
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover the Geometry of Your Face')
    expect(new Set(await trackStates(page))).toEqual(new Set(['ended']))
  })

  test('a denied permission explains what to do and offers upload instead', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    })
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('alert')).toContainText('Camera permission was blocked')
    await expect(dialog.getByRole('alert')).toContainText('browser settings')
    await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Upload a photo instead' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Choose a photo' })).toBeVisible()
  })

  test('no camera on the device is reported', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Requested device not found', 'NotFoundError'))
    })
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No camera found')
  })

  test('a browser without camera support is told so up front', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    })
    await page.goto('/analysis')
    await expect(page.getByText('Camera is not supported here')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open camera' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Choose a photo' })).toBeVisible()
  })

  test('the dialog fills the screen on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone layout only.')
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    const box = (await page.getByRole('dialog').boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1)
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1)
  })

  test('requests the front camera, video only', async ({ page }) => {
    await recordStreams(page)
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
    const requests = await page.evaluate(() => (window as unknown as { __requests: MediaStreamConstraints[] }).__requests)
    expect(requests[0]!.audio).toBe(false)
    expect(requests[0]!.video).toMatchObject({ facingMode: { ideal: 'user' } })
  })
})

test.describe('camera → analysis with the real model', () => {
  test.skip(!hasFixtures, 'The sample portrait could not be downloaded (offline?).')

  test('a photo taken with the (fake) camera is analysed end to end', async ({ page }) => {
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    await page.getByRole('button', { name: 'Take photo' }).click()
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByRole('heading', { name: 'Check your photo' })).toBeVisible()
    await analyze(page)
    await expect(page.getByRole('heading', { name: 'Your facial proportions' })).toBeVisible()
    await expect(page.getByRole('article').filter({ hasText: 'Mouth width ÷ nose width' })).toBeVisible()
  })

  test('"Take a Photo" from the home page needs one extra click before the camera starts', async ({ page }) => {
    await recordStreams(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Take a Photo' }).first().click()
    await page.getByRole('button', { name: 'Start camera' }).click()
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
    expect(await trackStates(page)).toEqual(['live'])
    await page.keyboard.press('Escape')
    expect(await trackStates(page)).toEqual(['ended'])
  })
})
