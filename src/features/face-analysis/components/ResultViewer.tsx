import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Crosshair, Maximize2, Minus, Plus, RotateCcw, ScanFace, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AnalysisResult, FaceMeasurements, Point } from '@/types'
import { cn } from '@/utils/cn'
import { fromFrame, toFrame } from '../geometry'
import type { MetricId } from '../metric-catalog'
import { OVERLAY_LAYERS, faceRegion, fullRegion, paintAnnotated, type OverlayLayer } from '../overlay'

/** Canvas pixels are capped so very large photos stay fast to redraw. */
const MAX_CANVAS_SIDE = 1600
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

interface ResultViewerProps {
  image: HTMLCanvasElement
  result: AnalysisResult
  measurements: FaceMeasurements
  layers: ReadonlySet<OverlayLayer>
  onToggleLayer: (layer: OverlayLayer) => void
  highlight: MetricId | null
  hairline: Point | null
  onHairlineChange: (point: Point | null) => void
}

export function ResultViewer({
  image,
  result,
  measurements,
  layers,
  onToggleLayer,
  highlight,
  hairline,
  onHairlineChange,
}: ResultViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [marking, setMarking] = useState(false)
  const [focusFace, setFocusFace] = useState(true)
  const { width, height } = result.imageSize

  const faceView = useMemo(() => faceRegion(result), [result])
  const region = useMemo(() => (focusFace ? faceView : fullRegion(result)), [focusFace, faceView, result])
  const canFocus = faceView.width < width || faceView.height < height
  const scale = Math.min(1, MAX_CANVAS_SIDE / Math.max(region.width, region.height))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.round(region.width * scale)
    canvas.height = Math.round(region.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    paintAnnotated(context, image, result, measurements, { layers, highlight, labels: true }, region, scale)
  }, [image, result, measurements, layers, highlight, region, scale])

  const faceLength = measurements.segments['face-length']?.value ?? height * 0.3

  /** Places the hairline on the photo, moving along the face's vertical axis. */
  const placeHairlineAtPixel = useCallback(
    (point: Point) => {
      onHairlineChange({
        x: Math.min(width, Math.max(0, point.x)),
        y: Math.min(height, Math.max(0, point.y)),
      })
    },
    [onHairlineChange, width, height],
  )

  const startMarking = () => {
    setMarking(true)
    if (!hairline) {
      // Start slightly above the mesh top so keyboard users can nudge from a sensible place.
      const meshTop = result.landmarks[10]
      if (meshTop) {
        const f = toFrame(measurements.frame, { x: meshTop.x * width, y: meshTop.y * height })
        placeHairlineAtPixel(fromFrame(measurements.frame, measurements.axisOffset, f.b - faceLength * 0.12))
      }
    }
  }

  const nudge = (direction: -1 | 1) => {
    if (!hairline) return
    const { frame } = measurements
    // Move along the face axis (so it stays "up" even for a tilted head), ~1 % of face length.
    const step = faceLength * 0.01 * direction
    placeHairlineAtPixel({ x: hairline.x + frame.v.x * step, y: hairline.y + frame.v.y * step })
  }

  const onCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!marking) return
    const rect = event.currentTarget.getBoundingClientRect()
    placeHairlineAtPixel({
      x: region.x + ((event.clientX - rect.left) / rect.width) * region.width,
      y: region.y + ((event.clientY - rect.top) / rect.height) * region.height,
    })
  }

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Zoom" className="flex items-center gap-1 rounded-full border border-line bg-paper p-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            className="grid size-9 place-items-center rounded-full hover:bg-accent-100 disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-12 text-center text-sm font-medium tabular-nums" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            className="grid size-9 place-items-center rounded-full hover:bg-accent-100 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            disabled={zoom === 1}
            onClick={() => setZoom(1)}
            className="grid size-9 place-items-center rounded-full hover:bg-accent-100 disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>

        {canFocus && (
          <Button
            size="sm"
            variant="secondary"
            aria-pressed={focusFace}
            onClick={() => setFocusFace((value) => !value)}
            icon={focusFace ? <Maximize2 className="size-4" aria-hidden="true" /> : <ScanFace className="size-4" aria-hidden="true" />}
          >
            {focusFace ? 'Show full photo' : 'Focus on face'}
          </Button>
        )}

        {hairline ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => nudge(-1)} icon={<ArrowUp className="size-4" aria-hidden="true" />} aria-label="Move hairline up">
              Up
            </Button>
            <Button size="sm" variant="secondary" onClick={() => nudge(1)} icon={<ArrowDown className="size-4" aria-hidden="true" />} aria-label="Move hairline down">
              Down
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onHairlineChange(null)
                setMarking(false)
              }}
              icon={<X className="size-4" aria-hidden="true" />}
            >
              Remove hairline
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={startMarking} icon={<Crosshair className="size-4" aria-hidden="true" />}>
            Mark hairline
          </Button>
        )}
      </div>

      {marking && (
        <p role="status" className="no-print mb-3 rounded-xl bg-accent-50 px-4 py-2.5 text-sm text-ink">
          Click the photo where your hairline is, or use the Up / Down buttons. The hairline is only used for the
          upper third and for face length — it is never guessed.
        </p>
      )}

      <div
        className="overflow-auto rounded-card border border-line bg-ink/5 print:overflow-visible"
        style={{ maxHeight: zoom > 1 ? '72dvh' : undefined }}
        tabIndex={zoom > 1 ? 0 : undefined}
        role={zoom > 1 ? 'region' : undefined}
        aria-label={zoom > 1 ? 'Zoomed photo — scroll to pan' : undefined}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Your photo with facial landmarks and measurement lines drawn on it"
          onClick={onCanvasClick}
          className={cn('block h-auto max-w-none print:mx-auto print:max-h-[105mm] print:w-auto! print:max-w-full', marking && 'cursor-crosshair')}
          style={{ width: `${zoom * 100}%` }}
        />
      </div>

      <fieldset className="no-print mt-4">
        <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Overlay layers</legend>
        <div className="flex flex-wrap gap-2">
          {OVERLAY_LAYERS.map((layer) => {
            const active = layers.has(layer.id)
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={active}
                title={layer.description}
                onClick={() => onToggleLayer(layer.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-line-strong bg-paper text-ink hover:border-ink',
                )}
              >
                {layer.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
