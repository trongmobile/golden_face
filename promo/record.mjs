// Renders the TikTok tutorial video (1080×1920, 30 fps, H.264 + AAC).
//
//   npm run build            # once, so dist/ matches the code
//   node promo/record.mjs [--photo path/to/face.jpg] [--out promo/out/goldenface-tiktok.mp4]
//
// How it works: the real app (vite preview of dist/) is shown in an iframe inside promo/stage/stage.html,
// scaled up to a phone-sized region with the title, captions, tap indicator and end card around it.
// Chrome drives the app like a user would while the CDP screencast records every frame; the macOS "Linh"
// voice reads each cue from promo/script.mjs and the audio is placed at the moment each cue starts.
//
// Needs: macOS (`say`), Google Chrome, ffmpeg, Node ≥ 20.

import { execFile, spawn } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}

// --script promo/script-short.mjs renders another cut; scenes whose cue id is missing from it are skipped.
const { CUES, SITE_LABEL } = await import(pathToFileURL(arg('script', join(here, 'script.mjs'))).href)
const PHOTO = arg('photo', join(here, 'assets', 'avatar.jpg'))
const OUT = arg('out', join(here, 'out', 'goldenface-tiktok.mp4'))
const VOICE = arg('voice', 'Linh')
const RATE = arg('rate', '185')
const WORK = join(here, '.work')
const FRAMES = join(WORK, 'frames')
const PREVIEW_PORT = 4180
const STAGE_PORT = 4181
const APP_URL = arg('app', `http://localhost:${PREVIEW_PORT}/vi/`)
const GAP_MS = 350 // pause after each spoken cue
const SCALE = 2.2 // the app (390 css px wide) is shown 2.2× larger on the 1080 px stage

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (...args) => console.log('[promo]', ...args)

// ---------------------------------------------------------------------------------------------
// Servers: the built app (vite preview) and a tiny static server for the stage page + fonts.
// ---------------------------------------------------------------------------------------------
async function reachable(url) {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}

async function startPreview() {
  if (await reachable(APP_URL)) return null
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('dist/ is missing — run `npm run build` first.')
  const child = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  })
  for (let i = 0; i < 60; i++) {
    if (await reachable(APP_URL)) return child
    await sleep(500)
  }
  child.kill()
  throw new Error(`The preview server did not start on port ${PREVIEW_PORT}.`)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}
const STATIC_ROUTES = [
  ['/fonts/inter/', join(root, 'node_modules', '@fontsource-variable', 'inter')],
  ['/fonts/fraunces/', join(root, 'node_modules', '@fontsource-variable', 'fraunces')],
]

function startStageServer() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = null
    if (path === '/') file = join(here, 'stage', 'stage.html')
    else if (path === '/favicon.svg') file = join(root, 'public', 'favicon.svg')
    else {
      for (const [prefix, dir] of STATIC_ROUTES) {
        if (!path.startsWith(prefix)) continue
        const candidate = normalize(join(dir, path.slice(prefix.length)))
        if (candidate.startsWith(dir)) file = candidate
      }
    }
    if (!file || !(await stat(file).then((s) => s.isFile()).catch(() => false))) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(STAGE_PORT, () => resolve(server)))
}

// ---------------------------------------------------------------------------------------------
// Voice-over
// ---------------------------------------------------------------------------------------------
async function synthesize() {
  await mkdir(join(WORK, 'tts'), { recursive: true })
  for (const cue of CUES) {
    const aiff = join(WORK, 'tts', `${cue.id}.aiff`)
    const wav = join(WORK, 'tts', `${cue.id}.wav`)
    await run('say', ['-v', VOICE, '-r', RATE, '-o', aiff, cue.say])
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', wav])
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav])
    cue.wav = wav
    cue.duration = Number(stdout.trim())
  }
  log('voice-over:', CUES.map((c) => `${c.id} ${c.duration.toFixed(1)}s`).join(', '))
}

// ---------------------------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------------------------
async function record(browser) {
  await rm(FRAMES, { recursive: true, force: true })
  await mkdir(FRAMES, { recursive: true })

  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, locale: 'vi-VN' })

  // Warm-up: load the page and the face model once so the recorded run isn't waiting on a cold cache.
  {
    const warm = await ctx.newPage()
    await warm.setViewportSize({ width: 390, height: 627 })
    await warm.goto(new URL('analysis', APP_URL).href)
    await warm.getByTestId('photo-input').setInputFiles(PHOTO)
    await warm.getByRole('button', { name: 'Phân tích ảnh này' }).click()
    await warm.getByRole('heading', { name: 'Tỷ lệ khuôn mặt của bạn' }).waitFor({ timeout: 90_000 })
    await warm.close()
  }

  const page = await ctx.newPage()
  await page.goto(`http://localhost:${STAGE_PORT}/`)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate((url) => window.stage.loadApp(url), APP_URL)
  await page.waitForTimeout(800)
  const app = page.frameLocator('#app')

  // ---- helpers ------------------------------------------------------------------------------
  const stage = (fn, arg) => page.evaluate(fn, arg)
  const centre = (box) => [box.x + box.width / 2, box.y + box.height / 2]

  const heading = (h) => stage((h) => window.stage.heading(h), h)

  async function scrollTo(locator, { align = 'center', ms = 1000 } = {}) {
    await locator.evaluate(
      (el, { align, ms }) =>
        new Promise((resolve) => {
          const rect = el.getBoundingClientRect()
          const max = document.documentElement.scrollHeight - innerHeight
          const wanted = scrollY + rect.top - (align === 'center' ? (innerHeight - rect.height) / 2 : 84)
          const to = Math.max(0, Math.min(max, wanted))
          const from = scrollY
          const t0 = performance.now()
          const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
          const step = (now) => {
            const t = Math.min(1, (now - t0) / ms)
            // 'instant': the site sets scroll-behavior: smooth, which would lag behind this animation
            scrollTo({ top: from + (to - from) * ease(t), behavior: 'instant' })
            if (t < 1) requestAnimationFrame(step)
            else resolve()
          }
          requestAnimationFrame(step)
        }),
      { align, ms },
    )
  }

  async function ring(locator, ms, pad = 14) {
    const box = await locator.boundingBox()
    if (!box) throw new Error('ring(): the element has no visible box')
    await stage(([b, p]) => window.stage.ring(b, p), [box, pad])
    await sleep(ms)
    await stage(() => window.stage.ring(null))
  }

  async function tap(locator, { lead = 750 } = {}) {
    const box = await locator.boundingBox()
    const [x, y] = centre(box)
    await stage(([x, y]) => window.stage.finger(x, y), [x, y])
    await sleep(lead)
    await stage(([x, y]) => {
      window.stage.fingerDown(true)
      window.stage.ripple(x, y)
    }, [x, y])
    await sleep(140)
    await locator.click()
    await stage(() => {
      window.stage.fingerDown(false)
      setTimeout(() => window.stage.fingerHide(), 500)
    })
  }

  async function drag(locator, dx, dy, { lead = 700, steps = 26 } = {}) {
    const box = await locator.boundingBox()
    const [x0, y0] = centre(box)
    await stage(([x, y]) => window.stage.finger(x, y), [x0, y0])
    await sleep(lead)
    await page.mouse.move(x0, y0)
    await page.mouse.down()
    await stage(() => window.stage.fingerDown(true))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const e = t * t * (3 - 2 * t)
      const x = x0 + dx * e
      const y = y0 + dy * e
      await page.mouse.move(x, y)
      await stage(([x, y]) => window.stage.finger(x, y, { instant: true }), [x, y])
      await sleep(16)
    }
    await page.mouse.up()
    await stage(() => {
      window.stage.fingerDown(false)
      setTimeout(() => window.stage.fingerHide(), 350)
    })
  }

  // ---- screencast ---------------------------------------------------------------------------
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  const writes = []
  cdp.on('Page.screencastFrame', (event) => {
    const file = join(FRAMES, `f${String(frames.length).padStart(6, '0')}.jpg`)
    frames.push({ file, ts: event.metadata.timestamp })
    writes.push(writeFile(file, Buffer.from(event.data, 'base64')))
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
  })

  // The first title is in place before recording starts, so frame 0 is already a good cover.
  const hook = CUES[0]
  await heading({ ...hook.heading, caption: hook.say })
  await page.waitForTimeout(500)
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 })
  await page.waitForTimeout(400)

  // ---- the tutorial -------------------------------------------------------------------------
  const marks = {}
  const cue = async (id, action) => {
    const c = CUES.find((x) => x.id === id)
    if (!c) return
    if (c.heading && id !== 'hook') await heading({ ...c.heading, caption: c.say })
    else await stage((text) => window.stage.caption(text), c.say)
    marks[id] = Date.now() / 1000 // the voice starts together with its caption
    await Promise.all([sleep(c.duration * 1000 + GAP_MS), action?.()])
  }

  // Home page (hook)
  await cue('hook', async () => {
    await sleep(1500)
    await scrollTo(app.getByText('φ 1.618').first(), { align: 'center', ms: 1500 }).catch(() => {})
    await sleep(900)
    await scrollTo(app.getByRole('heading', { level: 1 }), { align: 'top', ms: 1100 })
  })

  // Step 1 — choose a photo
  await cue('step1', async () => {
    const upload = app.getByRole('link', { name: /Tải ảnh lên/ }).first()
    await sleep(500)
    await ring(upload, 1100, 10)
    await tap(upload)
  })

  await cue('tips', async () => {
    await app.getByRole('heading', { name: 'Phân tích ảnh', level: 1 }).waitFor()
    await sleep(500)
    const tips = app.getByText('Để có kết quả đo ổn định nhất')
    await scrollTo(tips, { align: 'top', ms: 1100 })
    await sleep(700)
    await scrollTo(app.getByRole('heading', { name: 'Phân tích ảnh', level: 1 }), { align: 'top', ms: 900 })
    await sleep(250)
    await tap(app.getByRole('button', { name: 'Chọn ảnh' }).first().or(app.getByText('Chọn ảnh').first()))
    await app.getByTestId('photo-input').setInputFiles(PHOTO)
    await stage(() => window.stage.demoTag(true))
  })

  // Step 2 — crop
  await cue('step2', async () => {
    await app.getByRole('heading', { name: 'Kiểm tra ảnh của bạn' }).waitFor()
    await sleep(500)
    await scrollTo(app.getByRole('button', { name: 'Xoay trái' }), { align: 'top', ms: 800 })
    await sleep(200)
    await tap(app.getByRole('button', { name: 'Xoay phải' }), { lead: 450 })
    await sleep(350)
    await tap(app.getByRole('button', { name: 'Xoay trái' }), { lead: 450 })
    await sleep(250)
    await drag(app.locator('[data-handle="nw"]'), 34 * SCALE, 30 * SCALE, { lead: 500, steps: 18 })
    await sleep(150)
    await drag(app.locator('[data-handle="se"]'), -34 * SCALE, -46 * SCALE, { lead: 500, steps: 18 })
  })

  // Step 3 — analyse
  await cue('step3', async () => {
    const analyze = app.getByRole('button', { name: 'Phân tích ảnh này' })
    await scrollTo(analyze, { align: 'center', ms: 900 })
    await sleep(300)
    await ring(analyze, 700, 10)
    await tap(analyze)
    await app.getByRole('heading', { name: 'Tỷ lệ khuôn mặt của bạn' }).waitFor({ timeout: 90_000 })
  })

  // Results
  await cue('result1', async () => {
    await sleep(900)
    const canvas = app.locator('canvas[role="img"]').first()
    await scrollTo(canvas, { align: 'center', ms: 1300 })
    await sleep(200)
    await ring(canvas, 1800, 8)
  })

  await cue('result2', async () => {
    const symmetry = app.getByRole('button', { name: 'Trục đối xứng' })
    await scrollTo(symmetry, { align: 'center', ms: 900 })
    await sleep(250)
    await tap(symmetry)
    await sleep(500)
    await tap(app.getByRole('button', { name: 'Đường viền mặt' }))
    await sleep(500)
    await scrollTo(app.locator('canvas[role="img"]').first(), { align: 'center', ms: 800 })
  })

  await cue('result3', async () => {
    const first = app.getByRole('article').first()
    await scrollTo(first, { align: 'top', ms: 1300 })
    await sleep(300)
    await ring(first, 1000, 8)
    const mouth = app.getByRole('article').filter({ hasText: 'Chiều rộng miệng ÷ chiều rộng mũi' })
    await scrollTo(mouth, { align: 'top', ms: 1300 })
    await sleep(300)
    await ring(mouth, 1000, 8)
  })

  // Reminder that this is geometry, not beauty
  await cue('note', async () => {
    const note = app
      .getByText('Một khám phá về hình học — không phải điểm số sắc đẹp')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
    await scrollTo(note, { align: 'center', ms: 1500 })
    await sleep(300)
    await ring(note, 2200, 8)
  })

  // Call to action
  await cue('cta', async () => {
    await stage((label) => {
      window.stage.demoTag(false)
      window.stage.end(true, label)
    }, SITE_LABEL)
    await sleep(500)
  })
  await sleep(900)

  const endedAt = Date.now() / 1000
  await cdp.send('Page.stopScreencast')
  await Promise.all(writes)
  await ctx.close()
  return { frames, marks, endedAt }
}

// ---------------------------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------------------------
async function assemble({ frames, marks, endedAt }) {
  const t0 = frames[0].ts
  const lines = []
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i + 1].ts : endedAt
    lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, next - frames[i].ts).toFixed(4)}`)
  }
  lines.push(`file '${frames[frames.length - 1].file}'`) // the concat demuxer ignores the last duration
  const list = join(WORK, 'frames.txt')
  await writeFile(list, lines.join('\n'))

  const offsets = CUES.map((c) => Math.max(0, marks[c.id] - t0))
  log('frames:', frames.length, '· length:', (endedAt - t0).toFixed(1) + 's')
  log('cue starts:', CUES.map((c, i) => `${c.id}@${offsets[i].toFixed(1)}s`).join(', '))

  const inputs = CUES.flatMap((c) => ['-i', c.wav])
  const delays = CUES.map((_, i) => `[${i + 1}:a]adelay=${Math.round(offsets[i] * 1000)}:all=1[a${i}]`)
  const mix = `${CUES.map((_, i) => `[a${i}]`).join('')}amix=inputs=${CUES.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`

  await mkdir(dirname(OUT), { recursive: true })
  await run(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', list,
      ...inputs,
      '-filter_complex', `${delays.join(';')};${mix}`,
      '-map', '0:v', '-map', '[aout]',
      '-vf', 'fps=30,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-movflags', '+faststart',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
      '-t', (endedAt - t0).toFixed(3),
      OUT,
    ],
    { maxBuffer: 1 << 26 },
  )
  // A cover image (frame 1 s in) for TikTok's "select cover".
  const cover = OUT.replace(/\.mp4$/, '-cover.jpg')
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.2', '-i', OUT, '-frames:v', '1', '-q:v', '2', cover])
  log('wrote', OUT)
  log('wrote', cover)
}

// ---------------------------------------------------------------------------------------------
if (!existsSync(PHOTO)) throw new Error(`Photo not found: ${PHOTO} (run \`node promo/make-avatar.mjs\` or pass --photo).`)
await rm(WORK, { recursive: true, force: true })
await mkdir(WORK, { recursive: true })

const preview = await startPreview()
const stageServer = await startStageServer()
let browser
try {
  await synthesize()
  browser = await chromium.launch({ channel: 'chrome' })
  const result = await record(browser)
  await assemble(result)
} finally {
  await browser?.close()
  stageServer.close()
  preview?.kill()
}
