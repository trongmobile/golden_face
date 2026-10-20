import { msg, type Msg } from '@/i18n'
import type { ImageSize, Landmark, QualityCheck, QualityReport, Reliability } from '@/types'
import { FACE_OVAL_INDICES } from './landmarks'
import type { HeadPose } from './pose'

/**
 * Capture-quality heuristics.
 *
 * These are simple, documented thresholds — they flag conditions that are known
 * to make 2D landmark measurements less trustworthy. They are NOT a confidence
 * score from the model (MediaPipe face landmarks do not provide one).
 */
export const QUALITY_THRESHOLDS = {
  /** Head turned left/right (degrees). */
  yaw: { warn: 7, fail: 15 },
  /** Head nodding up/down (degrees). */
  pitch: { warn: 10, fail: 20 },
  /** In-plane tilt (degrees); compensated automatically, so only a warning. */
  roll: { warn: 15 },
  /** Face width in pixels. */
  faceWidthPx: { fail: 80, warn: 200 },
  /** Smallest image side in pixels. */
  imageMinSidePx: { warn: 480 },
  /** Mean luma of the face (0–255). */
  brightness: { failLow: 30, warnLow: 60, warnHigh: 210, failHigh: 240 },
  /** Standard deviation of luma inside the face. */
  contrast: { warn: 20 },
  /** |left − right| / mean brightness of the two face halves. */
  lightingImbalance: { warn: 0.3 },
  /** Laplacian variance ÷ luma variance, measured on a 160 px wide face crop. */
  sharpness: { warn: 0.012 },
  /** Face outline may fall outside the frame by at most this share of the face width. */
  frameTolerance: 0.02,
  expression: { smile: 0.45, jawOpen: 0.2, blink: 0.55 },
} as const

export interface FaceBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface PixelStats {
  meanLuma: number
  stdLuma: number
  /** Laplacian variance ÷ luma variance (resolution-independent sharpness proxy). */
  sharpness: number
  leftMean: number
  rightMean: number
}

export interface ExpressionScores {
  smile: number
  jawOpen: number
  blink: number
}

/** Bounding box of the face outline in pixels (may extend beyond the image). */
export function computeFaceBox(landmarks: readonly Landmark[], size: ImageSize): FaceBox | null {
  const xs: number[] = []
  const ys: number[] = []
  for (const index of FACE_OVAL_INDICES) {
    const landmark = landmarks[index]
    if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) continue
    xs.push(landmark.x * size.width)
    ys.push(landmark.y * size.height)
  }
  if (xs.length < FACE_OVAL_INDICES.length / 2) return null
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** Luma / contrast / sharpness statistics of an RGBA pixel buffer. */
export function computePixelStats(data: ArrayLike<number>, width: number, height: number): PixelStats | null {
  if (width < 3 || height < 3 || data.length < width * height * 4) return null
  const count = width * height
  const luma = new Float32Array(count)
  let sum = 0
  for (let i = 0; i < count; i++) {
    const value = 0.2126 * data[i * 4]! + 0.7152 * data[i * 4 + 1]! + 0.0722 * data[i * 4 + 2]!
    luma[i] = value
    sum += value
  }
  const meanLuma = sum / count
  let varianceSum = 0
  for (let i = 0; i < count; i++) varianceSum += (luma[i]! - meanLuma) ** 2
  const variance = varianceSum / count

  let lapSum = 0
  let lapSquares = 0
  let lapCount = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const lap = 4 * luma[i]! - luma[i - 1]! - luma[i + 1]! - luma[i - width]! - luma[i + width]!
      lapSum += lap
      lapSquares += lap * lap
      lapCount++
    }
  }
  const lapMean = lapSum / lapCount
  const lapVariance = lapSquares / lapCount - lapMean * lapMean

  const half = Math.floor(width / 2)
  let leftSum = 0
  let rightSum = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < half) leftSum += luma[y * width + x]!
      else rightSum += luma[y * width + x]!
    }
  }
  const leftCount = half * height
  const rightCount = (width - half) * height

  return {
    meanLuma,
    stdLuma: Math.sqrt(variance),
    sharpness: lapVariance / (variance + 1e-6),
    leftMean: leftSum / Math.max(1, leftCount),
    rightMean: rightSum / Math.max(1, rightCount),
  }
}

/** Reads the face crop from a canvas and computes its pixel statistics. */
export function samplePixelStats(source: CanvasImageSource, size: ImageSize, box: FaceBox): PixelStats | null {
  const x0 = Math.max(0, Math.floor(box.x0))
  const y0 = Math.max(0, Math.floor(box.y0))
  const x1 = Math.min(size.width, Math.ceil(box.x1))
  const y1 = Math.min(size.height, Math.ceil(box.y1))
  const w = x1 - x0
  const h = y1 - y0
  if (w < 8 || h < 8) return null

  const targetWidth = 160
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = Math.max(8, Math.round((h * targetWidth) / w))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.imageSmoothingQuality = 'high'
  try {
    context.drawImage(source, x0, y0, w, h, 0, 0, canvas.width, canvas.height)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    return computePixelStats(data, canvas.width, canvas.height)
  } catch {
    return null
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export interface QualityInput {
  landmarks: readonly Landmark[]
  size: ImageSize
  pose: HeadPose | null
  pixels: PixelStats | null
  expression: ExpressionScores | null
}

const T = QUALITY_THRESHOLDS
const fmt = (value: number) => value.toFixed(0)

/** Evaluates all capture-quality checks. A `fail` means the photo should not be measured. */
export function evaluateQuality(input: QualityInput): QualityReport {
  const { landmarks, size, pose, pixels, expression } = input
  const checks: QualityCheck[] = []
  const box = computeFaceBox(landmarks, size)

  // ── Resolution / face size ──
  const smallSide = Math.min(size.width, size.height)
  const smallPhoto = smallSide < T.imageMinSidePx.warn
  checks.push({
    id: 'resolution',
    label: msg('quality.checks.resolution.label'),
    status: smallPhoto ? 'warn' : 'pass',
    detail: smallPhoto
      ? msg('quality.checks.resolution.warn', { px: fmt(smallSide) })
      : msg('quality.checks.resolution.pass'),
  })

  if (box) {
    const faceWidth = box.x1 - box.x0
    const status = faceWidth < T.faceWidthPx.fail ? 'fail' : faceWidth < T.faceWidthPx.warn ? 'warn' : 'pass'
    checks.push({
      id: 'face-size',
      label: msg('quality.checks.faceSize.label'),
      status,
      detail: msg(`quality.checks.faceSize.${status}`, { px: fmt(faceWidth) }),
    })

    // ── Face fully inside the frame ──
    const tolerance = faceWidth * T.frameTolerance
    const outside =
      Math.max(0, -box.x0, -box.y0, box.x1 - size.width, box.y1 - size.height) > tolerance
    checks.push({
      id: 'frame',
      label: msg('quality.checks.frame.label'),
      status: outside ? 'fail' : 'pass',
      detail: msg(outside ? 'quality.checks.frame.fail' : 'quality.checks.frame.pass'),
    })
  }

  // ── Head pose ──
  if (pose) {
    const yawStatus = pose.yaw > T.yaw.fail ? 'fail' : pose.yaw > T.yaw.warn ? 'warn' : 'pass'
    checks.push({
      id: 'yaw',
      label: msg('quality.checks.yaw.label'),
      status: yawStatus,
      detail: msg(yawStatus === 'pass' ? 'quality.checks.yaw.pass' : 'quality.checks.yaw.turned', { deg: fmt(pose.yaw) }),
    })
    const pitchStatus = pose.pitch > T.pitch.fail ? 'fail' : pose.pitch > T.pitch.warn ? 'warn' : 'pass'
    checks.push({
      id: 'pitch',
      label: msg('quality.checks.pitch.label'),
      status: pitchStatus,
      detail: msg(pitchStatus === 'pass' ? 'quality.checks.pitch.pass' : 'quality.checks.pitch.tipped', {
        deg: fmt(pose.pitch),
      }),
    })
    const tilted = pose.roll > T.roll.warn
    checks.push({
      id: 'roll',
      label: msg('quality.checks.roll.label'),
      status: tilted ? 'warn' : 'pass',
      detail: msg(tilted ? 'quality.checks.roll.warn' : 'quality.checks.roll.pass', { deg: fmt(pose.roll) }),
    })
  } else {
    checks.push({
      id: 'yaw',
      label: msg('quality.checks.yaw.labelNoPose'),
      status: 'warn',
      detail: msg('quality.checks.yaw.unknown'),
    })
  }

  // ── Pixel-based checks ──
  if (pixels) {
    const b = T.brightness
    const brightnessStatus =
      pixels.meanLuma < b.failLow || pixels.meanLuma > b.failHigh
        ? 'fail'
        : pixels.meanLuma < b.warnLow || pixels.meanLuma > b.warnHigh
          ? 'warn'
          : 'pass'
    checks.push({
      id: 'brightness',
      label: msg('quality.checks.brightness.label'),
      status: brightnessStatus,
      detail: msg(
        brightnessStatus === 'pass'
          ? 'quality.checks.brightness.pass'
          : pixels.meanLuma < b.warnLow
            ? 'quality.checks.brightness.dark'
            : 'quality.checks.brightness.bright',
      ),
    })

    const imbalance = Math.abs(pixels.leftMean - pixels.rightMean) / Math.max(1, (pixels.leftMean + pixels.rightMean) / 2)
    const unevenLight = imbalance > T.lightingImbalance.warn
    checks.push({
      id: 'lighting-balance',
      label: msg('quality.checks.lightingBalance.label'),
      status: unevenLight ? 'warn' : 'pass',
      detail: msg(unevenLight ? 'quality.checks.lightingBalance.warn' : 'quality.checks.lightingBalance.pass'),
    })

    const flat = pixels.stdLuma < T.contrast.warn
    checks.push({
      id: 'contrast',
      label: msg('quality.checks.contrast.label'),
      status: flat ? 'warn' : 'pass',
      detail: msg(flat ? 'quality.checks.contrast.warn' : 'quality.checks.contrast.pass'),
    })

    const blurry = pixels.sharpness < T.sharpness.warn
    checks.push({
      id: 'sharpness',
      label: msg('quality.checks.sharpness.label'),
      status: blurry ? 'warn' : 'pass',
      detail: msg(blurry ? 'quality.checks.sharpness.warn' : 'quality.checks.sharpness.pass'),
    })
  }

  // ── Expression ──
  if (expression) {
    const issues: Msg[] = []
    if (expression.smile > T.expression.smile) issues.push(msg('quality.expressionIssues.smiling'))
    if (expression.jawOpen > T.expression.jawOpen) issues.push(msg('quality.expressionIssues.mouthOpen'))
    if (expression.blink > T.expression.blink) issues.push(msg('quality.expressionIssues.eyesClosing'))
    checks.push({
      id: 'expression',
      label: msg('quality.checks.expression.label'),
      status: issues.length > 0 ? 'warn' : 'pass',
      detail: issues.length > 0 ? msg('quality.checks.expression.warn', { issues }) : msg('quality.checks.expression.pass'),
    })
  }

  return { checks, reliability: summarizeReliability(checks), pose: pose ? { ...pose } : null }
}

export function summarizeReliability(checks: readonly QualityCheck[]): Reliability {
  const warnings = checks.filter((check) => check.status === 'warn').length
  const failures = checks.filter((check) => check.status === 'fail').length
  if (failures > 0 || warnings >= 3) return 'limited'
  return warnings > 0 ? 'fair' : 'good'
}

export function failedChecks(report: QualityReport): QualityCheck[] {
  return report.checks.filter((check) => check.status === 'fail')
}
