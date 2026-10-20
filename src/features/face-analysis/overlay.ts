import type { AnalysisResult, FaceMeasurements, MeasuredSegment, Point } from '@/types'
import { fromFrame } from './geometry'
import { computeFaceBox } from './quality'
import { SYMMETRY_PAIRS } from './landmarks'
import { METRIC_BY_ID, type MetricId, type SegmentId } from './metric-catalog'

export type OverlayLayer = 'mesh' | 'contours' | 'measurements' | 'levels' | 'symmetry' | 'landmarks'

export const OVERLAY_LAYERS: readonly { id: OverlayLayer; label: string; description: string }[] = [
  { id: 'measurements', label: 'Measurements', description: 'Lines for every measured width and height.' },
  { id: 'levels', label: 'Vertical thirds', description: 'Horizontal guides at the brows, nose base and chin.' },
  { id: 'symmetry', label: 'Symmetry axis', description: 'The facial midline and left–right differences.' },
  { id: 'contours', label: 'Face contours', description: 'Outline of the face, eyes, brows and lips.' },
  { id: 'landmarks', label: 'Key landmarks', description: 'The landmark points the measurements use.' },
  { id: 'mesh', label: 'Full mesh', description: 'All 468 face-mesh connections.' },
]

export const DEFAULT_LAYERS: readonly OverlayLayer[] = ['measurements', 'levels', 'contours']

export interface OverlayOptions {
  layers: ReadonlySet<OverlayLayer>
  /** Metric to emphasise; all other measurement lines are dimmed. */
  highlight?: MetricId | null
  /** Draw text labels next to the emphasised lines. */
  labels?: boolean
  /** Longest side (in image pixels) that line widths and labels are scaled against. Defaults to the image. */
  referenceSize?: number
}

/** A rectangle of the analysed image, in image pixels. */
export interface ViewRegion {
  x: number
  y: number
  width: number
  height: number
}

export const fullRegion = (result: AnalysisResult): ViewRegion => ({
  x: 0,
  y: 0,
  width: result.imageSize.width,
  height: result.imageSize.height,
})

/**
 * The part of the photo around the face, with room for the hair and forehead. Used so that a
 * face in a wide or full-body photo is still shown large enough to read the overlay.
 */
export function faceRegion(result: AnalysisResult): ViewRegion {
  const { width, height } = result.imageSize
  const box = computeFaceBox(result.landmarks, result.imageSize)
  if (!box) return fullRegion(result)
  const w = box.x1 - box.x0
  const h = box.y1 - box.y0
  const x0 = Math.max(0, box.x0 - w * 0.5)
  const x1 = Math.min(width, box.x1 + w * 0.5)
  const y0 = Math.max(0, box.y0 - h * 0.4)
  const y1 = Math.min(height, box.y1 + h * 0.25)
  // Never zoom in further than the photo itself: fall back to the full photo for close-up portraits.
  if ((x1 - x0) * (y1 - y0) > width * height * 0.8) return fullRegion(result)
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

/**
 * Paints the photo and the overlay for `region` onto `ctx`, scaled by `scale`
 * (canvas pixels per image pixel).
 */
export function paintAnnotated(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  result: AnalysisResult,
  measurements: FaceMeasurements,
  options: OverlayOptions,
  region: ViewRegion,
  scale: number,
): void {
  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, -region.x * scale, -region.y * scale)
  ctx.drawImage(image, 0, 0, result.imageSize.width, result.imageSize.height)
  drawOverlay(ctx, result, measurements, {
    ...options,
    referenceSize: options.referenceSize ?? Math.max(region.width, region.height),
  })
  ctx.restore()
}

// Hues chosen to stay readable on photos and to avoid the red/green good-vs-bad convention.
const COLORS = {
  width: '#f2cf86',
  vertical: '#9fd0ff',
  accent: '#ffe2a6',
  contour: 'rgba(255,255,255,0.9)',
  mesh: 'rgba(255,255,255,0.22)',
  casing: 'rgba(12,14,22,0.6)',
  axis: '#ffffff',
} as const

type Context = CanvasRenderingContext2D

/** Adds a rounded rectangle to the current path (roundRect is missing in older browsers). */
export function roundedRectPath(ctx: Context, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2)
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius)
    return
  }
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function strokePath(ctx: Context, color: string, lineWidth: number, casing: boolean, draw: () => void, dash: number[] = []) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash(dash)
  if (casing) {
    ctx.strokeStyle = COLORS.casing
    ctx.lineWidth = lineWidth + 2.4
    ctx.beginPath()
    draw()
    ctx.stroke()
  }
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  draw()
  ctx.stroke()
  ctx.setLineDash([])
}

function dot(ctx: Context, p: Point, radius: number, fill: string) {
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = Math.max(1, radius * 0.45)
  ctx.strokeStyle = COLORS.casing
  ctx.stroke()
}

function label(ctx: Context, text: string, anchor: Point, unit: number, align: 'left' | 'center' | 'right' = 'center') {
  const size = Math.max(11, 13 * unit)
  ctx.font = `600 ${size}px "Inter Variable", system-ui, -apple-system, sans-serif`
  const padX = size * 0.6
  const padY = size * 0.4
  const width = ctx.measureText(text).width + padX * 2
  const height = size + padY * 2
  const x = align === 'left' ? anchor.x : align === 'right' ? anchor.x - width : anchor.x - width / 2
  const y = anchor.y - height / 2
  ctx.fillStyle = 'rgba(20,22,31,0.82)'
  ctx.beginPath()
  roundedRectPath(ctx, x, y, width, height, height / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x + padX, y + height / 2 + size * 0.04)
}

function drawConnections(ctx: Context, connections: [number, number][], points: Point[], color: string, lineWidth: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const [a, b] of connections) {
    const p = points[a]
    const q = points[b]
    if (!p || !q) continue
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
  }
  ctx.stroke()
}

function drawSegment(ctx: Context, segment: MeasuredSegment, color: string, lineWidth: number, unit: number, casing = true) {
  strokePath(ctx, color, lineWidth, casing, () => {
    ctx.moveTo(segment.from.x, segment.from.y)
    ctx.lineTo(segment.to.x, segment.to.y)
  })
  // End ticks, perpendicular to the segment.
  const dx = segment.to.x - segment.from.x
  const dy = segment.to.y - segment.from.y
  const length = Math.hypot(dx, dy) || 1
  const nx = (-dy / length) * 5 * unit
  const ny = (dx / length) * 5 * unit
  for (const end of [segment.from, segment.to]) {
    strokePath(ctx, color, lineWidth, casing, () => {
      ctx.moveTo(end.x - nx, end.y - ny)
      ctx.lineTo(end.x + nx, end.y + ny)
    })
  }
}

function segmentColor(id: SegmentId): string {
  return ['face-length', 'upper-third', 'middle-third', 'lower-third', 'upper-lip', 'lower-lip'].includes(id)
    ? COLORS.vertical
    : COLORS.width
}

/** Every landmark index that takes part in a measurement or symmetry pair. */
function keyLandmarkIndices(measurements: FaceMeasurements): number[] {
  const indices = new Set<number>()
  for (const segment of Object.values(measurements.segments)) segment?.landmarks.forEach((i) => indices.add(i))
  for (const pair of SYMMETRY_PAIRS) {
    indices.add(pair.right)
    indices.add(pair.left)
  }
  return [...indices]
}

export function landmarkPixels(result: AnalysisResult): Point[] {
  const { width, height } = result.imageSize
  return result.landmarks.map((landmark) => ({ x: landmark.x * width, y: landmark.y * height }))
}

/**
 * Draws the analysis overlay onto a canvas whose pixel size equals the analysed image.
 * The image itself must already be drawn by the caller.
 */
export function drawOverlay(
  ctx: Context,
  result: AnalysisResult,
  measurements: FaceMeasurements,
  options: OverlayOptions,
): void {
  const { width, height } = result.imageSize
  const unit = (options.referenceSize ?? Math.max(width, height)) / 1000
  const { layers, highlight = null, labels = true } = options
  const points = landmarkPixels(result)
  const base = Math.max(1.2, 1.6 * unit)

  ctx.save()

  if (layers.has('mesh')) {
    drawConnections(ctx, result.connections.tesselation, points, COLORS.mesh, Math.max(0.6, 0.7 * unit))
  }
  if (layers.has('contours')) {
    drawConnections(ctx, result.connections.contours, points, COLORS.contour, Math.max(1, 1.2 * unit))
    drawConnections(ctx, result.connections.faceOval, points, COLORS.contour, Math.max(1.2, 1.6 * unit))
  }

  const faceWidth = measurements.segments['face-width']?.value ?? width * 0.3
  const frame = measurements.frame
  const emphasised = new Set<SegmentId>()
  if (highlight) {
    const definition = METRIC_BY_ID[highlight]
    emphasised.add(definition.numerator)
    emphasised.add(definition.denominator)
  }

  if (layers.has('levels')) {
    const half = faceWidth * 0.64
    for (const level of measurements.levels) {
      const left = fromFrame(frame, measurements.axisOffset - half, level.b)
      const right = fromFrame(frame, measurements.axisOffset + half, level.b)
      strokePath(
        ctx,
        level.id === 'hairline' ? COLORS.accent : COLORS.vertical,
        base,
        true,
        () => {
          ctx.moveTo(left.x, left.y)
          ctx.lineTo(right.x, right.y)
        },
        [8 * unit, 6 * unit],
      )
      if (labels) label(ctx, level.label, right, unit, 'left')
    }
  }

  if (layers.has('symmetry') && measurements.symmetry.midline) {
    const { top, bottom } = measurements.symmetry.midline
    strokePath(
      ctx,
      COLORS.axis,
      base,
      true,
      () => {
        ctx.moveTo(top.x, top.y)
        ctx.lineTo(bottom.x, bottom.y)
      },
      [10 * unit, 7 * unit],
    )
    for (const pair of measurements.symmetry.pairs) {
      strokePath(ctx, 'rgba(255,255,255,0.55)', Math.max(1, base * 0.6), false, () => {
        ctx.moveTo(pair.right.x, pair.right.y)
        ctx.lineTo(pair.left.x, pair.left.y)
      })
      // Where the right-side point would be if the face were perfectly mirrored.
      ctx.beginPath()
      ctx.arc(pair.mirroredRight.x, pair.mirroredRight.y, 4.5 * unit, 0, Math.PI * 2)
      ctx.strokeStyle = COLORS.accent
      ctx.lineWidth = Math.max(1.2, 1.6 * unit)
      ctx.stroke()
      strokePath(ctx, COLORS.vertical, Math.max(1.2, 1.6 * unit), true, () => {
        ctx.moveTo(pair.mirroredRight.x, pair.mirroredRight.y)
        ctx.lineTo(pair.left.x, pair.left.y)
      })
    }
  }

  if (layers.has('measurements')) {
    const dimmed = highlight !== null
    for (const segment of Object.values(measurements.segments)) {
      if (!segment) continue
      const isEmphasised = emphasised.has(segment.id)
      ctx.globalAlpha = dimmed && !isEmphasised ? 0.28 : 1
      drawSegment(ctx, segment, isEmphasised ? COLORS.accent : segmentColor(segment.id), isEmphasised ? base * 1.8 : base, unit)
    }
    ctx.globalAlpha = 1
    if (labels && highlight) {
      for (const id of emphasised) {
        const segment = measurements.segments[id]
        if (!segment) continue
        const middle = { x: (segment.from.x + segment.to.x) / 2, y: (segment.from.y + segment.to.y) / 2 }
        label(ctx, segment.label, middle, unit)
      }
    }
  }

  if (layers.has('landmarks')) {
    for (const index of keyLandmarkIndices(measurements)) {
      const point = points[index]
      if (point) dot(ctx, point, Math.max(2.4, 3 * unit), '#ffffff')
    }
  }

  ctx.restore()
}
