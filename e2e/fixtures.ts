import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

/**
 * Prepares test photos once (called when the Playwright config loads), into e2e/.fixtures (git-ignored — no photos of real people are stored in the repo).
 *
 * A neutral portrait published by the MediaPipe project is downloaded for the real-model tests; every
 * other fixture (several faces, dark, tiny face, fake-camera video…) is derived from it in the browser.
 * Without network access the downloaded photo is missing and the tests that need it skip themselves.
 */
const here = dirname(fileURLToPath(import.meta.url))
export const FIXTURES = join(here, '.fixtures')
const PORTRAIT_URL = 'https://storage.googleapis.com/mediapipe-assets/portrait.jpg'

export async function prepareFixtures() {
  await mkdir(FIXTURES, { recursive: true })
  const portrait = join(FIXTURES, 'portrait.jpg')

  if (!existsSync(portrait)) {
    try {
      const response = await fetch(PORTRAIT_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await writeFile(portrait, Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      console.warn(`[e2e] Could not download the sample portrait (${String(error)}); real-face tests will be skipped.`)
      return
    }
  }
  if (existsSync(join(FIXTURES, 'face.y4m')) && existsSync(join(FIXTURES, 'dark.jpg'))) return

  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    const page = await browser.newPage()
    await page.goto('about:blank')
    const dataUrl = `data:image/jpeg;base64,${(await readFile(portrait)).toString('base64')}`

    const made = await page.evaluate(async (src) => {
      const load = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = url
        })
      const img = await load(src)
      const toJpeg = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/jpeg', 0.92).split(',')[1]!
      const make = (w: number, h: number) => {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        return [canvas, canvas.getContext('2d')!] as const
      }
      const out: Record<string, string> = {}

      // Two people side by side (the portrait twice, each face large).
      {
        const [c, ctx] = make(1400, 1000)
        ctx.fillStyle = '#777'
        ctx.fillRect(0, 0, 1400, 1000)
        // crop the head-and-shoulders region of the portrait
        ctx.drawImage(img, 150, 20, 520, 650, 0, 0, 700, 875)
        ctx.drawImage(img, 150, 20, 520, 650, 700, 0, 700, 875)
        out.two = toJpeg(c)
      }
      // Very dark.
      {
        const [c, ctx] = make(img.width, img.height)
        ctx.filter = 'brightness(0.12)'
        ctx.drawImage(img, 0, 0)
        out.dark = toJpeg(c)
      }
      // A landscape with no face at all.
      {
        const [c, ctx] = make(900, 600)
        const gradient = ctx.createLinearGradient(0, 0, 900, 600)
        gradient.addColorStop(0, '#7ec8e3')
        gradient.addColorStop(1, '#2b5f3a')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 900, 600)
        ctx.fillStyle = '#f4d35e'
        ctx.beginPath()
        ctx.arc(700, 140, 60, 0, Math.PI * 2)
        ctx.fill()
        out.noface = toJpeg(c)
      }
      // The face placed too close to the edge of the frame (cut off at the top).
      {
        const [c, ctx] = make(820, 700)
        ctx.fillStyle = '#777'
        ctx.fillRect(0, 0, 820, 700)
        ctx.drawImage(img, 0, 110, 820, 914, 0, 0, 820, 914)
        out.cutoff = toJpeg(c)
      }
      // Tight crop around the head, tilted 20° (roll must not matter).
      {
        const [c, ctx] = make(700, 800)
        ctx.fillStyle = '#777'
        ctx.fillRect(0, 0, 700, 800)
        ctx.translate(350, 400)
        ctx.rotate((20 * Math.PI) / 180)
        ctx.drawImage(img, 130, 10, 560, 700, -280, -350, 560, 700)
        out.tilted = toJpeg(c)
      }
      // 640×480 frames for Chrome's fake camera, centred on the face.
      {
        const [, ctx] = make(640, 480)
        ctx.drawImage(img, 215, 60, 380, 285, 0, 0, 640, 480)
        const { data } = ctx.getImageData(0, 0, 640, 480)
        let binary = ''
        for (let i = 0; i < data.length; i += 4096) binary += String.fromCharCode(...data.subarray(i, i + 4096))
        out.camera = btoa(binary)
      }
      return out
    }, dataUrl)

    for (const name of ['two', 'dark', 'noface', 'cutoff', 'tilted']) {
      await writeFile(join(FIXTURES, `${name}.jpg`), Buffer.from(made[name]!, 'base64'))
    }

    // RGBA → I420 → Y4M (what Chrome's --use-file-for-fake-video-capture expects).
    const rgba = Buffer.from(made.camera!, 'base64')
    const width = 640
    const height = 480
    const y = Buffer.alloc(width * height)
    const u = Buffer.alloc((width / 2) * (height / 2))
    const v = Buffer.alloc((width / 2) * (height / 2))
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = (row * width + col) * 4
        const r = rgba[i]!
        const g = rgba[i + 1]!
        const b = rgba[i + 2]!
        y[row * width + col] = Math.round(0.257 * r + 0.504 * g + 0.098 * b + 16)
        if (row % 2 === 0 && col % 2 === 0) {
          const ci = (row / 2) * (width / 2) + col / 2
          u[ci] = Math.round(-0.148 * r - 0.291 * g + 0.439 * b + 128)
          v[ci] = Math.round(0.439 * r - 0.368 * g - 0.071 * b + 128)
        }
      }
    }
    const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\n`)
    const frame = Buffer.concat([Buffer.from('FRAME\n'), y, u, v])
    await writeFile(join(FIXTURES, 'face.y4m'), Buffer.concat([header, ...Array.from({ length: 30 }, () => frame)]))
  } finally {
    await browser.close()
  }
}
