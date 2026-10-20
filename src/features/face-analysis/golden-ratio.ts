/**
 * Golden-ratio comparison formulas.
 *
 * All formulas live here (and nowhere in the UI) so they can be tested and
 * audited in isolation.
 *
 *   r          = max(A, B) / min(A, B)          (always ≥ 1)
 *   φ          = 1.6180339887
 *   error      = |r − φ| / φ                    (relative deviation)
 *   similarity = 100 · exp(−k · error)          (0 – 100)
 *
 * `k` only controls how quickly the score falls off. It is a presentation
 * parameter, NOT a medical threshold and NOT a standard of beauty. With the
 * default k = 3 the score is ≈ 74 at a 10 % deviation from φ and ≈ 50 at ~23 %.
 */

/** The golden ratio, φ = (1 + √5) / 2. */
export const PHI = 1.6180339887

/** Default decay constant for the similarity score (see file header). */
export const DEFAULT_SIMILARITY_K = 3

export type GoldenInvalidReason = 'not-finite' | 'non-positive' | 'zero' | 'invalid-k'

export type GoldenComparison =
  | {
      valid: true
      /** Raw inputs as passed in. */
      a: number
      b: number
      /** r = max(A, B) / min(A, B). */
      ratio: number
      reference: number
      /** |r − φ| / φ */
      error: number
      /** 0–100. Geometric similarity to the reference golden ratio. */
      similarity: number
      k: number
    }
  | { valid: false; reason: GoldenInvalidReason; message: string }

const INVALID_MESSAGES: Record<GoldenInvalidReason, string> = {
  'not-finite': 'A measurement is missing or not a finite number.',
  'non-positive': 'Both measurements must be greater than zero.',
  zero: 'One of the measurements is zero, so a ratio cannot be computed.',
  'invalid-k': 'The similarity parameter k must be a finite number ≥ 0.',
}

function invalid(reason: GoldenInvalidReason): GoldenComparison {
  return { valid: false, reason, message: INVALID_MESSAGES[reason] }
}

/** Returns why a pair of measurements cannot form a ratio, or `null` when they can. */
export function validateMeasurementPair(a: unknown, b: unknown): GoldenInvalidReason | null {
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) {
    return 'not-finite'
  }
  if (a === 0 || b === 0) return 'zero'
  if (a < 0 || b < 0) return 'non-positive'
  return null
}

/**
 * r = max(A, B) / min(A, B). Returns `null` for invalid input (NaN, ±Infinity,
 * zero or negative values), including division by zero.
 */
export function normalizedRatio(a: number, b: number): number | null {
  if (validateMeasurementPair(a, b) !== null) return null
  return Math.max(a, b) / Math.min(a, b)
}

/** Relative deviation of a ratio from the reference: |r − φ| / φ. */
export function relativeError(ratio: number, reference: number = PHI): number {
  if (!Number.isFinite(ratio) || !Number.isFinite(reference) || reference <= 0) return Number.NaN
  return Math.abs(ratio - reference) / reference
}

/** similarity = 100 · exp(−k · error). Result is clamped to 0–100. */
export function similarityScore(error: number, k: number = DEFAULT_SIMILARITY_K): number {
  if (!Number.isFinite(error) || error < 0 || !Number.isFinite(k) || k < 0) return Number.NaN
  return Math.min(100, Math.max(0, 100 * Math.exp(-k * error)))
}

/**
 * Full comparison of a measurement pair against the reference golden ratio.
 * Never throws and never fabricates a score: invalid input yields `valid: false`.
 */
export function compareToGolden(
  a: number,
  b: number,
  options: { k?: number; reference?: number } = {},
): GoldenComparison {
  const k = options.k ?? DEFAULT_SIMILARITY_K
  const reference = options.reference ?? PHI
  if (!Number.isFinite(k) || k < 0) return invalid('invalid-k')
  const pairProblem = validateMeasurementPair(a, b)
  if (pairProblem) return invalid(pairProblem)

  const ratio = Math.max(a, b) / Math.min(a, b)
  const error = relativeError(ratio, reference)
  return {
    valid: true,
    a,
    b,
    ratio,
    reference,
    error,
    similarity: similarityScore(error, k),
    k,
  }
}
