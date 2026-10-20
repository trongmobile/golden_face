import { msg, type Msg } from '@/i18n'
import type {
  FaceLevel,
  FaceMeasurements,
  HairlineState,
  ImageSize,
  Landmark,
  MeasuredSegment,
  MetricResult,
  Point,
  SymmetryPairResult,
  SymmetryReport,
  ThirdsSummary,
} from '@/types'
import { compareToGolden, DEFAULT_SIMILARITY_K, normalizedRatio, validateMeasurementPair } from './golden-ratio'
import {
  createFrame,
  frameRollDegrees,
  fromFrame,
  mean,
  median,
  toFrame,
  type Frame,
  type FramePoint,
} from './geometry'
import {
  BROW_LANDMARKS,
  FACE_MESH_LANDMARK_COUNT,
  LM,
  MIDLINE_FEATURES,
  SYMMETRY_PAIRS,
} from './landmarks'
import { METRIC_CATALOG, type SegmentId } from './metric-catalog'

export class InvalidLandmarksError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLandmarksError'
  }
}

export interface MeasurementOptions {
  /**
   * A hairline position that the USER marked on the photo (image pixels).
   * The model cannot locate the hairline, so it is never guessed.
   */
  hairline?: Point | null
  /** Decay constant for the similarity score. */
  k?: number
}

/** Mouth is treated as "open" when the inner-lip gap exceeds this share of the mouth width. */
export const LIP_OPENING_MAX_RATIO = 0.06

/** The brow line needs at least this many of the 20 eyebrow landmarks to be valid. */
const MIN_BROW_POINTS = 10

interface Level {
  b: number
  a: number
  source: Msg
  landmarks: number[]
}

type SegmentOutcome = { ok: true; segment: MeasuredSegment } | { ok: false; reason: Msg }

function isUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readPoint(landmarks: readonly Landmark[], index: number, size: ImageSize): Point | null {
  const landmark = landmarks[index]
  if (!landmark || !isUsableNumber(landmark.x) || !isUsableNumber(landmark.y)) return null
  return { x: landmark.x * size.width, y: landmark.y * size.height }
}

function validateInput(landmarks: unknown, size: ImageSize): asserts landmarks is readonly Landmark[] {
  if (!Array.isArray(landmarks)) {
    throw new InvalidLandmarksError('Landmarks must be an array.')
  }
  if (landmarks.length < FACE_MESH_LANDMARK_COUNT) {
    throw new InvalidLandmarksError(
      `Expected at least ${FACE_MESH_LANDMARK_COUNT} landmarks but received ${landmarks.length}.`,
    )
  }
  if (!size || !isUsableNumber(size.width) || !isUsableNumber(size.height) || size.width <= 0 || size.height <= 0) {
    throw new InvalidLandmarksError('Image size must be positive.')
  }
}

const missing = (...indices: number[]): Msg =>
  msg(indices.length > 1 ? 'metrics.reasons.missingMany' : 'metrics.reasons.missingOne', { landmarks: indices.join(' / ') })

const landmarkSource = (index: number): Msg => msg('metrics.source.landmark', { index })

/**
 * Computes every measurement for one face from its landmarks.
 *
 * Coordinates are converted to image pixels (so x and y share one scale) and
 * then expressed in a face-aligned frame, which makes every distance
 * independent of in-plane head tilt, image size and translation.
 *
 * Throws `InvalidLandmarksError` when the landmark set is unusable. Individual
 * measurements whose landmarks are missing are reported as `skipped`, with a
 * reason, instead of being guessed.
 */
export function computeMeasurements(
  landmarksInput: readonly Landmark[],
  size: ImageSize,
  options: MeasurementOptions = {},
): FaceMeasurements {
  validateInput(landmarksInput, size)
  const landmarks = landmarksInput
  const k = options.k ?? DEFAULT_SIMILARITY_K

  const pt = (index: number) => readPoint(landmarks, index, size)

  // ── Face-aligned frame, from the pupils (falls back to the eye corners) ──
  const rightEye = pt(LM.irisCentreRight) ?? midpointOf(pt(LM.eyeOuterRight), pt(LM.eyeInnerRight))
  const leftEye = pt(LM.irisCentreLeft) ?? midpointOf(pt(LM.eyeInnerLeft), pt(LM.eyeOuterLeft))
  if (!rightEye || !leftEye) {
    throw new InvalidLandmarksError('The eye landmarks needed to orient the face are missing.')
  }
  const frame = createFrame(rightEye, leftEye)
  if (!frame) {
    throw new InvalidLandmarksError('The eye landmarks coincide, so the face cannot be oriented.')
  }
  const fp = (index: number): FramePoint | null => {
    const point = pt(index)
    return point ? toFrame(frame, point) : null
  }

  // ── Symmetry axis position: median midpoint of the left/right pairs ──
  const pairFrames = SYMMETRY_PAIRS.map((pair) => ({ pair, r: fp(pair.right), l: fp(pair.left) }))
  const midpoints = pairFrames.flatMap(({ r, l }) => (r && l ? [(r.a + l.a) / 2] : []))
  const axisOffset = midpoints.length > 0 ? median(midpoints) : 0

  // ── Levels (horizontal reference lines) ──
  const levelFromLandmark = (index: number): Level | null => {
    const f = fp(index)
    return f ? { a: f.a, b: f.b, source: landmarkSource(index), landmarks: [index] } : null
  }
  const meshTop = levelFromLandmark(LM.meshTop)
  const noseBase = levelFromLandmark(LM.noseBase)
  const chin = levelFromLandmark(LM.chin)
  const brow = browLevel(fp)

  // ── Hairline: only ever supplied by the user, never estimated ──
  const hairlineState = resolveHairline(options.hairline, frame, size, brow?.b ?? null)
  const hairlineLevel: Level | null =
    hairlineState.status === 'user' ? levelFromPoint(frame, hairlineState.point, msg('metrics.source.markedHairline')) : null

  // ── Segments ──
  const segments: Partial<Record<SegmentId, MeasuredSegment>> = {}
  const skippedSegments: Partial<Record<SegmentId, Msg>> = {}
  const record = (id: SegmentId, outcome: SegmentOutcome) => {
    if (outcome.ok) segments[id] = outcome.segment
    else skippedSegments[id] = outcome.reason
  }

  const width = (id: SegmentId, right: number, left: number): SegmentOutcome => {
    const p = fp(right)
    const q = fp(left)
    if (!p || !q) return { ok: false, reason: missing(right, left) }
    const bMid = (p.b + q.b) / 2
    return {
      ok: true,
      segment: {
        id,
        value: Math.abs(q.a - p.a),
        from: fromFrame(frame, p.a, bMid),
        to: fromFrame(frame, q.a, bMid),
        source: msg('metrics.source.landmarks', { right, left }),
        landmarks: [right, left],
      },
    }
  }

  const vertical = (id: SegmentId, top: Level | null, bottom: Level | null, reason: Msg): SegmentOutcome => {
    if (!top || !bottom) return { ok: false, reason }
    return {
      ok: true,
      segment: {
        id,
        value: Math.abs(bottom.b - top.b),
        from: fromFrame(frame, axisOffset, top.b),
        to: fromFrame(frame, axisOffset, bottom.b),
        source: msg('metrics.source.range', { from: top.source, to: bottom.source }),
        landmarks: [...top.landmarks, ...bottom.landmarks],
      },
    }
  }

  const lipHeight = (id: SegmentId, topIndex: number, bottomIndex: number): SegmentOutcome =>
    vertical(id, levelFromLandmark(topIndex), levelFromLandmark(bottomIndex), missing(topIndex, bottomIndex))

  // Face length starts at the user-marked hairline when there is one, otherwise at the mesh top.
  const faceTop = hairlineLevel ?? meshTop
  record('face-length', vertical('face-length', faceTop, chin, missing(LM.meshTop, LM.chin)))
  record('face-width', width('face-width', LM.faceRight, LM.faceLeft))
  record('forehead-width', width('forehead-width', LM.foreheadRight, LM.foreheadLeft))
  record('jaw-width', width('jaw-width', LM.jawRight, LM.jawLeft))
  record('nose-width', width('nose-width', LM.noseWingRight, LM.noseWingLeft))
  record('mouth-width', width('mouth-width', LM.mouthCornerRight, LM.mouthCornerLeft))
  record('intercanthal', width('intercanthal', LM.eyeInnerRight, LM.eyeInnerLeft))

  // Interpupillary distance: iris centres when available (always true for the 478-point model).
  const irisRight = fp(LM.irisCentreRight)
  const irisLeft = fp(LM.irisCentreLeft)
  if (irisRight && irisLeft) {
    record('interpupillary', width('interpupillary', LM.irisCentreRight, LM.irisCentreLeft))
  } else {
    skippedSegments.interpupillary = msg('metrics.reasons.irisUnavailable')
  }

  // Lips: only valid with the mouth closed.
  const lipGap = (() => {
    const inner13 = fp(LM.upperLipInner)
    const inner14 = fp(LM.lowerLipInner)
    return inner13 && inner14 ? inner14.b - inner13.b : null
  })()
  const mouthWidthValue = segments['mouth-width']?.value
  const mouthOpen =
    lipGap !== null &&
    mouthWidthValue !== undefined &&
    mouthWidthValue > 0 &&
    lipGap / mouthWidthValue > LIP_OPENING_MAX_RATIO
  if (mouthOpen) {
    const reason = msg('metrics.reasons.mouthOpen')
    skippedSegments['upper-lip'] = reason
    skippedSegments['lower-lip'] = reason
  } else {
    record('upper-lip', lipHeight('upper-lip', LM.upperLipTop, LM.upperLipInner))
    record('lower-lip', lipHeight('lower-lip', LM.lowerLipInner, LM.lowerLipBottom))
  }

  // Vertical thirds.
  const upperReason =
    hairlineState.status === 'invalid'
      ? hairlineState.reason
      : msg('metrics.reasons.hairlineNotEstimated')
  record('upper-third', vertical('upper-third', hairlineLevel, brow, upperReason))
  record(
    'middle-third',
    vertical('middle-third', brow, noseBase, msg('metrics.reasons.browOrNoseMissing')),
  )
  record('lower-third', vertical('lower-third', noseBase, chin, missing(LM.noseBase, LM.chin)))

  // ── Ratio metrics ──
  const metrics: MetricResult[] = METRIC_CATALOG.map((definition): MetricResult => {
    const numerator = segments[definition.numerator]
    const denominator = segments[definition.denominator]
    if (!numerator || !denominator) {
      const reason =
        skippedSegments[definition.numerator] ??
        skippedSegments[definition.denominator] ??
        msg('metrics.reasons.requiredMissing')
      return { status: 'skipped', id: definition.id, reason }
    }

    const problem = validateMeasurementPair(numerator.value, denominator.value)
    const ratio = normalizedRatio(numerator.value, denominator.value)
    if (problem !== null || ratio === null) {
      return {
        status: 'skipped',
        id: definition.id,
        reason: msg('metrics.reasons.zeroOrInvalid'),
      }
    }

    const comparison = definition.goldenEligible ? compareToGolden(numerator.value, denominator.value, { k }) : null
    return {
      status: 'ok',
      id: definition.id,
      numerator,
      denominator,
      ratio: numerator.value / denominator.value,
      normalizedRatio: ratio,
      golden: comparison && comparison.valid ? comparison : null,
    }
  })

  // ── Levels for drawing ──
  const levels: FaceLevel[] = []
  if (hairlineLevel) levels.push({ id: 'hairline', b: hairlineLevel.b })
  if (brow) levels.push({ id: 'brow', b: brow.b })
  if (noseBase) levels.push({ id: 'nose-base', b: noseBase.b })
  if (chin) levels.push({ id: 'chin', b: chin.b })

  return {
    frame,
    rollDegrees: frameRollDegrees(frame),
    axisOffset,
    segments,
    skippedSegments,
    levels,
    metrics,
    thirds: summarizeThirds(segments),
    symmetry: computeSymmetry({
      frame,
      fp,
      pairFrames,
      axisOffset,
      faceWidth: segments['face-width']?.value ?? null,
      topB: faceTop?.b ?? null,
      chinB: chin?.b ?? null,
    }),
    hairline: hairlineState,
  }
}

function midpointOf(p: Point | null, q: Point | null): Point | null {
  return p && q ? { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } : null
}

function levelFromPoint(frame: Frame, point: Point, source: Msg): Level {
  const f = toFrame(frame, point)
  return { a: f.a, b: f.b, source, landmarks: [] }
}

function browLevel(fp: (index: number) => FramePoint | null): Level | null {
  const points = BROW_LANDMARKS.flatMap((index) => {
    const f = fp(index)
    return f ? [f] : []
  })
  if (points.length < MIN_BROW_POINTS) return null
  return {
    a: mean(points.map((p) => p.a)),
    b: mean(points.map((p) => p.b)),
    source: msg('metrics.source.browLine'),
    landmarks: [LM.browOuterRight, LM.browPeakRight, LM.browPeakLeft, LM.browOuterLeft],
  }
}

function resolveHairline(
  hairline: Point | null | undefined,
  frame: Frame,
  size: ImageSize,
  browB: number | null,
): HairlineState {
  if (!hairline) return { status: 'none' }
  if (!isUsableNumber(hairline.x) || !isUsableNumber(hairline.y)) {
    return { status: 'invalid', reason: msg('metrics.reasons.hairlineInvalid') }
  }
  const inside = hairline.x >= 0 && hairline.y >= 0 && hairline.x <= size.width && hairline.y <= size.height
  if (!inside) return { status: 'invalid', reason: msg('metrics.reasons.hairlineOutside') }
  // "Above" is measured along the face's own vertical axis, so a tilted head is handled correctly.
  const b = toFrame(frame, hairline).b
  if (browB === null || b >= browB) {
    return { status: 'invalid', reason: msg('metrics.reasons.hairlineBelowBrows') }
  }
  return { status: 'user', point: hairline }
}

function summarizeThirds(segments: Partial<Record<SegmentId, MeasuredSegment>>): ThirdsSummary {
  const upper = segments['upper-third']?.value ?? null
  const middle = segments['middle-third']?.value ?? null
  const lower = segments['lower-third']?.value ?? null
  const available = [upper, middle, lower].filter((value): value is number => value !== null)
  const total = available.reduce((sum, value) => sum + value, 0)
  const share = (value: number | null) => (value !== null && total > 0 ? value / total : null)
  return {
    upper,
    middle,
    lower,
    shares: { upper: share(upper), middle: share(middle), lower: share(lower) },
    complete: available.length === 3,
  }
}

interface SymmetryInput {
  frame: Frame
  fp: (index: number) => FramePoint | null
  pairFrames: { pair: (typeof SYMMETRY_PAIRS)[number]; r: FramePoint | null; l: FramePoint | null }[]
  axisOffset: number
  faceWidth: number | null
  topB: number | null
  chinB: number | null
}

function computeSymmetry({ frame, fp, pairFrames, axisOffset, faceWidth, topB, chinB }: SymmetryInput): SymmetryReport {
  const pairs: SymmetryPairResult[] = []
  const skippedPairs: SymmetryReport['skippedPairs'] = []

  for (const { pair, r, l } of pairFrames) {
    if (!r || !l) {
      skippedPairs.push({ id: pair.id, reason: missing(pair.right, pair.left) })
      continue
    }
    const rightDistance = axisOffset - r.a
    const leftDistance = l.a - axisOffset
    const span = rightDistance + leftDistance
    if (!(span > 0)) {
      skippedPairs.push({ id: pair.id, reason: msg('metrics.reasons.pairOverlap') })
      continue
    }
    const verticalReference = faceWidth && faceWidth > 0 ? faceWidth : span
    pairs.push({
      id: pair.id,
      rightLandmark: pair.right,
      leftLandmark: pair.left,
      right: fromFrame(frame, r.a, r.b),
      left: fromFrame(frame, l.a, l.b),
      mirroredRight: fromFrame(frame, 2 * axisOffset - r.a, r.b),
      horizontalDeviationPct: ((leftDistance - rightDistance) / span) * 100,
      verticalOffsetPct: ((l.b - r.b) / verticalReference) * 100,
    })
  }

  const features = MIDLINE_FEATURES.flatMap((feature) => {
    const f = fp(feature.index)
    if (!f || !faceWidth || faceWidth <= 0) return []
    return [
      {
        id: feature.id,
        point: fromFrame(frame, f.a, f.b),
        offsetPct: ((f.a - axisOffset) / faceWidth) * 100,
      },
    ]
  })

  const midline =
    topB !== null && chinB !== null
      ? (() => {
          const pad = Math.abs(chinB - topB) * 0.05
          return { top: fromFrame(frame, axisOffset, topB - pad), bottom: fromFrame(frame, axisOffset, chinB + pad) }
        })()
      : null

  const absHorizontal = pairs.map((pair) => Math.abs(pair.horizontalDeviationPct))
  const absVertical = pairs.map((pair) => Math.abs(pair.verticalOffsetPct))
  return {
    midline,
    pairs,
    skippedPairs,
    features,
    meanHorizontalDeviationPct: absHorizontal.length ? mean(absHorizontal) : null,
    meanVerticalOffsetPct: absVertical.length ? mean(absVertical) : null,
    maxHorizontalDeviationPct: absHorizontal.length ? Math.max(...absHorizontal) : null,
  }
}
