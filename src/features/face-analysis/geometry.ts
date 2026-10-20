import type { Point } from '@/types'

export const add = (p: Point, q: Point): Point => ({ x: p.x + q.x, y: p.y + q.y })
export const sub = (p: Point, q: Point): Point => ({ x: p.x - q.x, y: p.y - q.y })
export const scale = (p: Point, s: number): Point => ({ x: p.x * s, y: p.y * s })
export const dot = (p: Point, q: Point): number => p.x * q.x + p.y * q.y
export const distance = (p: Point, q: Point): number => Math.hypot(p.x - q.x, p.y - q.y)
export const midpoint = (p: Point, q: Point): Point => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })

export const toDegrees = (radians: number): number => (radians * 180) / Math.PI

/** Median of a non-empty list (returns NaN for an empty list). */
export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  const lower = sorted[mid - 1]
  const upper = sorted[mid]
  if (upper === undefined) return Number.NaN
  return sorted.length % 2 === 1 || lower === undefined ? upper : (lower + upper) / 2
}

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * A face-aligned coordinate system, so measurements do not change when the head
 * is rolled (tilted sideways) in the photo.
 *
 *  - `u` is the unit vector from the subject's right pupil to the left pupil
 *    (≈ "image right" for an upright face);
 *  - `v` is `u` rotated 90° — the "down the face" axis (≈ image down).
 */
export interface Frame {
  origin: Point
  u: Point
  v: Point
}

export interface FramePoint {
  /** Coordinate along `u` (left/right). */
  a: number
  /** Coordinate along `v` (up/down). */
  b: number
}

export function createFrame(rightEye: Point, leftEye: Point): Frame | null {
  const dx = leftEye.x - rightEye.x
  const dy = leftEye.y - rightEye.y
  const length = Math.hypot(dx, dy)
  if (!Number.isFinite(length) || length < 1e-6) return null
  const u = { x: dx / length, y: dy / length }
  return { origin: midpoint(rightEye, leftEye), u, v: { x: -u.y, y: u.x } }
}

export function toFrame(frame: Frame, p: Point): FramePoint {
  const d = sub(p, frame.origin)
  return { a: dot(d, frame.u), b: dot(d, frame.v) }
}

export function fromFrame(frame: Frame, a: number, b: number): Point {
  return {
    x: frame.origin.x + frame.u.x * a + frame.v.x * b,
    y: frame.origin.y + frame.u.y * a + frame.v.y * b,
  }
}

/** In-plane head tilt in degrees (0 = eyes level). */
export function frameRollDegrees(frame: Frame): number {
  return toDegrees(Math.atan2(frame.u.y, frame.u.x))
}
