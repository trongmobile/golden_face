import { ImageFileError } from './file-validation'

/** Longest side of the working copy. Bigger photos are scaled down to keep memory use predictable. */
export const MAX_ANALYSIS_DIMENSION = 2048

export type PhotoOrigin = 'upload' | 'camera'

/** A decoded photo held only in memory (never persisted or uploaded). */
export interface Photo {
  canvas: HTMLCanvasElement
  origin: PhotoOrigin
  name?: string
}

/** A rectangle in 0–1 coordinates relative to an image. */
export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export type QuarterTurns = 0 | 1 | 2 | 3

export const FULL_RECT: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 }

function create2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available in this browser.')
  context.imageSmoothingQuality = 'high'
  return [canvas, context]
}

/** Frees a canvas's pixel memory immediately instead of waiting for garbage collection. */
export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide) return { width, height }
  const scale = maxSide / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Copies any image source into a new canvas, scaled down to `maxSide` if needed. */
export function canvasFromSource(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSide = MAX_ANALYSIS_DIMENSION,
): HTMLCanvasElement {
  const target = fitWithin(width, height, maxSide)
  const [canvas, context] = create2d(target.width, target.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function decodeWithImageElement(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return canvasFromSource(image, image.naturalWidth, image.naturalHeight)
  } finally {
    // The temporary URL is released as soon as the pixels are copied out.
    URL.revokeObjectURL(url)
  }
}

/** Decodes an image file into a canvas, honouring EXIF orientation. */
export async function decodeImageFile(file: File): Promise<HTMLCanvasElement> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      try {
        return canvasFromSource(bitmap, bitmap.width, bitmap.height)
      } finally {
        bitmap.close()
      }
    }
    return await decodeWithImageElement(file)
  } catch (primaryError) {
    try {
      return await decodeWithImageElement(file)
    } catch {
      throw new ImageFileError(
        'unreadable',
        'This image could not be opened. It may be corrupted or too large for this device.',
        { cause: primaryError },
      )
    }
  }
}

/** Rotates clockwise by `turns` × 90°. Returns a new canvas. */
export function rotateCanvas(source: HTMLCanvasElement, turns: QuarterTurns): HTMLCanvasElement {
  if (turns === 0) {
    const [copy, context] = create2d(source.width, source.height)
    context.drawImage(source, 0, 0)
    return copy
  }
  const swap = turns === 1 || turns === 3
  const [canvas, context] = create2d(swap ? source.height : source.width, swap ? source.width : source.height)
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((turns * Math.PI) / 2)
  context.drawImage(source, -source.width / 2, -source.height / 2)
  return canvas
}

export function clampRect(rect: NormalizedRect, minSize = 0.05): NormalizedRect {
  const width = Math.min(1, Math.max(minSize, rect.width))
  const height = Math.min(1, Math.max(minSize, rect.height))
  return {
    width,
    height,
    x: Math.min(1 - width, Math.max(0, rect.x)),
    y: Math.min(1 - height, Math.max(0, rect.y)),
  }
}

export const isFullRect = (rect: NormalizedRect): boolean =>
  rect.x <= 0.0005 && rect.y <= 0.0005 && rect.width >= 0.999 && rect.height >= 0.999

/** Crops a canvas to a normalized rectangle. Returns a new canvas. */
export function cropCanvas(source: HTMLCanvasElement, rect: NormalizedRect): HTMLCanvasElement {
  const safe = clampRect(rect)
  const sx = Math.round(safe.x * source.width)
  const sy = Math.round(safe.y * source.height)
  const sw = Math.max(1, Math.min(source.width - sx, Math.round(safe.width * source.width)))
  const sh = Math.max(1, Math.min(source.height - sy, Math.round(safe.height * source.height)))
  const [canvas, context] = create2d(sw, sh)
  context.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return canvas
}

/** Applies rotation then crop. Always returns a new canvas (the source is untouched). */
export function applyEdits(source: HTMLCanvasElement, turns: QuarterTurns, crop: NormalizedRect): HTMLCanvasElement {
  const rotated = rotateCanvas(source, turns)
  if (isFullRect(crop)) return rotated
  try {
    return cropCanvas(rotated, crop)
  } finally {
    releaseCanvas(rotated)
  }
}
