import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIMILARITY_K,
  PHI,
  compareToGolden,
  normalizedRatio,
  relativeError,
  similarityScore,
  validateMeasurementPair,
} from '@/features/face-analysis/golden-ratio'

describe('PHI', () => {
  it('is (1 + √5) / 2 to ten decimals', () => {
    expect(PHI).toBeCloseTo((1 + Math.sqrt(5)) / 2, 9)
    expect(PHI).toBe(1.6180339887)
  })
})

describe('normalizedRatio  r = max(A, B) / min(A, B)', () => {
  it('divides the larger by the smaller regardless of argument order', () => {
    expect(normalizedRatio(3, 2)).toBeCloseTo(1.5, 12)
    expect(normalizedRatio(2, 3)).toBeCloseTo(1.5, 12)
  })

  it('is exactly 1 for equal measurements', () => {
    expect(normalizedRatio(7.25, 7.25)).toBe(1)
  })

  it('is scale-invariant', () => {
    expect(normalizedRatio(300, 200)).toBeCloseTo(normalizedRatio(3, 2)!, 12)
  })

  it('returns null when either value is zero (no division by zero)', () => {
    expect(normalizedRatio(0, 5)).toBeNull()
    expect(normalizedRatio(5, 0)).toBeNull()
    expect(normalizedRatio(0, 0)).toBeNull()
  })

  it('returns null for negative numbers', () => {
    expect(normalizedRatio(-1, 2)).toBeNull()
    expect(normalizedRatio(2, -1)).toBeNull()
  })

  it('returns null for NaN and ±Infinity', () => {
    expect(normalizedRatio(Number.NaN, 1)).toBeNull()
    expect(normalizedRatio(1, Number.POSITIVE_INFINITY)).toBeNull()
    expect(normalizedRatio(Number.NEGATIVE_INFINITY, 1)).toBeNull()
  })
})

describe('validateMeasurementPair', () => {
  it('names the reason a pair is invalid', () => {
    expect(validateMeasurementPair(1, 2)).toBeNull()
    expect(validateMeasurementPair(0, 2)).toBe('zero')
    expect(validateMeasurementPair(-1, 2)).toBe('non-positive')
    expect(validateMeasurementPair(Number.NaN, 2)).toBe('not-finite')
    expect(validateMeasurementPair('1' as unknown as number, 2)).toBe('not-finite')
    expect(validateMeasurementPair(undefined, 2)).toBe('not-finite')
  })
})

describe('relativeError  |r − φ| / φ', () => {
  it('is zero at φ exactly', () => {
    expect(relativeError(PHI)).toBe(0)
  })

  it('is symmetric around φ in absolute terms', () => {
    expect(relativeError(PHI + 0.1)).toBeCloseTo(relativeError(PHI - 0.1), 12)
  })

  it('measures the deviation relative to φ', () => {
    // r = 1 → |1 − φ| / φ = 1 / φ² ≈ 0.381966
    expect(relativeError(1)).toBeCloseTo(0.3819660113, 9)
    expect(relativeError(2)).toBeCloseTo((2 - PHI) / PHI, 12)
  })

  it('accepts a custom reference', () => {
    expect(relativeError(1.5, 1.5)).toBe(0)
    expect(relativeError(3, 2)).toBeCloseTo(0.5, 12)
  })

  it('is NaN for invalid input', () => {
    expect(relativeError(Number.NaN)).toBeNaN()
    expect(relativeError(1, 0)).toBeNaN()
    expect(relativeError(1, -1)).toBeNaN()
  })
})

describe('similarityScore  100 · exp(−k · error)', () => {
  it('is 100 with no error', () => {
    expect(similarityScore(0)).toBe(100)
  })

  it('decreases monotonically as the error grows', () => {
    const scores = [0, 0.05, 0.1, 0.2, 0.4, 0.8].map((error) => similarityScore(error))
    for (let i = 1; i < scores.length; i++) expect(scores[i]!).toBeLessThan(scores[i - 1]!)
  })

  it('matches the documented formula for the default k', () => {
    expect(DEFAULT_SIMILARITY_K).toBe(3)
    expect(similarityScore(0.1)).toBeCloseTo(100 * Math.exp(-0.3), 9) // ≈ 74.08
    expect(similarityScore(Math.LN2 / 3)).toBeCloseTo(50, 9)
  })

  it('uses a custom k', () => {
    expect(similarityScore(0.1, 0)).toBe(100)
    expect(similarityScore(0.1, 10)).toBeCloseTo(100 * Math.exp(-1), 9)
  })

  it('stays within 0–100', () => {
    expect(similarityScore(1e9)).toBeGreaterThanOrEqual(0)
    expect(similarityScore(1e9)).toBeLessThanOrEqual(100)
  })

  it('is NaN for a negative error, NaN error or an invalid k', () => {
    expect(similarityScore(-0.1)).toBeNaN()
    expect(similarityScore(Number.NaN)).toBeNaN()
    expect(similarityScore(0.1, -1)).toBeNaN()
    expect(similarityScore(0.1, Number.POSITIVE_INFINITY)).toBeNaN()
  })
})

describe('compareToGolden', () => {
  it('scores a pair that is exactly φ as a perfect match', () => {
    const result = compareToGolden(PHI, 1)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.ratio).toBeCloseTo(PHI, 12)
      expect(result.error).toBeCloseTo(0, 12)
      expect(result.similarity).toBeCloseTo(100, 9)
      expect(result.reference).toBe(PHI)
      expect(result.k).toBe(DEFAULT_SIMILARITY_K)
    }
  })

  it('gives identical results when the pair is swapped', () => {
    const a = compareToGolden(1.3, 1)
    const b = compareToGolden(1, 1.3)
    expect(a.valid && b.valid).toBe(true)
    if (a.valid && b.valid) {
      expect(a.ratio).toBeCloseTo(b.ratio, 12)
      expect(a.similarity).toBeCloseTo(b.similarity, 12)
    }
  })

  it('combines ratio, error and similarity for an arbitrary pair', () => {
    const result = compareToGolden(1.5, 1)
    expect(result.valid).toBe(true)
    if (result.valid) {
      const error = Math.abs(1.5 - PHI) / PHI
      expect(result.error).toBeCloseTo(error, 12)
      expect(result.similarity).toBeCloseTo(100 * Math.exp(-3 * error), 9)
    }
  })

  it('honours custom k and reference', () => {
    const result = compareToGolden(2, 1, { k: 1, reference: 2 })
    expect(result.valid && result.similarity).toBe(100)
    const strict = compareToGolden(1.3, 1, { k: 10 })
    const lenient = compareToGolden(1.3, 1, { k: 1 })
    expect(strict.valid && lenient.valid).toBe(true)
    if (strict.valid && lenient.valid) expect(strict.similarity).toBeLessThan(lenient.similarity)
  })

  it.each([
    ['zero numerator', 0, 1, 'zero'],
    ['zero denominator (divide by zero)', 1, 0, 'zero'],
    ['both zero', 0, 0, 'zero'],
    ['negative', -2, 1, 'non-positive'],
    ['NaN', Number.NaN, 1, 'not-finite'],
    ['Infinity', 1, Number.POSITIVE_INFINITY, 'not-finite'],
  ] as const)('never fabricates a score for %s', (_name, a, b, reason) => {
    const result = compareToGolden(a, b)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe(reason)
      expect(result.message.length).toBeGreaterThan(10)
    }
    expect(JSON.stringify(result)).not.toMatch(/similarity/)
  })

  it('rejects an invalid k', () => {
    const result = compareToGolden(1.5, 1, { k: -2 })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('invalid-k')
  })
})
