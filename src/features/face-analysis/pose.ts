import type { ImageSize, Landmark } from '@/types'
import { LM } from './landmarks'
import { toDegrees } from './geometry'

/** Head pose as unsigned magnitudes in degrees. */
export interface HeadPose {
  /** Turning left/right (looking away from the camera sideways). */
  yaw: number
  /** Nodding up/down. */
  pitch: number
  /** Tilting the head sideways (in the image plane). */
  roll: number
}

export interface TransformMatrix {
  rows: number
  columns: number
  data: ArrayLike<number>
}

/**
 * Head pose from MediaPipe's facial transformation matrix (4×4, column-major).
 *
 * The first column is the face's "right" axis and the third column its "forward"
 * axis, both expressed in camera space. Only magnitudes are returned, so the
 * handedness of the camera frame does not matter.
 */
export function poseFromTransformMatrix(matrix: TransformMatrix | null | undefined): HeadPose | null {
  if (!matrix || matrix.rows !== 4 || matrix.columns !== 4 || matrix.data.length < 16) return null
  const d = Array.from({ length: 16 }, (_, i) => matrix.data[i] ?? Number.NaN)
  if (!d.every((value) => Number.isFinite(value))) return null

  const right = normalize([d[0]!, d[1]!, d[2]!])
  const forward = normalize([d[8]!, d[9]!, d[10]!])
  if (!right || !forward) return null

  const yaw = Math.atan2(forward[0], forward[2])
  const pitch = Math.atan2(forward[1], Math.hypot(forward[0], forward[2]))
  const roll = Math.atan2(right[1], right[0])
  return { yaw: Math.abs(toDegrees(yaw)), pitch: Math.abs(toDegrees(pitch)), roll: Math.abs(toDegrees(roll)) }
}

function normalize(v: [number, number, number]): [number, number, number] | null {
  const length = Math.hypot(v[0], v[1], v[2])
  if (!(length > 1e-6)) return null
  return [v[0] / length, v[1] / length, v[2] / length]
}

/**
 * Fallback head-pose estimate from the landmark depth (z) values, used only when the
 * model did not return a transformation matrix. z shares the x scale (image width).
 */
export function poseFromLandmarks(landmarks: readonly Landmark[], size: ImageSize): HeadPose | null {
  const get = (i: number) => landmarks[i]
  const right = get(LM.faceRight)
  const left = get(LM.faceLeft)
  const top = get(LM.meshTop)
  const chin = get(LM.chin)
  const rightEye = get(LM.irisCentreRight) ?? get(LM.eyeOuterRight)
  const leftEye = get(LM.irisCentreLeft) ?? get(LM.eyeOuterLeft)
  if (!right || !left || !top || !chin || !rightEye || !leftEye) return null
  if (right.z === undefined || left.z === undefined || top.z === undefined || chin.z === undefined) return null

  const dx = (left.x - right.x) * size.width
  const dz = (left.z - right.z) * size.width
  const dyFace = (chin.y - top.y) * size.height
  const dzFace = (chin.z - top.z) * size.width
  const roll = Math.atan2((leftEye.y - rightEye.y) * size.height, (leftEye.x - rightEye.x) * size.width)
  if (![dx, dz, dyFace, dzFace, roll].every(Number.isFinite)) return null

  return {
    yaw: Math.abs(toDegrees(Math.atan2(dz, Math.abs(dx)))),
    pitch: Math.abs(toDegrees(Math.atan2(dzFace, Math.abs(dyFace)))),
    roll: Math.abs(toDegrees(roll)),
  }
}
