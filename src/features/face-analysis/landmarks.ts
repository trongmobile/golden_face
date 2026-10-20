/**
 * MediaPipe Face Landmarker index map.
 *
 * The model outputs 478 points: 468 face-mesh points + 10 iris points.
 * "Right"/"left" refer to the SUBJECT's right/left, so the subject's right eye
 * is on the viewer's left in an un-mirrored photo.
 *
 * Every index below was checked visually against real model output.
 */

export const FACE_MESH_LANDMARK_COUNT = 468
export const FACE_MESH_WITH_IRIS_COUNT = 478

export const LM = {
  /** Top-centre of the face mesh. NOT the hairline: it sits on the forehead. */
  meshTop: 10,
  /** Between the eyebrows (nasion area). */
  glabella: 168,
  noseTip: 1,
  /** Base of the nose / subnasale, where the nose meets the upper lip. */
  noseBase: 2,
  /** Centre of the upper-lip outer (vermilion) border. */
  upperLipTop: 0,
  /** Inner edge of the upper lip (stomion superius). */
  upperLipInner: 13,
  /** Inner edge of the lower lip (stomion inferius). */
  lowerLipInner: 14,
  /** Bottom of the lower-lip outer border. */
  lowerLipBottom: 17,
  /** Lowest point of the chin (menton). */
  chin: 152,

  /** Widest points of the face outline, level with the cheekbones / ear front. */
  faceRight: 234,
  faceLeft: 454,
  foreheadRight: 54,
  foreheadLeft: 284,
  jawRight: 172,
  jawLeft: 397,

  noseWingRight: 129,
  noseWingLeft: 358,
  mouthCornerRight: 61,
  mouthCornerLeft: 291,

  eyeOuterRight: 33,
  eyeInnerRight: 133,
  eyeInnerLeft: 362,
  eyeOuterLeft: 263,
  irisCentreRight: 468,
  irisCentreLeft: 473,

  browOuterRight: 46,
  browOuterLeft: 276,
  browPeakRight: 105,
  browPeakLeft: 334,
} as const

/** All points of the right (viewer-left) and left (viewer-right) eyebrows. */
export const BROW_LANDMARKS_RIGHT = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107] as const
export const BROW_LANDMARKS_LEFT = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336] as const
export const BROW_LANDMARKS = [...BROW_LANDMARKS_RIGHT, ...BROW_LANDMARKS_LEFT] as const

/** Left/right landmark pairs used for the geometric symmetry analysis. */
export const SYMMETRY_PAIRS = [
  { id: 'forehead', right: 54, left: 284 },
  { id: 'brow-outer', right: 46, left: 276 },
  { id: 'brow-peak', right: 105, left: 334 },
  { id: 'eye-outer', right: 33, left: 263 },
  { id: 'eye-inner', right: 133, left: 362 },
  { id: 'cheekbone', right: 234, left: 454 },
  { id: 'nose-wing', right: 129, left: 358 },
  { id: 'mouth-corner', right: 61, left: 291 },
  { id: 'jaw', right: 172, left: 397 },
] as const

export type SymmetryPairId = (typeof SYMMETRY_PAIRS)[number]['id']

/** Points on (or near) the facial midline, checked for offset from the symmetry axis. */
export const MIDLINE_FEATURES = [
  { id: 'glabella', index: 168 },
  { id: 'nose-tip', index: 1 },
  { id: 'upper-lip', index: 0 },
  { id: 'chin', index: 152 },
] as const

export type MidlineFeatureId = (typeof MIDLINE_FEATURES)[number]['id']

/** Face-outline points, used to compute the face bounding box for quality checks. */
export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149,
  150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const

export type LandmarkPair = readonly [number, number]
