// Renders promo/avatar.html (a fully synthetic illustrated portrait) to a JPEG.
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const out = process.argv[2] ?? join(here, 'assets', 'avatar.jpg')
await mkdir(dirname(out), { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } })
await page.goto(pathToFileURL(join(here, 'avatar.html')).href)
await page.waitForFunction(() => window.__done === true)
const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.93).split(',')[1])
await writeFile(out, Buffer.from(data, 'base64'))
await browser.close()
console.log('wrote', out)
