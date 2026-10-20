import type { Msg } from '@/i18n'
import type { GoldenComparison } from '@/features/face-analysis/golden-ratio'
import type { Frame } from '@/features/face-analysis/geometry'
import type { MidlineFeatureId, SymmetryPairId } from '@/features/face-analysis/landmarks'
import type { MetricId, SegmentId } from '@/features/face-analysis/metric-catalog'
import type { ImageSize, Landmark, Point } from './base'

/**
 * A single measured distance, in image pixels. Its name is `metrics.segments.<id>` in the
 * dictionary; analysis results carry ids and `Msg`s, never text in one language.
 */
export interface MeasuredSegment {
  id: SegmentId
  /** Length measured in the face-aligned frame (so head tilt does not change it). */
  value: number
  /** End points of the line that is drawn on the photo. */
  from: Point
  to: Point
  /** Where the measurement comes from, e.g. "Landmarks 234 ↔ 454". */
  source: Msg
  /** Landmark indices that define the segment (drawn as dots). */
  landmarks: number[]
}

export type ValidGoldenComparison = Extract<GoldenComparison, { valid: true }>

export interface RatioMetricResult {
  status: 'ok'
  id: MetricId
  numerator: MeasuredSegment
  denominator: MeasuredSegment
  /** numerator ÷ denominator, exactly as labelled. */
  ratio: number
  /** max ÷ min, always ≥ 1. */
  normalizedRatio: number
  /** Present only for ratios that have a recognised golden-ratio claim. */
  golden: ValidGoldenComparison | null
}

export interface SkippedMetricResult {
  status: 'skipped'
  id: MetricId
  reason: Msg
}

export type MetricResult = RatioMetricResult | SkippedMetricResult

export type LevelId = 'mesh-top' | 'hairline' | 'brow' | 'nose-base' | 'chin'

/** A horizontal reference line across the face (perpendicular to the face axis). Named `metrics.levels.<id>`. */
export interface FaceLevel {
  id: LevelId
  /** Position along the face's vertical axis (frame coordinate). */
  b: number
}

export interface ThirdsSummary {
  upper: number | null
  middle: number | null
  lower: number | null
  /** Share (0–1) of each available third within the sum of the available thirds. */
  shares: { upper: number | null; middle: number | null; lower: number | null }
  complete: boolean
}

export interface SymmetryPairResult {
  /** Named `metrics.symmetryPairs.<id>`. */
  id: SymmetryPairId
  rightLandmark: number
  leftLandmark: number
  right: Point
  left: Point
  /** The right-side point reflected across the midline — compare it with `left`. */
  mirroredRight: Point
  /**
   * (leftDistance − rightDistance) / (leftDistance + rightDistance) × 100, where the
   * distances are measured from the midline. Positive = the subject's left point is farther out.
   */
  horizontalDeviationPct: number
  /** Height difference (left − right) as a percentage of face width. Positive = left is lower. */
  verticalOffsetPct: number
}

export interface MidlineFeatureResult {
  /** Named `metrics.midlineFeatures.<id>`. */
  id: MidlineFeatureId
  point: Point
  /** Signed offset from the midline as a percentage of face width. Positive = toward the subject's left. */
  offsetPct: number
}

export interface SymmetryReport {
  midline: { top: Point; bottom: Point } | null
  pairs: SymmetryPairResult[]
  skippedPairs: { id: SymmetryPairId; reason: Msg }[]
  features: MidlineFeatureResult[]
  meanHorizontalDeviationPct: number | null
  meanVerticalOffsetPct: number | null
  maxHorizontalDeviationPct: number | null
}

export type HairlineState =
  | { status: 'none' }
  | { status: 'user'; point: Point }
  | { status: 'invalid'; reason: Msg }

export interface FaceMeasurements {
  frame: Frame
  /** In-plane head tilt, in degrees. Already compensated for. */
  rollDegrees: number
  /** Position of the symmetry axis along the frame's left/right axis. */
  axisOffset: number
  segments: Partial<Record<SegmentId, MeasuredSegment>>
  skippedSegments: Partial<Record<SegmentId, Msg>>
  levels: FaceLevel[]
  metrics: MetricResult[]
  thirds: ThirdsSummary
  symmetry: SymmetryReport
  hairline: HairlineState
}

export type QualityStatus = 'pass' | 'warn' | 'fail'

export interface QualityCheck {
  id: string
  label: Msg
  status: QualityStatus
  /** Plain-language explanation shown to the user. */
  detail: Msg
}

export type Reliability = 'good' | 'fair' | 'limited'

export interface QualityReport {
  checks: QualityCheck[]
  reliability: Reliability
  /** Head pose in degrees, when it could be estimated. */
  pose: { yaw: number; pitch: number; roll: number } | null
}

export type ConnectionList = [number, number][]

export interface FaceConnections {
  tesselation: ConnectionList
  contours: ConnectionList
  faceOval: ConnectionList
}

export interface AnalysisResult {
  imageSize: ImageSize
  /** 478 normalized landmarks of the analysed face. */
  landmarks: Landmark[]
  /** Measurements computed with no manual input (no hairline). */
  measurements: FaceMeasurements
  quality: QualityReport
  connections: FaceConnections
  model: { name: string; delegate: 'GPU' | 'CPU' }
  analyzedAt: number
}
