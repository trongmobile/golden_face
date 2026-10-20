import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { prepareFixtures } from './e2e/fixtures'

// End-to-end tests run against the production build served by `vite preview`, in the locally
// installed Google Chrome (no browser download). Chrome's fake media-stream flags let the camera
// flows run without hardware; when the sample portrait is available, the fake camera shows a real
// face so the whole capture → analysis path is exercised with the real model.
const PORT = 4173
const root = dirname(fileURLToPath(import.meta.url))
const fakeVideo = join(root, 'e2e', '.fixtures', 'face.y4m')

// Fixtures must exist before Chrome starts, because the fake camera file is a launch argument.
await prepareFixtures()

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    channel: 'chrome',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        ...(existsSync(fakeVideo) ? [`--use-file-for-fake-video-capture=${fakeVideo}`] : []),
      ],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
