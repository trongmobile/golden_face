import type { Landmark } from '@/types'
import { BROW_LANDMARKS_LEFT, BROW_LANDMARKS_RIGHT, FACE_MESH_WITH_IRIS_COUNT, LM } from '@/features/face-analysis/landmarks'

/**
 * A procedurally generated, perfectly symmetric face used to test the maths with known answers.
 * Coordinates are in image PIXELS (before normalisation) on a 1000 × 1000 canvas.
 *
 *   face width  (234 ↔ 454)  = 400      face length (10 → 152)   = 600
 *   forehead    (54 ↔ 284)   = 300      jaw        (172 ↔ 397)  = 250
 *   pupils      (468 ↔ 473)  = 180      inter-canthal (133↔362) = 100
 *   nose        (129 ↔ 358)  = 100      mouth      (61 ↔ 291)   = 160
 *   brow line y=300, eyes y=350, nose base y=550, chin y=800, mesh top y=200
 *   upper lip 0→13 = 20,  lower lip 14→17 = 30
 */
export const SYNTHETIC_SIZE: { width: number; height: number } = { width: 1000, height: 1000 }

export type PixelOverrides = Partial<Record<number, { x: number; y: number } | null>>

export function syntheticPixels(): Map<number, { x: number; y: number }> {
  const cx = 500
  const p = new Map<number, { x: number; y: number }>()
  const sym = (right: number, left: number, halfWidth: number, y: number) => {
    p.set(right, { x: cx - halfWidth, y })
    p.set(left, { x: cx + halfWidth, y })
  }

  p.set(LM.meshTop, { x: cx, y: 200 })
  p.set(LM.chin, { x: cx, y: 800 })
  p.set(LM.glabella, { x: cx, y: 320 })
  p.set(LM.noseTip, { x: cx, y: 530 })
  p.set(LM.noseBase, { x: cx, y: 550 })
  p.set(LM.upperLipTop, { x: cx, y: 600 })
  p.set(LM.upperLipInner, { x: cx, y: 620 })
  p.set(LM.lowerLipInner, { x: cx, y: 622 })
  p.set(LM.lowerLipBottom, { x: cx, y: 652 })

  sym(LM.faceRight, LM.faceLeft, 200, 400)
  sym(LM.foreheadRight, LM.foreheadLeft, 150, 260)
  sym(LM.jawRight, LM.jawLeft, 125, 700)
  sym(LM.noseWingRight, LM.noseWingLeft, 50, 540)
  sym(LM.mouthCornerRight, LM.mouthCornerLeft, 80, 620)
  sym(LM.eyeInnerRight, LM.eyeInnerLeft, 50, 350)
  sym(LM.eyeOuterRight, LM.eyeOuterLeft, 120, 350)
  sym(LM.irisCentreRight, LM.irisCentreLeft, 90, 350)

  // Brows: ten points per side, all on y = 300 so the brow line sits at exactly y = 300.
  BROW_LANDMARKS_RIGHT.forEach((index, i) => p.set(index, { x: cx - 60 - i * 8, y: 300 }))
  BROW_LANDMARKS_LEFT.forEach((index, i) => p.set(index, { x: cx + 60 + i * 8, y: 300 }))
  return p
}

/**
 * Builds a 478-landmark array (normalised to 0–1) from the synthetic face.
 * `overrides` replaces (or, with `null`, removes) individual points; `transform` post-processes pixels.
 */
export function syntheticLandmarks(
  overrides: PixelOverrides = {},
  transform: (point: { x: number; y: number }) => { x: number; y: number } = (point) => point,
  size = SYNTHETIC_SIZE,
): Landmark[] {
  const base = syntheticPixels()
  const landmarks: Landmark[] = []
  for (let index = 0; index < FACE_MESH_WITH_IRIS_COUNT; index++) {
    let point = overrides[index] === undefined ? base.get(index) : overrides[index]
    if (overrides[index] === null) {
      landmarks.push({ x: Number.NaN, y: Number.NaN })
      continue
    }
    if (!point) {
      // Unused mesh points: park them on the face centre. They are never read by the measurements.
      point = { x: 500, y: 500 }
    }
    const moved = transform(point)
    landmarks.push({ x: moved.x / size.width, y: moved.y / size.height, z: 0 })
  }
  return landmarks
}
