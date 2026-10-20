import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { analyze, fixture, hasFixtures, uploadPhoto } from './helpers'

async function expectNoSeriousViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(
    serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`),
    `${label}: serious accessibility violations`,
  ).toEqual([])
}

test.describe('accessibility (axe, WCAG 2.1 A/AA)', () => {
  for (const [name, path] of [
    ['home', '/'],
    ['analysis', '/analysis'],
    ['about', '/about'],
    ['privacy', '/privacy'],
    ['not found', '/nothing-here'],
  ] as const) {
    test(`${name} page`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoSeriousViolations(page, name)
    })
  }

  test('the camera dialog', async ({ page }) => {
    await page.goto('/analysis')
    await page.getByRole('button', { name: 'Open camera' }).click()
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await expectNoSeriousViolations(page, 'camera dialog')
  })

  test('the photo check step', async ({ page }) => {
    await uploadPhoto(page, {
      name: 'a.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })
    await expectNoSeriousViolations(page, 'edit step')
  })

  test('the error panel and the results page', async ({ page }) => {
    test.skip(!hasFixtures, 'The sample portrait could not be downloaded (offline?).')
    await uploadPhoto(page, fixture('noface.jpg'))
    await analyze(page)
    await expectNoSeriousViolations(page, 'error panel')

    await page.getByRole('button', { name: 'Choose another photo' }).click()
    await page.getByTestId('photo-input').setInputFiles(fixture('portrait.jpg'))
    await analyze(page)
    await expect(page.getByRole('heading', { name: 'Your facial proportions' })).toBeVisible()
    await expectNoSeriousViolations(page, 'results page')
  })
})

test.describe('keyboard', () => {
  test('the skip link is the first stop and moves focus to the main content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is a desktop interaction.')
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('a photo can be chosen with the keyboard alone', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is a desktop interaction.')
    await page.goto('/analysis?source=upload')
    const chooser = page.getByRole('button', { name: 'Choose a photo' })
    await expect(chooser).toBeFocused()
    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')])
    expect(fileChooser).toBeTruthy()
  })

  test('the dialog traps focus and returns it to the opener on Escape', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is a desktop interaction.')
    await page.goto('/analysis')
    const opener = page.getByRole('button', { name: 'Open camera' })
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible()
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(opener).toBeFocused()
  })

  test('every interactive element on the analysis page shows a visible focus ring', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is a desktop interaction.')
    await page.goto('/analysis')
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const s = getComputedStyle(el)
        return { width: s.outlineWidth, style: s.outlineStyle, tag: el.tagName }
      })
      expect(outline.style, `focused <${outline.tag}> has no outline`).not.toBe('none')
      expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
    }
  })
})
