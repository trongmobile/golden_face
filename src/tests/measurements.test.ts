import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'
import { PHI } from '@/features/face-analysis/golden-ratio'
import { LM } from '@/features/face-analysis/landmarks'
import { InvalidLandmarksError, computeMeasurements } from '@/features/face-analysis/measurements'
import type { MetricResult, RatioMetricResult } from '@/types'
import { SYNTHETIC_SIZE, syntheticLandmarks } from './helpers/synthetic-face'

const measure = (...args: Parameters<typeof syntheticLandmarks>) =>
  computeMeasurements(syntheticLandmarks(...args), SYNTHETIC_SIZE)

function metric(metrics: MetricResult[], id: string): MetricResult {
  const found = metrics.find((m) => m.id === id)
  if (!found) throw new Error(`metric ${id} missing`)
  return found
}

function ok(metrics: MetricResult[], id: string): RatioMetricResult {
  const found = metric(metrics, id)
  if (found.status !== 'ok') throw new Error(`metric ${id} was skipped: ${translate('en', found.reason)}`)
  return found
}

describe('computeMeasurements on a synthetic face with known geometry', () => {
  const result = measure()

  it('measures every width and length exactly', () => {
    const { segments } = result
    expect(segments['face-width']?.value).toBeCloseTo(400, 6)
    expect(segments['face-length']?.value).toBeCloseTo(600, 6)
    expect(segments['forehead-width']?.value).toBeCloseTo(300, 6)
    expect(segments['jaw-width']?.value).toBeCloseTo(250, 6)
    expect(segments.interpupillary?.value).toBeCloseTo(180, 6)
    expect(segments.intercanthal?.value).toBeCloseTo(100, 6)
    expect(segments['nose-width']?.value).toBeCloseTo(100, 6)
    expect(segments['mouth-width']?.value).toBeCloseTo(160, 6)
    expect(segments['upper-lip']?.value).toBeCloseTo(20, 6)
    expect(segments['lower-lip']?.value).toBeCloseTo(30, 6)
  })

  it('computes the documented overall ratios', () => {
    expect(ok(result.metrics, 'face-length-width').ratio).toBeCloseTo(1.5, 9)
    expect(ok(result.metrics, 'forehead-cheekbone').ratio).toBeCloseTo(0.75, 9)
    expect(ok(result.metrics, 'cheekbone-jaw').ratio).toBeCloseTo(1.6, 9)
    expect(ok(result.metrics, 'interpupillary-face-width').ratio).toBeCloseTo(0.45, 9)
    expect(ok(result.metrics, 'nose-intercanthal').ratio).toBeCloseTo(1, 9)
    expect(ok(result.metrics, 'mouth-nose').ratio).toBeCloseTo(1.6, 9)
    expect(ok(result.metrics, 'lip-ratio').ratio).toBeCloseTo(1.5, 9)
  })

  it('keeps the raw ratio (A ÷ B) and the normalised ratio (max ÷ min) separate', () => {
    const forehead = ok(result.metrics, 'forehead-cheekbone')
    expect(forehead.ratio).toBeCloseTo(0.75, 9)
    expect(forehead.normalizedRatio).toBeCloseTo(4 / 3, 9)
  })

  it('compares only the golden-eligible ratios with φ', () => {
    const eligible = result.metrics.filter((m) => m.status === 'ok' && m.golden !== null).map((m) => m.id)
    expect(eligible.sort()).toEqual(['face-length-width', 'lip-ratio', 'mouth-nose'])

    const face = ok(result.metrics, 'face-length-width').golden!
    expect(face.ratio).toBeCloseTo(1.5, 9)
    expect(face.error).toBeCloseTo(Math.abs(1.5 - PHI) / PHI, 9)
    expect(face.similarity).toBeCloseTo(100 * Math.exp(-3 * face.error), 6)
    expect(ok(result.metrics, 'cheekbone-jaw').golden).toBeNull()
  })

  it('measures the vertical thirds but skips the hairline-based ones with a clear reason', () => {
    expect(result.segments['middle-third']?.value).toBeCloseTo(250, 6)
    expect(result.segments['lower-third']?.value).toBeCloseTo(250, 6)
    expect(ok(result.metrics, 'third-middle-lower').ratio).toBeCloseTo(1, 9)

    for (const id of ['third-upper-middle', 'third-upper-lower']) {
      const skipped = metric(result.metrics, id)
      expect(skipped.status).toBe('skipped')
      if (skipped.status === 'skipped') expect(translate('en', skipped.reason)).toMatch(/hairline/i)
    }
    expect(result.thirds.upper).toBeNull()
    expect(result.thirds.complete).toBe(false)
    expect(result.thirds.shares.middle).toBeCloseTo(0.5, 9)
    expect(result.hairline.status).toBe('none')
  })

  it('reports no asymmetry for a perfectly symmetric face', () => {
    expect(result.symmetry.pairs.length).toBe(9)
    for (const pair of result.symmetry.pairs) {
      expect(pair.horizontalDeviationPct).toBeCloseTo(0, 6)
      expect(pair.verticalOffsetPct).toBeCloseTo(0, 6)
    }
    expect(result.symmetry.meanHorizontalDeviationPct).toBeCloseTo(0, 6)
    expect(result.symmetry.meanVerticalOffsetPct).toBeCloseTo(0, 6)
    for (const feature of result.symmetry.features) expect(feature.offsetPct).toBeCloseTo(0, 6)
  })

  it('finds the symmetry axis at the face centre', () => {
    expect(result.symmetry.midline).not.toBeNull()
    expect(result.symmetry.midline!.top.x).toBeCloseTo(500, 6)
    expect(result.symmetry.midline!.bottom.x).toBeCloseTo(500, 6)
    expect(result.rollDegrees).toBeCloseTo(0, 6)
  })
})

describe('invariance', () => {
  const baseline = measure()
  const ratios = (r: typeof baseline) =>
    r.metrics.map((m) => (m.status === 'ok' ? Number(m.ratio.toFixed(9)) : m.reason))

  it('does not change when the face is uniformly scaled', () => {
    const scaled = computeMeasurements(
      syntheticLandmarks({}, (p) => ({ x: p.x * 0.4, y: p.y * 0.4 }), SYNTHETIC_SIZE),
      SYNTHETIC_SIZE,
    )
    expect(ratios(scaled)).toEqual(ratios(baseline))
    expect(scaled.segments['face-width']?.value).toBeCloseTo(400 * 0.4, 6)
  })

  it('does not change when the face is translated', () => {
    const moved = measure({}, (p) => ({ x: p.x + 120, y: p.y - 40 }))
    expect(ratios(moved)).toEqual(ratios(baseline))
  })

  it('does not change when the head is tilted in the image plane', () => {
    const angle = (22 * Math.PI) / 180
    const rotate = (p: { x: number; y: number }) => {
      const dx = p.x - 500
      const dy = p.y - 500
      return { x: 500 + dx * Math.cos(angle) - dy * Math.sin(angle), y: 500 + dx * Math.sin(angle) + dy * Math.cos(angle) }
    }
    const tilted = measure({}, rotate)
    expect(ratios(tilted)).toEqual(ratios(baseline))
    expect(Math.abs(tilted.rollDegrees)).toBeCloseTo(22, 4)
    expect(tilted.symmetry.meanHorizontalDeviationPct).toBeCloseTo(0, 6)
  })

  it('converts normalised coordinates with the real image aspect ratio', () => {
    // The same pixel geometry on a 800 × 1200 image must give the same measurements.
    const size = { width: 800, height: 1200 }
    const landmarks = syntheticLandmarks({}, (p) => p, SYNTHETIC_SIZE).map((l) => ({
      x: (l.x * 1000) / size.width,
      y: (l.y * 1000) / size.height,
      z: 0,
    }))
    const result = computeMeasurements(landmarks, size)
    expect(ratios(result)).toEqual(ratios(baseline))
  })
})

describe('asymmetry detection', () => {
  it('reports a wider left mouth corner as a positive horizontal deviation', () => {
    const result = measure({ [LM.mouthCornerLeft]: { x: 500 + 90, y: 620 } })
    const pair = result.symmetry.pairs.find((p) => p.id === 'mouth-corner')!
    expect(pair.horizontalDeviationPct).toBeGreaterThan(0)
    expect(result.symmetry.maxHorizontalDeviationPct).toBeGreaterThan(0)
  })

  it('reports a lower left mouth corner as a positive vertical offset', () => {
    const result = measure({ [LM.mouthCornerLeft]: { x: 580, y: 640 } })
    const pair = result.symmetry.pairs.find((p) => p.id === 'mouth-corner')!
    expect(pair.verticalOffsetPct).toBeCloseTo((20 / 400) * 100, 6)
  })

  it('places the mirrored right-hand point where a perfectly symmetric face would have its left one', () => {
    const result = measure()
    for (const pair of result.symmetry.pairs) {
      expect(pair.mirroredRight.x).toBeCloseTo(pair.left.x, 6)
      expect(pair.mirroredRight.y).toBeCloseTo(pair.left.y, 6)
    }
  })

  it('reports how far a midline feature sits from the axis', () => {
    const result = measure({ [LM.chin]: { x: 540, y: 800 } })
    const chin = result.symmetry.features.find((f) => f.id === 'chin')!
    expect(chin.offsetPct).toBeCloseTo((40 / 400) * 100, 3)
  })
})

describe('user-marked hairline', () => {
  it('adds the upper third and lengthens the face when the hairline is above the brows', () => {
    const result = computeMeasurements(syntheticLandmarks(), SYNTHETIC_SIZE, { hairline: { x: 500, y: 100 } })
    expect(result.hairline.status).toBe('user')
    expect(result.segments['upper-third']?.value).toBeCloseTo(200, 6)
    expect(ok(result.metrics, 'third-upper-middle').ratio).toBeCloseTo(200 / 250, 9)
    expect(ok(result.metrics, 'third-upper-lower').ratio).toBeCloseTo(200 / 250, 9)
    expect(result.thirds.complete).toBe(true)
    expect(result.thirds.shares.upper).toBeCloseTo(200 / 700, 9)
    // face length now runs hairline → chin
    expect(result.segments['face-length']?.value).toBeCloseTo(700, 6)
    expect(ok(result.metrics, 'face-length-width').ratio).toBeCloseTo(700 / 400, 9)
  })

  it('rejects a hairline that is not above the brows, with an explanation', () => {
    const result = computeMeasurements(syntheticLandmarks(), SYNTHETIC_SIZE, { hairline: { x: 500, y: 450 } })
    expect(result.hairline.status).toBe('invalid')
    expect(metric(result.metrics, 'third-upper-middle').status).toBe('skipped')
    expect(result.segments['face-length']?.value).toBeCloseTo(600, 6)
  })

  it('rejects a hairline outside the photo or with invalid numbers', () => {
    const outside = computeMeasurements(syntheticLandmarks(), SYNTHETIC_SIZE, { hairline: { x: 500, y: -20 } })
    expect(outside.hairline.status).toBe('invalid')
    const nan = computeMeasurements(syntheticLandmarks(), SYNTHETIC_SIZE, { hairline: { x: Number.NaN, y: 100 } })
    expect(nan.hairline.status).toBe('invalid')
  })
})

describe('missing or invalid landmarks', () => {
  it('skips only the metrics that need a missing landmark, and names it', () => {
    const result = measure({ [LM.noseWingRight]: null })
    for (const id of ['nose-intercanthal', 'mouth-nose']) {
      const skipped = metric(result.metrics, id)
      expect(skipped.status).toBe('skipped')
      if (skipped.status === 'skipped') expect(translate('en', skipped.reason)).toMatch(/129/)
    }
    expect(metric(result.metrics, 'face-length-width').status).toBe('ok')
    expect(metric(result.metrics, 'cheekbone-jaw').status).toBe('ok')
  })

  it('never produces a ratio or score for a skipped metric', () => {
    const result = measure({ [LM.noseWingRight]: null })
    const skipped = metric(result.metrics, 'mouth-nose')
    expect(skipped).not.toHaveProperty('ratio')
    expect(skipped).not.toHaveProperty('golden')
  })

  it('treats NaN / Infinity / non-number coordinates as missing', () => {
    const landmarks = syntheticLandmarks()
    landmarks[LM.jawLeft] = { x: Number.POSITIVE_INFINITY, y: 0.7 }
    landmarks[LM.faceLeft] = { x: 'x' as unknown as number, y: 0.4 }
    const result = computeMeasurements(landmarks, SYNTHETIC_SIZE)
    expect(metric(result.metrics, 'cheekbone-jaw').status).toBe('skipped')
    expect(metric(result.metrics, 'face-length-width').status).toBe('skipped')
    expect(metric(result.metrics, 'mouth-nose').status).toBe('ok')
  })

  it('skips a ratio whose denominator is zero instead of dividing by it', () => {
    // Both face-edge landmarks on the same x → face width 0.
    const result = measure({ [LM.faceRight]: { x: 500, y: 400 }, [LM.faceLeft]: { x: 500, y: 400 } })
    expect(result.segments['face-width']?.value).toBe(0)
    const skipped = metric(result.metrics, 'face-length-width')
    expect(skipped.status).toBe('skipped')
    if (skipped.status === 'skipped') expect(translate('en', skipped.reason)).toMatch(/zero|invalid/i)
  })

  it('falls back to the eye corners when the iris landmarks are absent', () => {
    const landmarks = syntheticLandmarks().slice(0, 468)
    const result = computeMeasurements(landmarks, SYNTHETIC_SIZE)
    expect(metric(result.metrics, 'face-length-width').status).toBe('ok')
    expect(metric(result.metrics, 'interpupillary-face-width').status).toBe('skipped')
  })

  it('skips the symmetry pairs that cannot be computed and reports them', () => {
    const result = measure({ [LM.jawRight]: null })
    expect(result.symmetry.pairs.find((p) => p.id === 'jaw')).toBeUndefined()
    expect(result.symmetry.skippedPairs.map((p) => p.id)).toContain('jaw')
    expect(result.symmetry.pairs.length).toBe(8)
  })

  it('does not measure the lips when the mouth is open', () => {
    const result = measure({ [LM.lowerLipInner]: { x: 500, y: 660 }, [LM.lowerLipBottom]: { x: 500, y: 690 } })
    const skipped = metric(result.metrics, 'lip-ratio')
    expect(skipped.status).toBe('skipped')
    if (skipped.status === 'skipped') expect(translate('en', skipped.reason)).toMatch(/mouth is open/i)
  })
})

describe('input validation', () => {
  it('throws InvalidLandmarksError when there are too few landmarks', () => {
    expect(() => computeMeasurements(syntheticLandmarks().slice(0, 100), SYNTHETIC_SIZE)).toThrow(InvalidLandmarksError)
    expect(() => computeMeasurements([], SYNTHETIC_SIZE)).toThrow(InvalidLandmarksError)
  })

  it('throws for input that is not an array', () => {
    expect(() => computeMeasurements(null as never, SYNTHETIC_SIZE)).toThrow(InvalidLandmarksError)
    expect(() => computeMeasurements({} as never, SYNTHETIC_SIZE)).toThrow(InvalidLandmarksError)
  })

  it('throws for a non-positive image size', () => {
    const landmarks = syntheticLandmarks()
    expect(() => computeMeasurements(landmarks, { width: 0, height: 100 })).toThrow(InvalidLandmarksError)
    expect(() => computeMeasurements(landmarks, { width: 100, height: Number.NaN })).toThrow(InvalidLandmarksError)
  })

  it('throws when the eyes needed to orient the face are missing or coincide', () => {
    const noEyes = syntheticLandmarks({
      [LM.irisCentreRight]: null,
      [LM.irisCentreLeft]: null,
      [LM.eyeOuterRight]: null,
      [LM.eyeInnerRight]: null,
    })
    expect(() => computeMeasurements(noEyes, SYNTHETIC_SIZE)).toThrow(InvalidLandmarksError)

    const sameSpot = syntheticLandmarks({
      [LM.irisCentreRight]: { x: 500, y: 350 },
      [LM.irisCentreLeft]: { x: 500, y: 350 },
    })
    expect(() => computeMeasurements(sameSpot, SYNTHETIC_SIZE)).toThrow(/coincide/)
  })
})
