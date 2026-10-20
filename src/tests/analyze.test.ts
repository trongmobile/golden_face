import { describe, expect, it, vi } from 'vitest'
import {
  AnalysisError,
  analyzeFace,
  boxIoU,
  isSameFace,
  mergeFaces,
  type AnalysisStage,
  type AnalyzeDeps,
  type DetectedFace,
} from '@/features/face-analysis/analyze'
import { ModelLoadError, type LandmarkerHandle } from '@/features/face-analysis/landmarker'
import { LM } from '@/features/face-analysis/landmarks'
import type { Landmark } from '@/types'
import { transformMatrix } from './helpers/pose-matrix'
import { SYNTHETIC_SIZE, syntheticLandmarks, type PixelOverrides } from './helpers/synthetic-face'

/** A fake MediaPipe result. */
interface FakeFace {
  landmarks: Landmark[]
  matrix?: ReturnType<typeof transformMatrix>
  blendshapes?: Record<string, number>
}
const result = (...faces: FakeFace[]) => ({
  faceLandmarks: faces.map((f) => f.landmarks),
  facialTransformationMatrixes: faces.map((f) => f.matrix ?? transformMatrix(2, 3, 1)),
  faceBlendshapes: faces.map((f) => ({
    categories: Object.entries(f.blendshapes ?? { mouthSmileLeft: 0.02, jawOpen: 0.01, eyeBlinkLeft: 0.05 }).map(
      ([categoryName, score]) => ({ categoryName, score }),
    ),
  })),
})

const face = (overrides: PixelOverrides = {}, transform?: (p: { x: number; y: number }) => { x: number; y: number }): FakeFace => ({
  landmarks: syntheticLandmarks(overrides, transform),
})

/** Tiles are marked by cropTile so the fake landmarker can answer differently for them. */
interface TileMarker extends HTMLCanvasElement {
  __tile?: { x: number; y: number; width: number; height: number }
}

function makeDeps(opts: {
  full?: FakeFace[] | (() => never)
  tiles?: (tile: { x: number; y: number; width: number; height: number }) => FakeFace[]
  load?: AnalyzeDeps['loadLandmarker']
  pixels?: ReturnType<AnalyzeDeps['sampleFacePixels']>
}) {
  const detect = vi.fn((image: TileMarker) => {
    if (image.__tile) return result(...(opts.tiles?.(image.__tile) ?? []))
    if (typeof opts.full === 'function') return opts.full()
    return result(...(opts.full ?? []))
  })
  const handle = {
    landmarker: { detect },
    delegate: 'CPU',
    connections: { tesselation: [], contours: [], faceOval: [] },
  } as unknown as LandmarkerHandle
  const deps: AnalyzeDeps = {
    loadLandmarker: opts.load ?? (async () => handle),
    sampleFacePixels: () =>
      opts.pixels === undefined
        ? { meanLuma: 130, stdLuma: 55, sharpness: 0.05, leftMean: 128, rightMean: 132 }
        : opts.pixels,
    cropTile: (_source, rect) => {
      const tile = document.createElement('canvas') as TileMarker
      tile.width = Math.round(rect.width)
      tile.height = Math.round(rect.height)
      tile.__tile = rect
      return tile
    },
    yieldToMain: async () => undefined,
  }
  return { deps, detect }
}

const photo = () => {
  const canvas = document.createElement('canvas')
  canvas.width = SYNTHETIC_SIZE.width
  canvas.height = SYNTHETIC_SIZE.height
  return canvas
}

async function expectError(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(AnalysisError)
    return error as AnalysisError
  }
  throw new Error('Expected analyzeFace to reject')
}

describe('analyzeFace: a single clear face', () => {
  it('returns measurements, quality and landmarks', async () => {
    const { deps } = makeDeps({ full: [face()] })
    const outcome = await analyzeFace(photo(), {}, deps)
    expect(outcome.landmarks).toHaveLength(478)
    expect(outcome.imageSize).toEqual(SYNTHETIC_SIZE)
    expect(outcome.model.delegate).toBe('CPU')
    const lengthWidth = outcome.measurements.metrics.find((m) => m.id === 'face-length-width')
    expect(lengthWidth?.status).toBe('ok')
    if (lengthWidth?.status === 'ok') expect(lengthWidth.ratio).toBeCloseTo(1.5, 6)
    expect(outcome.quality.reliability).toBe('good')
  })

  it('reports each stage in order', async () => {
    const { deps } = makeDeps({ full: [face()] })
    const stages: AnalysisStage[] = []
    await analyzeFace(photo(), { onStage: (s) => stages.push(s) }, deps)
    expect(stages).toEqual(['loading-model', 'detecting', 'checking-faces', 'measuring'])
  })

  it('scans tiles for extra faces and merges duplicates of the same face', async () => {
    // Every tile sees the same face again (as in real photos) — that must not count as a second face.
    const { deps, detect } = makeDeps({ full: [face()], tiles: () => [face()] })
    const outcome = await analyzeFace(photo(), {}, deps)
    expect(detect).toHaveBeenCalledTimes(5) // full image + 2 × 2 tiles
    expect(outcome.landmarks).toHaveLength(478)
  })

  it('keeps warnings (smiling) without rejecting the photo', async () => {
    const { deps } = makeDeps({ full: [{ ...face(), blendshapes: { mouthSmileLeft: 0.9, mouthSmileRight: 0.9 } }] })
    const outcome = await analyzeFace(photo(), {}, deps)
    expect(outcome.quality.checks.find((c) => c.id === 'expression')?.status).toBe('warn')
    expect(outcome.quality.reliability).toBe('fair')
  })
})

describe('analyzeFace: no face', () => {
  it('rejects with code no-face and never returns numbers', async () => {
    const { deps } = makeDeps({ full: [] })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('no-face')
    expect(error.message).toMatch(/no face/i)
  })

  it('ignores detections whose landmarks are unusable', async () => {
    const broken: Landmark[] = Array.from({ length: 478 }, () => ({ x: Number.NaN, y: Number.NaN }))
    const { deps } = makeDeps({ full: [{ landmarks: broken }] })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('no-face')
  })

  it('skips the tile scan for very small images', async () => {
    const { deps, detect } = makeDeps({ full: [] })
    const tiny = document.createElement('canvas')
    tiny.width = 300
    tiny.height = 300
    await expectError(analyzeFace(tiny, {}, deps))
    expect(detect).toHaveBeenCalledTimes(1)
  })
})

describe('analyzeFace: multiple faces', () => {
  // A second face of the same size in the top-left corner of the image.
  const second = face({}, (p) => ({ x: p.x * 0.5 - 100, y: p.y * 0.5 - 60 }))

  it('rejects when the model returns two faces directly', async () => {
    const { deps } = makeDeps({ full: [face(), second] })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('multiple-faces')
    expect(error.faceCount).toBe(2)
  })

  it('finds an extra face that only shows up in a tile', async () => {
    const { deps } = makeDeps({
      full: [face()],
      tiles: (tile) => (tile.x === 0 && tile.y === 0 ? [second] : []),
    })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('multiple-faces')
  })

  it('ignores a much smaller background face', async () => {
    const tiny = face({}, (p) => ({ x: p.x * 0.1 - 5, y: p.y * 0.1 - 5 })) // ≈ 10 % of the main face width
    const { deps } = makeDeps({ full: [face(), tiny] })
    const outcome = await analyzeFace(photo(), {}, deps)
    expect(outcome.landmarks).toHaveLength(478)
  })

  it('counts faces found only in tiles when the full image shows none', async () => {
    const { deps } = makeDeps({ full: [], tiles: (tile) => (tile.x === 0 && tile.y === 0 ? [face(), second] : []) })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('multiple-faces')
  })

  it('uses a single face found only in a tile, mapped back to full-image coordinates', async () => {
    // The tile covers the bottom-right 60 % of the image: tile x/y 0–1 maps to 400–1000.
    const inTile = syntheticLandmarks({}, (p) => ({ x: p.x, y: p.y }))
    const { deps } = makeDeps({
      full: [],
      tiles: (tile) => (tile.x > 0 && tile.y > 0 ? [{ landmarks: inTile }] : []),
    })
    const outcome = await analyzeFace(photo(), {}, deps)
    // synthetic x = 0.5 within the tile → 400 + 0.5 × 600 = 700 / 1000 in the full image
    expect(outcome.landmarks[LM.chin]!.x).toBeCloseTo((400 + 0.5 * 600) / 1000, 6)
    expect(outcome.landmarks[LM.chin]!.y).toBeCloseTo((400 + 0.8 * 600) / 1000, 6)
  })
})

describe('analyzeFace: quality gates', () => {
  it('rejects a head turned too far (pose-too-large)', async () => {
    const { deps } = makeDeps({ full: [{ ...face(), matrix: transformMatrix(30, 0, 0) }] })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('pose-too-large')
    expect(error.quality?.checks.some((c) => c.id === 'yaw' && c.status === 'fail')).toBe(true)
  })

  it('rejects a face that is too small', async () => {
    const { deps } = makeDeps({ full: [face({}, (p) => ({ x: 500 + (p.x - 500) * 0.1, y: 500 + (p.y - 500) * 0.1 }))] })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('face-too-small')
  })

  it('rejects a face that is cut off by the frame', async () => {
    const { deps } = makeDeps({ full: [face({}, (p) => ({ x: p.x, y: p.y + 300 }))] })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('face-cut-off')
  })

  it('rejects a face in almost no light', async () => {
    const { deps } = makeDeps({
      full: [face()],
      pixels: { meanLuma: 12, stdLuma: 6, sharpness: 0.05, leftMean: 12, rightMean: 12 },
    })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('poor-lighting')
  })

  it('rejects landmark sets without usable eyes (invalid-landmarks)', async () => {
    const { deps } = makeDeps({
      full: [
        face({
          [LM.irisCentreRight]: null,
          [LM.irisCentreLeft]: null,
          [LM.eyeOuterRight]: null,
          [LM.eyeInnerRight]: null,
        }),
      ],
    })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('invalid-landmarks')
  })
})

describe('analyzeFace: failures and cancellation', () => {
  it('maps a model download failure to model-load-failed', async () => {
    const { deps } = makeDeps({ load: async () => Promise.reject(new ModelLoadError('The model could not be downloaded.')) })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('model-load-failed')
    expect(error.message).toBe('The model could not be downloaded.')
  })

  it('maps an unknown load failure to model-load-failed with a safe message', async () => {
    const { deps } = makeDeps({ load: async () => Promise.reject(new Error('boom')) })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('model-load-failed')
    expect(error.message).not.toMatch(/boom/)
  })

  it('maps an out-of-memory error during detection to resource-error', async () => {
    const { deps } = makeDeps({
      full: () => {
        throw new Error('RangeError: WebAssembly.Memory(): could not allocate memory')
      },
    })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('resource-error')
  })

  it('maps other detector errors to detection-failed', async () => {
    const { deps } = makeDeps({
      full: () => {
        throw new Error('unexpected')
      },
    })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('detection-failed')
  })

  it('stops with code aborted when the signal is already aborted', async () => {
    const { deps, detect } = makeDeps({ full: [face()] })
    const controller = new AbortController()
    controller.abort()
    const error = await expectError(analyzeFace(photo(), { signal: controller.signal }, deps))
    expect(error.code).toBe('aborted')
    expect(detect).not.toHaveBeenCalled()
  })

  it('treats an aborted model load as a cancellation', async () => {
    const { deps } = makeDeps({ load: async () => Promise.reject(new DOMException('cancelled', 'AbortError')) })
    const error = await expectError(analyzeFace(photo(), {}, deps))
    expect(error.code).toBe('aborted')
  })

  it('rejects a zero-sized canvas', async () => {
    const { deps } = makeDeps({ full: [face()] })
    const empty = document.createElement('canvas')
    empty.width = 0
    empty.height = 0
    const error = await expectError(analyzeFace(empty, {}, deps))
    expect(error.code).toBe('detection-failed')
  })
})

describe('face matching helpers', () => {
  const box = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 })

  it('computes intersection-over-union', () => {
    expect(boxIoU(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1)
    expect(boxIoU(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(0)
    expect(boxIoU(box(0, 0, 10, 10), box(5, 0, 15, 10))).toBeCloseTo(1 / 3, 9)
  })

  it('treats overlapping or nested boxes as the same face, distant boxes as different', () => {
    expect(isSameFace(box(0, 0, 100, 100), box(10, 10, 90, 90))).toBe(true)
    expect(isSameFace(box(0, 0, 100, 100), box(300, 0, 400, 100))).toBe(false)
  })

  it('merges duplicates and prefers the full-image detection', () => {
    const make = (source: 'full' | 'tile', b: ReturnType<typeof box>): DetectedFace => ({
      landmarks: [],
      box: b,
      matrix: null,
      blendshapes: {},
      source,
    })
    const merged = mergeFaces([make('tile', box(2, 2, 102, 102)), make('full', box(0, 0, 100, 100)), make('tile', box(500, 0, 600, 100))])
    expect(merged).toHaveLength(2)
    expect(merged[0]!.source).toBe('full')
  })
})
