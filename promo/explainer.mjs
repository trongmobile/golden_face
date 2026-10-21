// Motion-graphics cut: animated explainer on a light background, using real screenshots of the app.
//   npm run build && node promo/explainer.mjs [--photo face.jpg] [--out promo/out/goldenface-tiktok-explainer.mp4]
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { CUES, SITE_LABEL } from './script-explainer.mjs'
import { assemble, here, log, root, sleep, startPreview, startScreencast, startStaticServer, synthesize } from './lib.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const PHOTO = arg('photo', join(here, 'assets', 'avatar.jpg'))
const OUT = arg('out', join(here, 'out', 'goldenface-tiktok-explainer.mp4'))
const WORK = join(here, '.work')
const SHOTS = join(WORK, 'shots')
const APP = 'http://localhost:4180/vi/'
const GAP_MS = 300

if (!existsSync(PHOTO)) throw new Error(`Photo not found: ${PHOTO}`)
await rm(WORK, { recursive: true, force: true })
await mkdir(SHOTS, { recursive: true })

/** Real screenshots of the app for the cards. */
async function captureShots(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 3, locale: 'vi-VN' })
  const page = await ctx.newPage()
  await page.goto(new URL('analysis', APP).href)
  await page.getByText('Kéo và thả ảnh vào đây').locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]').screenshot({ path: join(SHOTS, 'upload.png') })
  await page.getByTestId('photo-input').setInputFiles(PHOTO)
  await page.getByRole('heading', { name: 'Kiểm tra ảnh của bạn' }).waitFor()
  await sleep(400)
  await page.locator('[data-handle="nw"]').locator('xpath=ancestor::div[contains(@class,"inline-block")][1]').screenshot({ path: join(SHOTS, 'edit.png') })
  await page.getByRole('button', { name: 'Phân tích ảnh này' }).click()
  await page.getByRole('heading', { name: 'Tỷ lệ khuôn mặt của bạn' }).waitFor({ timeout: 90_000 })
  await sleep(800)
  await page.locator('canvas[role="img"]').first().screenshot({ path: join(SHOTS, 'result.png') })
  await page.getByRole('article').first().screenshot({ path: join(SHOTS, 'card.png') })
  await ctx.close()
}

const preview = await startPreview(APP, 4180)
const server = await startStaticServer(
  4181,
  { '/': join(here, 'stage', 'explainer.html'), '/favicon.svg': join(root, 'public', 'favicon.svg'), '/avatar.jpg': PHOTO },
  [
    ['/fonts/inter/', join(root, 'node_modules', '@fontsource-variable', 'inter')],
    ['/fonts/fraunces/', join(root, 'node_modules', '@fontsource-variable', 'fraunces')],
    ['/shots/', SHOTS],
  ],
)
let browser
try {
  await synthesize(CUES, WORK, 'Linh', '185')
  browser = await chromium.launch({ channel: 'chrome' })
  await captureShots(browser)

  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto('http://localhost:4181/')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate((u) => window.ex.url(u), SITE_LABEL)
  await page.evaluate(() => window.ex.show('hook')) // already composed on frame 0, so the thumbnail is never empty
  await page.waitForTimeout(900)
  const recording = await startScreencast(ctx, page, join(WORK, 'frames'))
  await page.evaluate(() => window.ex.count())
  await page.waitForTimeout(300)

  const marks = {}
  const beats = {
    hook: () => {},
    r1: () => { window.ex.show('ratios'); window.ex.mark('ratios', 'r1') },
    r2: () => window.ex.mark('ratios', 'r2'),
    r3: () => window.ex.mark('ratios', 'r3'),
    steps1: () => { window.ex.show('steps'); window.ex.mark('steps', 's1') },
    steps2: () => window.ex.mark('steps', 's2'),
    steps3: () => window.ex.mark('steps', 's3'),
    result: () => window.ex.show('result'),
    trust1: () => window.ex.show('trust'),
    trust2: () => window.ex.mark('trust', 't2'),
    cta: () => window.ex.show('cta'),
  }
  for (const cue of CUES) {
    await page.evaluate(beats[cue.id])
    marks[cue.id] = Date.now() / 1000
    await sleep(cue.duration * 1000 + GAP_MS)
  }
  await sleep(700)
  const { frames, endedAt } = await recording.stop()
  await ctx.close()
  await assemble({ frames, endedAt, marks, cues: CUES, work: WORK, out: OUT })
} finally {
  await browser?.close()
  server.close()
  preview?.kill()
}
log('done')
