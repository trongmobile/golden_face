import { describe, expect, it, vi } from 'vitest'
import { faceRegion, fullRegion, drawOverlay, paintAnnotated, roundedRectPath, OVERLAY_LAYERS, DEFAULT_LAYERS } from '@/features/face-analysis/overlay'
import { fakeAnalysisResult } from './helpers/fake-result'
import { syntheticLandmarks } from './helpers/synthetic-face'

/** A recording 2D context. */
function recorder() {
  const calls: Array<[string, unknown[]]> = []
  const ctx = new Proxy(
    { measureText: (t: string) => ({ width: t.length * 7 }) } as Record<string, unknown>,
    {
      get: (target, key: string) => (key in target ? target[key] : (...args: unknown[]) => calls.push([key, args])),
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D
  const count = (name: string) => calls.filter(([n]) => n === name).length
  return { ctx, calls, count }
}

describe('view regions', () => {
  it('fullRegion covers the whole image', () => {
    expect(fullRegion(fakeAnalysisResult())).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
  })

  it('faceRegion falls back to the full image for a close-up portrait', () => {
    // A face that already fills the frame gains nothing from zooming in.
    const landmarks = syntheticLandmarks({}, (p) => ({ x: 500 + (p.x - 500) * 1.3, y: 500 + (p.y - 500) * 1.3 }))
    const result = fakeAnalysisResult({ landmarks })
    expect(faceRegion(result)).toEqual(fullRegion(result))
  })

  it('faceRegion zooms in on a small face inside a large photo, keeping room for the hair', () => {
    const size = { width: 3000, height: 2000 }
    // Shrink the face to a tenth of its size and place it in the middle of a big photo.
    const landmarks = syntheticLandmarks({}, (p) => ({ x: 1500 + (p.x - 500) * 0.3, y: 1000 + (p.y - 500) * 0.3 }), size)
    const result = fakeAnalysisResult({ imageSize: size, landmarks })
    const region = faceRegion(result)
    expect(region.width).toBeLessThan(size.width)
    expect(region.height).toBeLessThan(size.height)
    // Face spans x 1440–1560 (120 px wide) → ±50 % margin; y 940–1120.
    expect(region.x).toBeCloseTo(1440 - 60, 0)
    expect(region.x + region.width).toBeCloseTo(1560 + 60, 0)
    expect(region.y).toBeLessThan(940)
    expect(region.y + region.height).toBeGreaterThan(1120)
  })

  it('faceRegion stays inside the image', () => {
    const size = { width: 1600, height: 1200 }
    const landmarks = syntheticLandmarks({}, (p) => ({ x: p.x * 0.4 + 20, y: p.y * 0.4 + 10 }), size)
    const region = faceRegion(fakeAnalysisResult({ imageSize: size, landmarks }))
    expect(region.x).toBeGreaterThanOrEqual(0)
    expect(region.y).toBeGreaterThanOrEqual(0)
    expect(region.x + region.width).toBeLessThanOrEqual(size.width)
    expect(region.y + region.height).toBeLessThanOrEqual(size.height)
  })
})

describe('drawOverlay', () => {
  const result = fakeAnalysisResult()
  const draw = (layers: string[], extra: object = {}) => {
    const rec = recorder()
    drawOverlay(rec.ctx, result, result.measurements, { layers: new Set(layers) as never, ...extra })
    return rec
  }

  it('draws nothing when every layer is off', () => {
    expect(draw([]).count('stroke')).toBe(0)
    expect(draw([]).count('arc')).toBe(0)
  })

  it('draws a line (with casing) for each measured segment when the measurements layer is on', () => {
    const rec = draw(['measurements'])
    const segments = Object.keys(result.measurements.segments).length
    expect(rec.count('lineTo')).toBeGreaterThanOrEqual(segments) // at least the main line of each segment
    expect(rec.count('stroke')).toBeGreaterThanOrEqual(segments * 2)
  })

  it('draws a guide for every vertical level and labels them', () => {
    const rec = draw(['levels'])
    // every guide is stroked twice (dark casing + colour)
    expect(rec.count('lineTo')).toBe(result.measurements.levels.length * 2)
    expect(rec.count('fillText')).toBe(result.measurements.levels.length)
  })

  it('draws the symmetry axis, pair links and mirrored markers', () => {
    const rec = draw(['symmetry'])
    expect(rec.count('arc')).toBe(result.measurements.symmetry.pairs.length)
  })

  it('draws the mesh and contours from the supplied connection lists', () => {
    const withConnections = fakeAnalysisResult({
      connections: { tesselation: [[0, 1], [1, 2], [2, 3]], contours: [[3, 4]], faceOval: [[5, 6]] },
    })
    const rec = recorder()
    drawOverlay(rec.ctx, withConnections, withConnections.measurements, { layers: new Set(['mesh']) as never })
    expect(rec.count('lineTo')).toBe(3)
    const rec2 = recorder()
    drawOverlay(rec2.ctx, withConnections, withConnections.measurements, { layers: new Set(['contours']) as never })
    expect(rec2.count('lineTo')).toBe(2)
  })

  it('labels the emphasised measurement only', () => {
    const rec = draw(['measurements'], { highlight: 'mouth-nose', labels: true })
    expect(rec.calls.filter(([n]) => n === 'fillText').map(([, a]) => (a as string[])[0])).toEqual(
      expect.arrayContaining(['Mouth width', 'Nose width']),
    )
    expect(draw(['measurements'], { highlight: 'mouth-nose', labels: false }).count('fillText')).toBe(0)
  })

  it('draws landmark dots for the points used in measurements', () => {
    expect(draw(['landmarks']).count('arc')).toBeGreaterThan(10)
  })

  it('offers each layer with a label and sensible defaults', () => {
    expect(OVERLAY_LAYERS.map((l) => l.id).sort()).toEqual(['contours', 'landmarks', 'levels', 'measurements', 'mesh', 'symmetry'])
    expect(DEFAULT_LAYERS).not.toContain('mesh')
    for (const layer of OVERLAY_LAYERS) expect(layer.description.length).toBeGreaterThan(10)
  })
})

describe('paintAnnotated', () => {
  it('maps image pixels to canvas pixels for the chosen region and scale', () => {
    const rec = recorder()
    const result = fakeAnalysisResult()
    paintAnnotated(rec.ctx, document.createElement('canvas'), result, result.measurements, { layers: new Set() as never }, { x: 100, y: 50, width: 400, height: 300 }, 2)
    const transform = rec.calls.find(([n]) => n === 'setTransform')!
    expect(transform[1]).toEqual([2, 0, 0, 2, -200, -100])
    expect(rec.count('drawImage')).toBe(1)
    expect(rec.count('save')).toBe(rec.count('restore')) // the context state is always restored
  })
})

describe('roundedRectPath', () => {
  it('uses roundRect when available and arcs otherwise', () => {
    const native = vi.fn()
    roundedRectPath({ roundRect: native } as unknown as CanvasRenderingContext2D, 0, 0, 100, 40, 30)
    expect(native).toHaveBeenCalledWith(0, 0, 100, 40, 20) // radius clamped to half the height

    const arcTo = vi.fn()
    const closePath = vi.fn()
    roundedRectPath({ moveTo: vi.fn(), arcTo, closePath } as unknown as CanvasRenderingContext2D, 0, 0, 100, 40, 10)
    expect(arcTo).toHaveBeenCalledTimes(4)
    expect(closePath).toHaveBeenCalled()
  })
})

