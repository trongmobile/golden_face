import { englishT, type MsgKey, type Translate } from '@/i18n'
import type { AnalysisResult, FaceMeasurements } from '@/types'
import { releaseCanvas } from '@/features/image-upload/image-utils'
import { formatPercent, formatRatio, formatShare } from '@/utils/format'
import { DEFAULT_SIMILARITY_K, PHI } from './golden-ratio'
import { faceRegion, paintAnnotated, roundedRectPath, type OverlayLayer } from './overlay'

export interface ReportInput {
  image: HTMLCanvasElement
  result: AnalysisResult
  measurements: FaceMeasurements
  layers: ReadonlySet<OverlayLayer>
  /** Translates the report text. Defaults to English. */
  t?: Translate
  /** Locale for the date shown in the header (BCP 47). Defaults to the browser's. */
  locale?: string
}

const THIRD_PART: Record<'upper' | 'middle' | 'lower', MsgKey> = {
  upper: 'results.report.thirdUpper',
  middle: 'results.report.thirdMiddle',
  lower: 'results.report.thirdLower',
}

const WIDTH = 1240
const PAD = 56
const INK = '#0f1b26'
const MUTED = '#55626d'
const ACCENT = '#145a56'
const LINE = '#dce5e9'
const FONT = '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif'
const SERIF = '"Fraunces Variable", Georgia, "Times New Roman", serif'

type Context = CanvasRenderingContext2D

function wrap(ctx: Context, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Draws wrapped text and returns the y position after it. */
function paragraph(ctx: Context, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  let cursor = y
  for (const line of wrap(ctx, text, maxWidth)) {
    ctx.fillText(line, x, cursor)
    cursor += lineHeight
  }
  return cursor
}

/** Renders the complete report (photo with overlay + numbers + caveats) onto a new canvas. */
export function renderReportCanvas({
  image,
  result,
  measurements,
  layers,
  t = englishT,
  locale,
}: ReportInput): HTMLCanvasElement {
  const scratch = document.createElement('canvas')
  scratch.width = WIDTH
  scratch.height = 3600
  const ctx = scratch.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.')

  ctx.fillStyle = '#f3f7f8'
  ctx.fillRect(0, 0, WIDTH, scratch.height)
  ctx.textBaseline = 'alphabetic'

  // Header
  ctx.fillStyle = INK
  ctx.font = `500 40px ${SERIF}`
  ctx.fillText('Golden', PAD, PAD + 36)
  const goldenWidth = ctx.measureText('Golden').width
  ctx.fillStyle = ACCENT
  ctx.fillText('Face', PAD + goldenWidth, PAD + 36)
  ctx.fillStyle = MUTED
  ctx.font = `400 18px ${FONT}`
  ctx.fillText(t('results.report.subtitle'), PAD, PAD + 66)
  ctx.textAlign = 'right'
  ctx.fillText(new Date(result.analyzedAt).toLocaleString(locale), WIDTH - PAD, PAD + 36)
  ctx.textAlign = 'left'
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, PAD + 90)
  ctx.lineTo(WIDTH - PAD, PAD + 90)
  ctx.stroke()

  // Photo with overlay (left column), cropped around the face
  const top = PAD + 122
  const photoWidth = 520
  const region = faceRegion(result)
  const photoHeight = Math.min(760, Math.round((photoWidth * region.height) / region.width))
  const fitScale = Math.min(photoWidth / region.width, photoHeight / region.height)
  const drawWidth = Math.round(region.width * fitScale)
  const drawHeight = Math.round(region.height * fitScale)

  // Render at up to 2× the printed size for a crisp PNG.
  const renderScale = Math.min(1, (drawWidth * 2) / region.width)
  const composed = document.createElement('canvas')
  composed.width = Math.max(1, Math.round(region.width * renderScale))
  composed.height = Math.max(1, Math.round(region.height * renderScale))
  const composedContext = composed.getContext('2d')
  if (composedContext) {
    paintAnnotated(composedContext, image, result, measurements, { layers, highlight: null, labels: true, t }, region, renderScale)
    ctx.save()
    ctx.beginPath()
    roundedRectPath(ctx, PAD, top, drawWidth, drawHeight, 18)
    ctx.clip()
    ctx.drawImage(composed, PAD, top, drawWidth, drawHeight)
    ctx.restore()
  }
  releaseCanvas(composed)

  // Numbers (right column)
  const colX = PAD + photoWidth + 44
  const colWidth = WIDTH - PAD - colX
  let y = top + 16
  ctx.fillStyle = ACCENT
  ctx.font = `600 13px ${FONT}`
  ctx.fillText(t('results.report.proportions').toUpperCase(), colX, y)
  y += 12

  for (const metric of measurements.metrics) {
    y += 28
    ctx.fillStyle = INK
    ctx.font = `600 17px ${FONT}`
    ctx.fillText(t(`metrics.items.${metric.id}.label`), colX, y)
    if (metric.status === 'ok') {
      ctx.textAlign = 'right'
      ctx.font = `500 24px ${SERIF}`
      ctx.fillText(formatRatio(metric.ratio), colX + colWidth, y)
      ctx.textAlign = 'left'
      if (metric.golden) {
        y += 22
        ctx.fillStyle = MUTED
        ctx.font = `400 14px ${FONT}`
        ctx.fillText(
          t('results.report.golden', {
            phi: formatRatio(PHI),
            ratio: formatRatio(metric.golden.ratio),
            deviation: formatPercent(metric.golden.error * 100),
            similarity: formatPercent(metric.golden.similarity, 0),
          }),
          colX,
          y,
        )
      }
    } else {
      y += 22
      ctx.fillStyle = MUTED
      ctx.font = `400 14px ${FONT}`
      y = paragraph(ctx, t('results.report.notMeasured', { reason: t(metric.reason) }), colX, y, colWidth, 19) - 19
    }
    y += 12
    ctx.strokeStyle = LINE
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(colX, y)
    ctx.lineTo(colX + colWidth, y)
    ctx.stroke()
  }

  y = Math.max(y, top + drawHeight) + 44

  // Full-width sections
  const fullWidth = WIDTH - PAD * 2
  const section = (title: string) => {
    ctx.fillStyle = ACCENT
    ctx.font = `600 13px ${FONT}`
    ctx.fillText(title.toUpperCase(), PAD, y)
    y += 26
  }
  const body = (text: string) => {
    ctx.fillStyle = INK
    ctx.font = `400 16px ${FONT}`
    y = paragraph(ctx, text, PAD, y, fullWidth, 24) + 6
  }

  const { thirds, symmetry } = measurements
  section(t('results.report.thirds'))
  body(
    (['upper', 'middle', 'lower'] as const)
      .map((key) => {
        const share = thirds.shares[key]
        return t('results.report.thirdItem', {
          part: t(THIRD_PART[key]),
          value: share === null ? t('results.report.thirdNotMeasured') : formatShare(share),
        })
      })
      .join('   ·   '),
  )
  y += 14

  section(t('results.report.symmetry'))
  body(
    symmetry.meanHorizontalDeviationPct === null
      ? t('results.report.symmetryNone')
      : t('results.report.symmetryText', {
          side: formatPercent(symmetry.meanHorizontalDeviationPct),
          height: formatPercent(symmetry.meanVerticalOffsetPct ?? 0),
        }),
  )
  y += 14

  section(t('results.report.quality', { level: t(`results.report.levels.${result.quality.reliability}`) }))
  const notes = result.quality.checks.filter((check) => check.status !== 'pass')
  body(notes.length === 0 ? t('results.report.noProblems') : notes.map((check) => `• ${t(check.detail)}`).join(' '))
  y += 14

  section(t('results.report.read'))
  body(t('results.report.readText', { k: DEFAULT_SIMILARITY_K }))

  const finalHeight = y + PAD
  const output = document.createElement('canvas')
  output.width = WIDTH
  output.height = finalHeight
  const outputContext = output.getContext('2d')
  outputContext?.drawImage(scratch, 0, 0, WIDTH, finalHeight, 0, 0, WIDTH, finalHeight)
  releaseCanvas(scratch)
  return output
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The report image could not be created.'))), type)
  })
}

/** Downloads a blob via a temporary object URL that is revoked right afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function downloadReportPng(input: ReportInput): Promise<void> {
  const canvas = renderReportCanvas(input)
  try {
    const blob = await canvasToBlob(canvas)
    downloadBlob(blob, `goldenface-report-${new Date().toISOString().slice(0, 10)}.png`)
  } finally {
    releaseCanvas(canvas)
  }
}
