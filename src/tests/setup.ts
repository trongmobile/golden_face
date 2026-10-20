import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// ── jsdom has no canvas implementation: provide a minimal 2D context so drawing code can run. ──
function createFakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const noop = () => undefined
  const target: Record<string, unknown> = {
    canvas,
    getImageData: (_x: number, _y: number, width: number, height: number) => {
      // A deterministic, well-exposed, high-detail pattern (mean ≈ 128, strong edges).
      const data = new Uint8ClampedArray(width * height * 4)
      for (let i = 0; i < width * height; i++) {
        const value = (i * 2654435761) % 256
        data[i * 4] = value
        data[i * 4 + 1] = value
        data[i * 4 + 2] = value
        data[i * 4 + 3] = 255
      }
      return { data, width, height }
    },
    measureText: (text: string) => ({ width: text.length * 7 }),
  }
  return new Proxy(target, {
    get: (object, key: string) => (key in object ? object[key] : noop),
    set: (object, key: string, value) => {
      object[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

// Test files that run in Node (// @vitest-environment node) have no DOM to patch.
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement) {
    return createFakeContext(this)
  } as unknown as HTMLCanvasElement['getContext']

  HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback, type?: string) {
    callback(new Blob(['fake'], { type: type ?? 'image/png' }))
  }

  // Not implemented by jsdom.
  window.scrollTo = (() => undefined) as typeof window.scrollTo
  Element.prototype.scrollIntoView = (() => undefined) as typeof Element.prototype.scrollIntoView
}

// Recharts' ResponsiveContainer needs ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
