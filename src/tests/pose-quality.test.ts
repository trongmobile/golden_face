import { describe, expect, it } from 'vitest'
import { msg, translate } from '@/i18n'
import { poseFromLandmarks, poseFromTransformMatrix } from '@/features/face-analysis/pose'
import {
  QUALITY_THRESHOLDS,
  computeFaceBox,
  computePixelStats,
  evaluateQuality,
  failedChecks,
  summarizeReliability,
} from '@/features/face-analysis/quality'
import { LM } from '@/features/face-analysis/landmarks'
import { transformMatrix } from './helpers/pose-matrix'
import { SYNTHETIC_SIZE, syntheticLandmarks } from './helpers/synthetic-face'

describe('poseFromTransformMatrix', () => {
  it('reads yaw, pitch and roll magnitudes', () => {
    const pose = poseFromTransformMatrix(transformMatrix(20, 0, 0))!
    expect(pose.yaw).toBeCloseTo(20, 4)
    expect(pose.pitch).toBeCloseTo(0, 4)
    expect(pose.roll).toBeCloseTo(0, 4)

    const nod = poseFromTransformMatrix(transformMatrix(0, 15, 0))!
    expect(nod.pitch).toBeCloseTo(15, 4)
    expect(nod.yaw).toBeCloseTo(0, 4)

    const tilt = poseFromTransformMatrix(transformMatrix(0, 0, 25))!
    expect(tilt.roll).toBeCloseTo(25, 4)
  })

  it('returns unsigned values for turns in either direction', () => {
    expect(poseFromTransformMatrix(transformMatrix(-18))!.yaw).toBeCloseTo(18, 4)
  })

  it('treats the identity matrix as frontal', () => {
    const pose = poseFromTransformMatrix(transformMatrix())!
    expect(pose.yaw + pose.pitch + pose.roll).toBeCloseTo(0, 6)
  })

  it('matches the matrix MediaPipe returns for a real near-frontal photo', () => {
    // Column-major data captured from the Face Landmarker for a straight-on portrait (≈ 2° yaw, 4° pitch).
    const data = [
      0.9993921518325806, 0.015447685495018959, -0.03127938508987427, 0, -0.0132959159091115, 0.9976065754890442,
      0.06786875426769257, 0, 0.03225291147828102, -0.06741157919168472, 0.9972044825553894, 0, -0.41, 22.46, -65.44, 1,
    ]
    const pose = poseFromTransformMatrix({ rows: 4, columns: 4, data })!
    expect(pose.yaw).toBeGreaterThan(1)
    expect(pose.yaw).toBeLessThan(3)
    expect(pose.pitch).toBeGreaterThan(3)
    expect(pose.pitch).toBeLessThan(5)
    expect(pose.roll).toBeLessThan(2)
  })

  it('returns null for missing or malformed matrices', () => {
    expect(poseFromTransformMatrix(null)).toBeNull()
    expect(poseFromTransformMatrix(undefined)).toBeNull()
    expect(poseFromTransformMatrix({ rows: 3, columns: 3, data: new Array(9).fill(0) })).toBeNull()
    expect(poseFromTransformMatrix({ rows: 4, columns: 4, data: [1, 2, 3] })).toBeNull()
    expect(poseFromTransformMatrix({ rows: 4, columns: 4, data: new Array(16).fill(Number.NaN) })).toBeNull()
    expect(poseFromTransformMatrix({ rows: 4, columns: 4, data: new Array(16).fill(0) })).toBeNull()
  })
})

describe('poseFromLandmarks (fallback)', () => {
  it('detects a turned head from the depth difference between the face edges', () => {
    const frontal = syntheticLandmarks()
    expect(poseFromLandmarks(frontal, SYNTHETIC_SIZE)!.yaw).toBeCloseTo(0, 6)

    const turned = syntheticLandmarks()
    // Right edge 0.2 W closer to the camera than the left edge, 0.4 W apart horizontally → atan(0.5) ≈ 26.6°
    turned[LM.faceRight] = { ...turned[LM.faceRight]!, z: -0.1 }
    turned[LM.faceLeft] = { ...turned[LM.faceLeft]!, z: 0.1 }
    expect(poseFromLandmarks(turned, SYNTHETIC_SIZE)!.yaw).toBeCloseTo(26.565, 2)
  })

  it('returns null when depth values are missing', () => {
    const landmarks = syntheticLandmarks().map(({ x, y }) => ({ x, y }))
    expect(poseFromLandmarks(landmarks, SYNTHETIC_SIZE)).toBeNull()
  })
})

describe('computeFaceBox', () => {
  it('covers the face outline in pixels', () => {
    const box = computeFaceBox(syntheticLandmarks(), SYNTHETIC_SIZE)!
    expect(box.x0).toBeCloseTo(300, 6)
    expect(box.x1).toBeCloseTo(700, 6)
    expect(box.y0).toBeCloseTo(200, 6)
    expect(box.y1).toBeCloseTo(800, 6)
  })

  it('returns null when too many outline landmarks are unusable', () => {
    const landmarks = syntheticLandmarks().map(() => ({ x: Number.NaN, y: Number.NaN }))
    expect(computeFaceBox(landmarks, SYNTHETIC_SIZE)).toBeNull()
  })
})

describe('computePixelStats', () => {
  const rgba = (width: number, height: number, luma: (x: number, y: number) => number) => {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        data[i] = data[i + 1] = data[i + 2] = luma(x, y)
        data[i + 3] = 255
      }
    return data
  }

  it('reports mean brightness and zero contrast/sharpness for a flat image', () => {
    const stats = computePixelStats(rgba(20, 20, () => 100), 20, 20)!
    expect(stats.meanLuma).toBeCloseTo(100, 6)
    expect(stats.stdLuma).toBeCloseTo(0, 6)
    expect(stats.sharpness).toBeCloseTo(0, 6)
  })

  it('distinguishes a sharp edge from a smooth gradient with the same range', () => {
    const edge = computePixelStats(rgba(40, 40, (x) => (x < 20 ? 40 : 210)), 40, 40)!
    const checker = computePixelStats(rgba(40, 40, (x, y) => ((x + y) % 2 ? 40 : 210)), 40, 40)!
    const gradient = computePixelStats(rgba(40, 40, (x) => 40 + (x / 39) * 170), 40, 40)!
    expect(checker.sharpness).toBeGreaterThan(edge.sharpness)
    expect(edge.sharpness).toBeGreaterThan(gradient.sharpness)
    expect(gradient.sharpness).toBeLessThan(QUALITY_THRESHOLDS.sharpness.warn)
    expect(checker.sharpness).toBeGreaterThan(QUALITY_THRESHOLDS.sharpness.warn)
  })

  it('measures the brightness of the left and right halves', () => {
    const stats = computePixelStats(rgba(20, 10, (x) => (x < 10 ? 60 : 180)), 20, 10)!
    expect(stats.leftMean).toBeCloseTo(60, 6)
    expect(stats.rightMean).toBeCloseTo(180, 6)
  })

  it('returns null for degenerate input', () => {
    expect(computePixelStats(new Uint8ClampedArray(8), 2, 1)).toBeNull()
    expect(computePixelStats(new Uint8ClampedArray(4), 10, 10)).toBeNull()
  })
})

describe('evaluateQuality', () => {
  const goodPixels = { meanLuma: 130, stdLuma: 55, sharpness: 0.05, leftMean: 128, rightMean: 132 }
  const base = {
    landmarks: syntheticLandmarks(),
    size: SYNTHETIC_SIZE,
    pose: { yaw: 2, pitch: 3, roll: 1 },
    pixels: goodPixels,
    expression: { smile: 0.05, jawOpen: 0.02, blink: 0.1 },
  }
  const status = (report: ReturnType<typeof evaluateQuality>, id: string) => report.checks.find((c) => c.id === id)?.status

  it('rates a clean, frontal, well-lit photo as good with no failures', () => {
    const report = evaluateQuality(base)
    expect(report.reliability).toBe('good')
    expect(report.checks.every((c) => c.status === 'pass')).toBe(true)
    expect(failedChecks(report)).toEqual([])
  })

  it.each([
    ['slightly turned', { yaw: 10, pitch: 0, roll: 0 }, 'yaw', 'warn'],
    ['turned too far', { yaw: 25, pitch: 0, roll: 0 }, 'yaw', 'fail'],
    ['chin tipped', { yaw: 0, pitch: 14, roll: 0 }, 'pitch', 'warn'],
    ['head nodding too far', { yaw: 0, pitch: 30, roll: 0 }, 'pitch', 'fail'],
    ['tilted sideways', { yaw: 0, pitch: 0, roll: 20 }, 'roll', 'warn'],
  ] as const)('pose: %s', (_name, pose, id, expected) => {
    expect(status(evaluateQuality({ ...base, pose }), id)).toBe(expected)
  })

  it('never fails the photo only because of sideways tilt (it is corrected for)', () => {
    expect(status(evaluateQuality({ ...base, pose: { yaw: 0, pitch: 0, roll: 40 } }), 'roll')).toBe('warn')
  })

  it('warns when the pose could not be estimated', () => {
    expect(status(evaluateQuality({ ...base, pose: null }), 'yaw')).toBe('warn')
  })

  it('fails a face that is too small and warns for a smallish one', () => {
    const small = syntheticLandmarks({}, (p) => ({ x: 500 + (p.x - 500) * 0.1, y: 500 + (p.y - 500) * 0.1 }))
    expect(status(evaluateQuality({ ...base, landmarks: small }), 'face-size')).toBe('fail')
    const medium = syntheticLandmarks({}, (p) => ({ x: 500 + (p.x - 500) * 0.4, y: 500 + (p.y - 500) * 0.4 }))
    expect(status(evaluateQuality({ ...base, landmarks: medium }), 'face-size')).toBe('warn')
  })

  it('fails a face that is cut off by the image edge', () => {
    const shifted = syntheticLandmarks({}, (p) => ({ x: p.x, y: p.y + 300 }))
    expect(status(evaluateQuality({ ...base, landmarks: shifted }), 'frame')).toBe('fail')
    expect(status(evaluateQuality(base), 'frame')).toBe('pass')
  })

  it.each([
    ['very dark', { ...goodPixels, meanLuma: 20 }, 'brightness', 'fail'],
    ['dim', { ...goodPixels, meanLuma: 50 }, 'brightness', 'warn'],
    ['over-exposed', { ...goodPixels, meanLuma: 225 }, 'brightness', 'warn'],
    ['blown out', { ...goodPixels, meanLuma: 250 }, 'brightness', 'fail'],
    ['flat', { ...goodPixels, stdLuma: 10 }, 'contrast', 'warn'],
    ['blurry', { ...goodPixels, sharpness: 0.004 }, 'sharpness', 'warn'],
    ['side-lit', { ...goodPixels, leftMean: 60, rightMean: 190 }, 'lighting-balance', 'warn'],
  ] as const)('pixels: %s', (_name, pixels, id, expected) => {
    expect(status(evaluateQuality({ ...base, pixels }), id)).toBe(expected)
  })

  it('warns about expressions that change the measurements', () => {
    const smiling = evaluateQuality({ ...base, expression: { smile: 0.9, jawOpen: 0.05, blink: 0 } })
    expect(status(smiling, 'expression')).toBe('warn')
    expect(translate('en', smiling.checks.find((c) => c.id === 'expression')!.detail)).toMatch(/smiling/)
    expect(status(evaluateQuality({ ...base, expression: { smile: 0, jawOpen: 0.5, blink: 0 } }), 'expression')).toBe('warn')
    expect(status(evaluateQuality({ ...base, expression: { smile: 0, jawOpen: 0, blink: 0.9 } }), 'expression')).toBe('warn')
  })

  it('warns about small photos', () => {
    expect(status(evaluateQuality({ ...base, size: { width: 400, height: 300 } }), 'resolution')).toBe('warn')
  })

  it('summarises reliability from the number of warnings and failures', () => {
    expect(summarizeReliability([])).toBe('good')
    const warn = { id: 'a', label: msg('quality.checks.contrast.label'), status: 'warn', detail: msg('quality.checks.contrast.warn') } as const
    const fail = { id: 'b', label: msg('quality.checks.frame.label'), status: 'fail', detail: msg('quality.checks.frame.fail') } as const
    expect(summarizeReliability([warn])).toBe('fair')
    expect(summarizeReliability([warn, warn])).toBe('fair')
    expect(summarizeReliability([warn, warn, warn])).toBe('limited')
    expect(summarizeReliability([fail])).toBe('limited')
  })

  it('skips pixel checks when no pixel statistics are available', () => {
    const report = evaluateQuality({ ...base, pixels: null, expression: null })
    expect(report.checks.find((c) => c.id === 'brightness')).toBeUndefined()
    expect(report.checks.find((c) => c.id === 'expression')).toBeUndefined()
  })
})
