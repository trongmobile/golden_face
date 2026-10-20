import { FULL_RECT, clampRect, type NormalizedRect, type QuarterTurns } from './image-utils'

export interface PhotoEdits {
  turns: QuarterTurns
  crop: NormalizedRect
}

export const NO_EDITS: PhotoEdits = { turns: 0, crop: FULL_RECT }

export type DragMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const MIN_CROP_SIZE = 0.12

/** Applies a drag delta (in 0–1 units) to the start rectangle for the given handle. */
export function resizeRect(start: NormalizedRect, mode: DragMode, dx: number, dy: number): NormalizedRect {
  if (mode === 'move') {
    return clampRect({ ...start, x: start.x + dx, y: start.y + dy }, MIN_CROP_SIZE)
  }
  let { x, y, width, height } = start
  const right = start.x + start.width
  const bottom = start.y + start.height

  if (mode.includes('w')) {
    x = Math.min(right - MIN_CROP_SIZE, Math.max(0, start.x + dx))
    width = right - x
  }
  if (mode.includes('e')) {
    width = Math.min(1 - start.x, Math.max(MIN_CROP_SIZE, start.width + dx))
  }
  if (mode.includes('n')) {
    y = Math.min(bottom - MIN_CROP_SIZE, Math.max(0, start.y + dy))
    height = bottom - y
  }
  if (mode.includes('s')) {
    height = Math.min(1 - start.y, Math.max(MIN_CROP_SIZE, start.height + dy))
  }
  return clampRect({ x, y, width, height }, MIN_CROP_SIZE)
}
