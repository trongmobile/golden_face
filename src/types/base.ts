/** A landmark in normalized image coordinates (0–1), as produced by MediaPipe. */
export interface Landmark {
  x: number
  y: number
  z?: number
}

/** A point in image pixel coordinates. */
export interface Point {
  x: number
  y: number
}

export interface ImageSize {
  width: number
  height: number
}
