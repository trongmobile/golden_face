/**
 * Static description of every measurement: what it means, how it is computed
 * and whether it is compared with the golden ratio at all.
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

export const SEGMENT_LABELS: Record<SegmentId, string> = {
  'face-length': 'Face length',
  'face-width': 'Face (cheekbone) width',
  'forehead-width': 'Forehead width',
  'jaw-width': 'Jaw width',
  interpupillary: 'Interpupillary distance',
  intercanthal: 'Inter-canthal distance',
  'nose-width': 'Nose width',
  'mouth-width': 'Mouth width',
  'upper-lip': 'Upper-lip height',
  'lower-lip': 'Lower-lip height',
  'upper-third': 'Upper third (hairline → brows)',
  'middle-third': 'Middle third (brows → nose base)',
  'lower-third': 'Lower third (nose base → chin)',
}

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
  label: string
  group: MetricGroup
  numerator: SegmentId
  denominator: SegmentId
  /** What the number means, in plain language. */
  meaning: string
  /** Human-readable formula. */
  formula: string
  /** True when a golden-ratio comparison has a recognised geometric basis. */
  goldenEligible: boolean
  /** Why a φ comparison is (or is not) offered. */
  goldenNote: string
  /** Metric-specific limitation worth surfacing next to the number. */
  caveat?: string
}

export const METRIC_CATALOG: readonly MetricDefinition[] = [
  {
    id: 'face-length-width',
    label: 'Face length ÷ face width',
    group: 'overall',
    numerator: 'face-length',
    denominator: 'face-width',
    meaning:
      'How tall the face is compared with how wide it is. A value of about 1.0 is a roughly round face; larger values are longer faces.',
    formula: 'Face length ÷ face width (landmark 10 → 152, divided by landmark 234 ↔ 454)',
    goldenEligible: true,
    goldenNote:
      'A frequently cited "golden face" claim is that the face is about φ times as long as it is wide, so this pair is compared with φ.',
    caveat:
      'Landmark 10 is on the forehead, below the true hairline, so the measured length is shorter than a hairline-to-chin length. Mark your hairline to measure from the hairline instead.',
  },
  {
    id: 'forehead-cheekbone',
    label: 'Forehead width ÷ cheekbone width',
    group: 'overall',
    numerator: 'forehead-width',
    denominator: 'face-width',
    meaning: 'How wide the upper forehead is relative to the widest part of the face.',
    formula: 'Forehead width (landmark 54 ↔ 284) ÷ face width (234 ↔ 454)',
    goldenEligible: false,
    goldenNote: 'There is no recognised golden-ratio claim for this pair, so it is shown as a plain proportion.',
    caveat: 'Hair, hats and the hairline shape affect where the forehead outline is detected.',
  },
  {
    id: 'cheekbone-jaw',
    label: 'Cheekbone width ÷ jaw width',
    group: 'overall',
    numerator: 'face-width',
    denominator: 'jaw-width',
    meaning:
      'How much wider the face is at the cheekbones than at the jaw corners. Its reciprocal (jaw ÷ cheekbone) carries exactly the same information.',
    formula: 'Face width (landmark 234 ↔ 454) ÷ jaw width (172 ↔ 397)',
    goldenEligible: false,
    goldenNote: 'There is no recognised golden-ratio claim for this pair, so it is shown as a plain proportion.',
    caveat: 'Beards, jaw tension, smiling and head tilt change the detected jaw outline.',
  },
  {
    id: 'interpupillary-face-width',
    label: 'Eye distance ÷ face width',
    group: 'overall',
    numerator: 'interpupillary',
    denominator: 'face-width',
    meaning: 'The distance between the pupils compared with the width of the face.',
    formula: 'Interpupillary distance (iris centres 468 ↔ 473) ÷ face width (234 ↔ 454)',
    goldenEligible: false,
    goldenNote:
      'The classical canon for this region is a "five-eye" division, not φ, so it is shown as a plain proportion.',
  },
  {
    id: 'nose-intercanthal',
    label: 'Nose width ÷ eye distance',
    group: 'overall',
    numerator: 'nose-width',
    denominator: 'intercanthal',
    meaning:
      'The width of the nostril wings compared with the gap between the inner corners of the eyes (inter-canthal distance).',
    formula: 'Nose width (landmark 129 ↔ 358) ÷ inter-canthal distance (133 ↔ 362)',
    goldenEligible: false,
    goldenNote:
      'The classical canon for this pair is a ratio of 1 (nose width ≈ inter-canthal distance), not φ, so it is shown as a plain proportion.',
  },
  {
    id: 'mouth-nose',
    label: 'Mouth width ÷ nose width',
    group: 'overall',
    numerator: 'mouth-width',
    denominator: 'nose-width',
    meaning: 'How wide the mouth is compared with the nose.',
    formula: 'Mouth width (landmark 61 ↔ 291) ÷ nose width (129 ↔ 358)',
    goldenEligible: true,
    goldenNote: 'A frequently cited "golden face" claim is that the mouth is about φ times as wide as the nose.',
    caveat: 'Smiling widens the mouth and changes this ratio noticeably. A relaxed, neutral expression is best.',
  },
  {
    id: 'lip-ratio',
    label: 'Lower lip ÷ upper lip height',
    group: 'overall',
    numerator: 'lower-lip',
    denominator: 'upper-lip',
    meaning: 'The height of the lower lip compared with the upper lip, measured with the mouth closed.',
    formula: 'Lower-lip height (landmark 14 → 17) ÷ upper-lip height (0 → 13)',
    goldenEligible: true,
    goldenNote: 'A frequently cited claim is that the lower lip is about φ times as tall as the upper lip.',
    caveat: 'Only measured when the mouth is closed. Lip makeup, smiling and lighting shift the detected lip borders.',
  },
  {
    id: 'third-upper-middle',
    label: 'Upper third ÷ middle third',
    group: 'vertical',
    numerator: 'upper-third',
    denominator: 'middle-third',
    meaning: 'Compares the forehead region with the middle of the face.',
    formula: 'Hairline → brow line ÷ brow line → nose base',
    goldenEligible: false,
    goldenNote: 'The classical canon divides the face into roughly equal thirds (ratio ≈ 1), not φ.',
  },
  {
    id: 'third-middle-lower',
    label: 'Middle third ÷ lower third',
    group: 'vertical',
    numerator: 'middle-third',
    denominator: 'lower-third',
    meaning: 'Compares the brow-to-nose region with the nose-to-chin region.',
    formula: 'Brow line → nose base (landmarks) ÷ nose base (2) → chin (152)',
    goldenEligible: false,
    goldenNote: 'The classical canon divides the face into roughly equal thirds (ratio ≈ 1), not φ.',
    caveat:
      'The brow line is the average height of the eyebrow landmarks, so eyebrow shape and makeup influence it.',
  },
  {
    id: 'third-upper-lower',
    label: 'Upper third ÷ lower third',
    group: 'vertical',
    numerator: 'upper-third',
    denominator: 'lower-third',
    meaning: 'Compares the forehead region with the nose-to-chin region.',
    formula: 'Hairline → brow line ÷ nose base → chin',
    goldenEligible: false,
    goldenNote: 'The classical canon divides the face into roughly equal thirds (ratio ≈ 1), not φ.',
  },
] as const

export const METRIC_BY_ID: Readonly<Record<MetricId, MetricDefinition>> = Object.fromEntries(
  METRIC_CATALOG.map((definition) => [definition.id, definition]),
) as Record<MetricId, MetricDefinition>
