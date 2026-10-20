import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(rootDir, 'src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Some component tests click through a whole results page; shared CI runners can be several times
    // slower than a laptop, and the default 5 s made them fail at random.
    testTimeout: 20_000,
    restoreMocks: true,
    unstubGlobals: true,
  },
})
