// Shared plumbing for the motion-graphics cut (explainer.mjs): servers, voice-over, screencast, ffmpeg.
import { execFile, spawn } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

export const run = promisify(execFile)
export const here = dirname(fileURLToPath(import.meta.url))
export const root = dirname(here)
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const log = (...args) => console.log('[promo]', ...args)

export async function reachable(url) {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}

/** Starts `vite preview` of dist/ unless something already answers on `url`. */
export async function startPreview(url, port) {
  if (await reachable(url)) return null
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('dist/ is missing — run `npm run build` first.')
  const child = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (await reachable(url)) return child
    await sleep(500)
  }
  child.kill()
  throw new Error(`The preview server did not start on port ${port}.`)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

/** Static server. `exact`: {'/path': file}; `prefixes`: [['/dir/', directory]]. */
export function startStaticServer(port, exact, prefixes) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = exact[path] ?? null
    for (const [prefix, dir] of prefixes) {
      if (!file && path.startsWith(prefix)) {
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
  return new Promise((resolve) => server.listen(port, () => resolve(server)))
}

/** macOS voice → one wav per cue, with its duration in `cue.duration`. */
export async function synthesize(cues, work, voice, rate) {
  await mkdir(join(work, 'tts'), { recursive: true })
  for (const cue of cues) {
    const aiff = join(work, 'tts', `${cue.id}.aiff`)
    const wav = join(work, 'tts', `${cue.id}.wav`)
    await run('say', ['-v', voice, '-r', rate, '-o', aiff, cue.say])
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', wav])
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav])
    cue.wav = wav
    cue.duration = Number(stdout.trim())
  }
  log('voice-over:', cues.map((c) => `${c.id} ${c.duration.toFixed(1)}s`).join(', '))
}

/** CDP screencast of a page into numbered JPEGs. */
export async function startScreencast(ctx, page, dir) {
  await mkdir(dir, { recursive: true })
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  const writes = []
  cdp.on('Page.screencastFrame', (event) => {
    const file = join(dir, `f${String(frames.length).padStart(6, '0')}.jpg`)
    frames.push({ file, ts: event.metadata.timestamp })
    writes.push(writeFile(file, Buffer.from(event.data, 'base64')))
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 })
  return {
    async stop() {
      const endedAt = Date.now() / 1000
      await cdp.send('Page.stopScreencast')
      await Promise.all(writes)
      return { frames, endedAt }
    },
  }
}

/** Frames + per-cue audio → H.264/AAC mp4 and a cover jpg. */
export async function assemble({ frames, endedAt, marks, cues, work, out }) {
  const t0 = frames[0].ts
  const lines = []
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i + 1].ts : endedAt
    lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, next - frames[i].ts).toFixed(4)}`)
  }
  lines.push(`file '${frames[frames.length - 1].file}'`)
  const list = join(work, 'frames.txt')
  await writeFile(list, lines.join('\n'))

  const offsets = cues.map((c) => Math.max(0, marks[c.id] - t0))
  log('frames:', frames.length, '· length:', (endedAt - t0).toFixed(1) + 's')
  log('cue starts:', cues.map((c, i) => `${c.id}@${offsets[i].toFixed(1)}s`).join(', '))

  const inputs = cues.flatMap((c) => ['-i', c.wav])
  const delays = cues.map((_, i) => `[${i + 1}:a]adelay=${Math.round(offsets[i] * 1000)}:all=1[a${i}]`)
  const mix = `${cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${cues.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`
  await mkdir(dirname(out), { recursive: true })
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
      out,
    ],
    { maxBuffer: 1 << 26 },
  )
  const cover = out.replace(/\.mp4$/, '-cover.jpg')
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '5.9', '-i', out, '-frames:v', '1', '-q:v', '2', cover])
  log('wrote', out)
  log('wrote', cover)
}
