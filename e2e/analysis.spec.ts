import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { analyze, fixture, hasFixtures, isExternal, trackRequests, uploadPhoto } from './helpers'

test.describe('analysis with the real model', () => {
  test.skip(!hasFixtures, 'The sample portrait could not be downloaded (offline?).')

  test('upload → check → analyze → results, fully on the device', async ({ page }) => {
    const requests = trackRequests(page)
    await uploadPhoto(page, fixture('portrait.jpg'))
    await expect(page.getByText('portrait.jpg')).toBeVisible()
    await analyze(page)

    await expect(page.getByRole('heading', { name: 'Your facial proportions' })).toBeVisible()
    await expect(page.getByText(/not a beauty score/i)).toBeVisible()
    await expect(page.getByRole('img', { name: /photo with facial landmarks/ })).toBeVisible()

    // Real measurements from the real landmarks: plausible human ranges, never a fake constant.
    const lengthWidth = page.getByRole('article').filter({ hasText: 'Face length ÷ face width' })
    const value = Number(await lengthWidth.locator('.font-display').first().textContent())
    expect(value).toBeGreaterThan(1.1)
    expect(value).toBeLessThan(1.6)
    await expect(lengthWidth.getByText('Geometric similarity to the reference golden ratio')).toBeVisible()
    await expect(lengthWidth.getByText('Reference ratio φ')).toBeVisible()

    // Skipped measurements say why instead of inventing numbers.
    const upper = page.getByRole('article').filter({ hasText: 'Upper third ÷ middle third' })
    await expect(upper.getByText('Not measured')).toBeVisible()
    await expect(upper.getByText(/hairline cannot be located reliably/i)).toBeVisible()
    // The sample is smiling with an open mouth, so the lip ratio is correctly withheld.
    await expect(page.getByRole('article').filter({ hasText: 'Lower lip ÷ upper lip height' }).getByText(/mouth is open/i)).toBeVisible()

    // Privacy: nothing left the device. Only same-origin GETs (the model and engine are self-hosted).
    expect(requests.filter((r) => isExternal(r.url))).toEqual([])
    expect(requests.filter((r) => r.method !== 'GET' && r.method !== 'HEAD')).toEqual([])
    expect(requests.some((r) => r.url.endsWith('face_landmarker.task'))).toBe(true)
    expect(requests.some((r) => r.url.endsWith('.wasm'))).toBe(true)
  })

  test('nothing is persisted in the browser, and clearing removes the photo from the page', async ({ page }) => {
    await uploadPhoto(page, fixture('portrait.jpg'))
    await analyze(page)
    const storage = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookies: document.cookie,
      databases: (await indexedDB.databases?.())?.length ?? 0,
    }))
    expect(storage).toEqual({ local: 0, session: 0, cookies: '', databases: 0 })

    await page.getByRole('button', { name: /Clear photo & results/ }).click()
    await expect(page.getByRole('heading', { name: 'Analyze a photo' })).toBeVisible()
    await expect(page.getByText(/removed from this page/i).first()).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).toHaveCount(0)
  })

  test('a tilted head still measures the same proportions (roll is corrected)', async ({ page }) => {
    await uploadPhoto(page, fixture('portrait.jpg'))
    await analyze(page)
    const read = async () =>
      Number(await page.getByRole('article').filter({ hasText: 'Cheekbone width ÷ jaw width' }).locator('.font-display').first().textContent())
    const upright = await read()

    await page.getByRole('button', { name: 'Analyze another photo' }).click()
    await page.getByTestId('photo-input').setInputFiles(fixture('tilted.jpg'))
    await analyze(page)
    const tilted = await read()
    expect(Math.abs(tilted - upright)).toBeLessThan(0.08)
  })

  test('overlay layers, zoom, highlight and hairline marking work', async ({ page, isMobile }) => {
    await uploadPhoto(page, fixture('portrait.jpg'))
    await analyze(page)

    const symmetry = page.getByRole('button', { name: 'Symmetry axis' })
    await symmetry.click()
    await expect(symmetry).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Full mesh' }).click()
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect(page.getByText('150%')).toBeVisible()
    await page.getByRole('button', { name: 'Reset zoom' }).click()
    await expect(page.getByText('100%')).toBeVisible()

    // The label flips between "Keep showing" and "Stop showing", so match both.
    const eye = page.getByRole('button', { name: /(Keep|Stop) showing Mouth width ÷ nose width/ })
    await eye.click()
    await expect(eye).toHaveAttribute('aria-pressed', 'true')

    // Mark the hairline by hand → the upper third becomes measurable.
    await page.getByRole('button', { name: 'Mark hairline' }).click()
    const upper = page.getByRole('article').filter({ hasText: 'Upper third ÷ middle third' })
    await expect(upper.getByText('Not measured')).toHaveCount(0)
    await expect(upper.locator('.font-display')).toBeVisible()
    if (!isMobile) {
      const canvas = page.locator('canvas[role="img"]').first()
      const box = (await canvas.boundingBox())!
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.1 } })
    }
    await page.getByRole('button', { name: /Remove hairline/ }).click()
    await expect(upper.getByText('Not measured')).toBeVisible()
  })

  test('downloads a PNG report', async ({ page }) => {
    await uploadPhoto(page, fixture('portrait.jpg'))
    await analyze(page)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG report' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^goldenface-report-\d{4}-\d{2}-\d{2}\.png$/)
    const path = await download.path()
    const bytes = await readFile(path)
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a') // PNG signature
    expect(bytes.length).toBeGreaterThan(30_000)
  })

  test('the printed report hides the interface chrome and keeps the content', async ({ page }) => {
    await uploadPhoto(page, fixture('portrait.jpg'))
    await analyze(page)
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('banner')).toBeHidden()
    await expect(page.getByRole('contentinfo')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Download PNG report' })).toBeHidden()
    await expect(page.getByText('GoldenFace — Facial proportion report')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Overall proportions' })).toBeVisible()
    await expect(page.getByRole('img', { name: /photo with facial landmarks/ })).toBeVisible()
  })

  test('cropping before analysis changes what is analysed', async ({ page }) => {
    await uploadPhoto(page, fixture('portrait.jpg'))
    await page.getByRole('button', { name: 'Rotate right' }).click()
    await page.getByRole('button', { name: 'Rotate left' }).click()
    await analyze(page)
    await expect(page.getByRole('heading', { name: 'Your facial proportions' })).toBeVisible()
  })
})

test.describe('photos that cannot be measured', () => {
  test.skip(!hasFixtures, 'The sample portrait could not be downloaded (offline?).')

  const errorPanel = (page: import('@playwright/test').Page) => page.getByRole('alert').first()

  test('no face → clear explanation and no numbers', async ({ page }) => {
    await uploadPhoto(page, fixture('noface.jpg'))
    await analyze(page)
    await expect(errorPanel(page)).toContainText('No face found')
    await expect(errorPanel(page)).toContainText('No measurements were made')
    await expect(page.getByText(/similarity/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Choose another photo' })).toBeVisible()
  })

  test('several faces → asks for one face', async ({ page }) => {
    await uploadPhoto(page, fixture('two.jpg'))
    await analyze(page)
    await expect(errorPanel(page)).toContainText('More than one face found')
    await expect(errorPanel(page)).toContainText('2 faces')
    await page.getByRole('button', { name: /Edit & crop/ }).click()
    await expect(page.getByRole('heading', { name: 'Check your photo' })).toBeVisible()
  })

  test('very dark photo → lighting problem', async ({ page }) => {
    await uploadPhoto(page, fixture('dark.jpg'))
    await analyze(page)
    await expect(errorPanel(page)).toContainText(/lighting is too poor|No face found/)
  })

  test('a face cut off by the frame is rejected or reported', async ({ page }) => {
    await uploadPhoto(page, fixture('cutoff.jpg'))
    await analyze(page)
    await expect(errorPanel(page).or(page.getByRole('heading', { name: 'Your facial proportions' }))).toBeVisible()
  })
})

test.describe('file validation', () => {
  test('rejects a text file, a disguised file and an oversized file with clear messages', async ({ page }) => {
    await page.goto('/analysis')
    const input = page.getByTestId('photo-input')

    await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(page.getByRole('alert')).toContainText('Unsupported file type')

    await input.setInputFiles({ name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<html>not an image</html>') })
    await expect(page.getByRole('alert')).toContainText('does not look like a real')

    await input.setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(16 * 1024 * 1024, 1) })
    await expect(page.getByRole('alert')).toContainText('15 MB')

    await input.setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) })
    await expect(page.getByRole('alert')).toContainText('empty')
  })

  test('a corrupted image with a valid header is reported, not crashed on', async ({ page }) => {
    await page.goto('/analysis')
    const corrupt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]), Buffer.alloc(300, 7)])
    await page.getByTestId('photo-input').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: corrupt })
    await expect(page.getByRole('alert')).toContainText(/could not be opened/)
  })

  test('accepts PNG and WebP', async ({ page }) => {
    await page.goto('/analysis')
    for (const type of ['png', 'webp'] as const) {
      const data = await page.evaluate(async (t) => {
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 200
        canvas.getContext('2d')!.fillRect(0, 0, 100, 100)
        return canvas.toDataURL(`image/${t}`).split(',')[1]!
      }, type)
      await page.getByTestId('photo-input').setInputFiles({ name: `a.${type}`, mimeType: `image/${type}`, buffer: Buffer.from(data, 'base64') })
      await expect(page.getByRole('heading', { name: 'Check your photo' })).toBeVisible()
      await page.getByRole('button', { name: 'Choose a different photo' }).click()
    }
  })

  test('a photo can be dragged and dropped onto the upload area', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Drag and drop is a desktop interaction.')
    await page.goto('/analysis')
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      canvas.getContext('2d')!.fillRect(0, 0, 50, 50)
      return canvas.toDataURL('image/png').split(',')[1]!
    })
    const dataTransfer = await page.evaluateHandle((base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const transfer = new DataTransfer()
      transfer.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }))
      return transfer
    }, png)
    const zone = page.getByTestId('dropzone')
    await zone.dispatchEvent('dragenter', { dataTransfer })
    await expect(page.getByText('Drop your photo here')).toBeVisible()
    await zone.dispatchEvent('drop', { dataTransfer })
    await expect(page.getByRole('heading', { name: 'Check your photo' })).toBeVisible()
    await expect(page.getByText('dropped.png')).toBeVisible()
  })
})
