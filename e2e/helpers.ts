import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { FIXTURES } from './fixtures'

export const fixture = (name: string) => join(FIXTURES, name)
export const hasFixtures = existsSync(fixture('portrait.jpg')) && existsSync(fixture('face.y4m'))

/** Collects every network request made by the page, so tests can assert on privacy. */
export function trackRequests(page: Page) {
  const requests: { url: string; method: string; hasBody: boolean }[] = []
  page.on('request', (request) => {
    requests.push({ url: request.url(), method: request.method(), hasBody: request.postData() !== null })
  })
  return requests
}

export const isExternal = (url: string) => !/^(http:\/\/localhost|data:|blob:|about:)/.test(url)

/** Fails when the page can be scrolled sideways. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(scroll, `page is ${scroll}px wide in a ${client}px viewport`).toBeLessThanOrEqual(client)
}

/** Uploads a photo on the Analysis page and waits for the edit step. */
export async function uploadPhoto(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto('/analysis')
  await page.getByTestId('photo-input').setInputFiles(file)
  await expect(page.getByRole('heading', { name: 'Check your photo' })).toBeVisible()
}

/** Runs the analysis and waits for either the results heading or the error panel. */
export async function analyze(page: Page) {
  await page.getByRole('button', { name: 'Analyze this photo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your facial proportions' }).or(page.getByRole('alert').first()),
  ).toBeVisible({ timeout: 90_000 })
}
