/**
 * Static description of every measurement: which two segments form it and whether it is
 * compared with the golden ratio at all. Its name, meaning, formula and notes are text, so
 * they live in the dictionary (`metrics.items.<id>.*`, `metrics.segments.<id>`).
 *
 * Only ratios with a clear geometric meaning AND a commonly cited golden-ratio
 * claim are flagged `goldenEligible`. All other ratios are reported as plain
 * proportions without a φ comparison — facial proportions are not supposed to
 * equal 1.618, and this tool does not pretend they are.
 */

export type SegmentId =
  | 'face-length'
  | 'face-width'
  | 'forehead-width'
  | 'jaw-width'
  | 'interpupillary'
  | 'intercanthal'
  | 'nose-width'
  | 'mouth-width'
  | 'upper-lip'
  | 'lower-lip'
  | 'upper-third'
  | 'middle-third'
  | 'lower-third'

export type MetricId =
  | 'face-length-width'
  | 'forehead-cheekbone'
  | 'cheekbone-jaw'
  | 'interpupillary-face-width'
  | 'nose-intercanthal'
  | 'mouth-nose'
  | 'lip-ratio'
  | 'third-upper-middle'
  | 'third-middle-lower'
  | 'third-upper-lower'

export type MetricGroup = 'overall' | 'vertical'

export interface MetricDefinition {
  id: MetricId
  group: MetricGroup
  numerator: SegmentId
  denominator: SegmentId
  /** True when a golden-ratio comparison has a recognised geometric basis. */
  goldenEligible: boolean
  /** True when `metrics.items.<id>.caveat` exists: a limitation worth surfacing next to the number. */
  hasCaveat: boolean
}

export const METRIC_CATALOG: readonly MetricDefinition[] = [
  { id: 'face-length-width', group: 'overall', numerator: 'face-length', denominator: 'face-width', goldenEligible: true, hasCaveat: true },
  { id: 'forehead-cheekbone', group: 'overall', numerator: 'forehead-width', denominator: 'face-width', goldenEligible: false, hasCaveat: true },
  { id: 'cheekbone-jaw', group: 'overall', numerator: 'face-width', denominator: 'jaw-width', goldenEligible: false, hasCaveat: true },
  { id: 'interpupillary-face-width', group: 'overall', numerator: 'interpupillary', denominator: 'face-width', goldenEligible: false, hasCaveat: false },
  { id: 'nose-intercanthal', group: 'overall', numerator: 'nose-width', denominator: 'intercanthal', goldenEligible: false, hasCaveat: false },
  { id: 'mouth-nose', group: 'overall', numerator: 'mouth-width', denominator: 'nose-width', goldenEligible: true, hasCaveat: true },
  { id: 'lip-ratio', group: 'overall', numerator: 'lower-lip', denominator: 'upper-lip', goldenEligible: true, hasCaveat: true },
  { id: 'third-upper-middle', group: 'vertical', numerator: 'upper-third', denominator: 'middle-third', goldenEligible: false, hasCaveat: false },
  { id: 'third-middle-lower', group: 'vertical', numerator: 'middle-third', denominator: 'lower-third', goldenEligible: false, hasCaveat: true },
  { id: 'third-upper-lower', group: 'vertical', numerator: 'upper-third', denominator: 'lower-third', goldenEligible: false, hasCaveat: false },
] as const

export const METRIC_BY_ID: Readonly<Record<MetricId, MetricDefinition>> = Object.fromEntries(
  METRIC_CATALOG.map((definition) => [definition.id, definition]),
) as Record<MetricId, MetricDefinition>
