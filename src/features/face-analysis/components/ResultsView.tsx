import { useCallback, useMemo, useState } from 'react'
import { Download, Printer, RefreshCw, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AnalysisResult, Point } from '@/types'
import { computeMeasurements } from '../measurements'
import { METRIC_CATALOG, type MetricId } from '../metric-catalog'
import { DEFAULT_LAYERS, type OverlayLayer } from '../overlay'
import { downloadReportPng } from '../report'
import { DEFAULT_SIMILARITY_K, PHI } from '../golden-ratio'
import { formatRatio } from '@/utils/format'
import { MetricCard } from './MetricCard'
import { QualityPanel } from './QualityPanel'
import { RatioChart } from './RatioChart'
import { ResultViewer } from './ResultViewer'
import { SymmetryPanel } from './SymmetryPanel'
import { ThirdsBar } from './ThirdsBar'

interface ResultsViewProps {
  image: HTMLCanvasElement
  result: AnalysisResult
  onAnalyzeAnother: () => void
  onClear: () => void
}

export function ResultsView({ image, result, onAnalyzeAnother, onClear }: ResultsViewProps) {
  const [layers, setLayers] = useState<ReadonlySet<OverlayLayer>>(() => new Set(DEFAULT_LAYERS))
  const [hovered, setHovered] = useState<MetricId | null>(null)
  const [pinned, setPinned] = useState<MetricId | null>(null)
  const highlight = hovered ?? pinned
  const [hairline, setHairline] = useState<Point | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const measurements = useMemo(() => {
    if (!hairline) return result.measurements
    try {
      return computeMeasurements(result.landmarks, result.imageSize, { hairline })
    } catch {
      return result.measurements
    }
  }, [hairline, result])

  const toggleLayer = useCallback((layer: OverlayLayer) => {
    setLayers((current) => {
      const next = new Set(current)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  const togglePin = useCallback((id: MetricId) => setPinned((current) => (current === id ? null : id)), [])

  const onDownload = async () => {
    setExportError(null)
    setExporting(true)
    try {
      await downloadReportPng({ image, result, measurements, layers })
    } catch {
      setExportError('The report image could not be created on this device. You can still use Print and save as PDF.')
    } finally {
      setExporting(false)
    }
  }

  const overall = measurements.metrics.filter((metric) => METRIC_CATALOG.find((d) => d.id === metric.id)?.group === 'overall')
  const vertical = measurements.metrics.filter((metric) => METRIC_CATALOG.find((d) => d.id === metric.id)?.group === 'vertical')

  return (
    <div className="container-page py-8 sm:py-12">
      {/* Only visible when printing */}
      <div className="print-only mb-6 border-b border-line pb-4">
        <p className="font-display text-2xl">GoldenFace — Facial proportion report</p>
        <p className="text-sm text-muted">{new Date(result.analyzedAt).toLocaleString()} · generated on this device</p>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase">Analysis complete</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            Your facial proportions
          </h1>
          <p className="mt-3 text-muted">
            Measurements from {result.landmarks.length} facial landmarks, compared with the golden ratio where a
            comparison makes geometric sense.
          </p>
        </div>
        <div className="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={onAnalyzeAnother} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
            Analyze another photo
          </Button>
          <Button className="w-full sm:w-auto" variant="primary" onClick={onDownload} loading={exporting} icon={<Download className="size-4" aria-hidden="true" />}>
            Download PNG report
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" aria-hidden="true" />}>
            Print / save as PDF
          </Button>
          <Button className="w-full sm:w-auto" variant="ghost" onClick={onClear} icon={<Trash2 className="size-4" aria-hidden="true" />}>
            Clear photo &amp; results
          </Button>
        </div>
      </header>

      {exportError && (
        <Alert tone="error" className="no-print mt-5">
          {exportError}
        </Alert>
      )}

      <Alert tone="info" className="mt-6 print-avoid-break" title="A geometric exploration — not a beauty score">
        The golden ratio is one reference point among many. These numbers describe shapes in this one photo; they say
        nothing about attractiveness, health or character, and no overall score is given.
      </Alert>

      {measurements.hairline.status === 'invalid' && (
        <Alert tone="warning" className="no-print mt-4" title="The marked hairline was not used">
          {measurements.hairline.reason}
        </Alert>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-12 print:grid-cols-1">
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-20 print:static">
            <ResultViewer
              image={image}
              result={result}
              measurements={measurements}
              layers={layers}
              onToggleLayer={toggleLayer}
              highlight={highlight}
              hairline={hairline}
              onHairlineChange={setHairline}
            />
          </div>
        </div>

        <div className="space-y-8 lg:col-span-5">
          <section aria-labelledby="proportions-title">
            <h2 id="proportions-title" className="font-display text-2xl font-medium text-ink">
              Overall proportions
            </h2>
            <p className="no-print mt-1 text-sm text-muted">
              Hover, focus or tap the eye icon on a card to see exactly what was measured.
            </p>
            <div className="mt-4 space-y-3">
              {overall.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  active={highlight === metric.id}
                  pinned={pinned === metric.id}
                  onHover={setHovered}
                  onTogglePin={togglePin}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="thirds-title">
            <h2 id="thirds-title" className="font-display text-2xl font-medium text-ink">
              Vertical thirds
            </h2>
            <Card className="mt-4">
              <ThirdsBar thirds={measurements.thirds} />
              {!measurements.thirds.complete && measurements.hairline.status !== 'user' && (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  The upper third is missing because the hairline is hidden by hair and cannot be located reliably from
                  landmarks. Use <span className="font-medium text-ink">Mark hairline</span> above the photo to add it
                  yourself.
                </p>
              )}
            </Card>
            <div className="mt-3 space-y-3">
              {vertical.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  active={highlight === metric.id}
                  pinned={pinned === metric.id}
                  onHover={setHovered}
                  onTogglePin={togglePin}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2 print:grid-cols-1">
        <section aria-labelledby="chart-title" className="print-avoid-break">
          <h2 id="chart-title" className="font-display text-2xl font-medium text-ink">
            Compared with the golden ratio
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only ratios with a recognised golden-ratio claim are charted. Most facial proportions are not expected to
            equal {formatRatio(PHI)}.
          </p>
          <Card className="mt-4">
            <RatioChart metrics={measurements.metrics} />
          </Card>
        </section>

        <section aria-labelledby="symmetry-title" className="print-avoid-break">
          <h2 id="symmetry-title" className="font-display text-2xl font-medium text-ink">
            Geometric symmetry
          </h2>
          <Card className="mt-4">
            <SymmetryPanel symmetry={measurements.symmetry} quality={result.quality} />
          </Card>
        </section>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2 print:grid-cols-1">
        <section aria-labelledby="quality-title" className="print-avoid-break">
          <h2 id="quality-title" className="font-display text-2xl font-medium text-ink">
            Photo quality &amp; reliability
          </h2>
          <Card className="mt-4">
            <QualityPanel quality={result.quality} model={result.model} />
          </Card>
        </section>

        <section aria-labelledby="notes-title" className="print-avoid-break">
          <h2 id="notes-title" className="font-display text-2xl font-medium text-ink">
            Reading these numbers
          </h2>
          <Card className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
            <p>
              <span className="font-semibold text-ink">The formula. </span>
              For a pair of lengths A and B: r = max(A, B) ÷ min(A, B); deviation = |r − φ| ÷ φ; similarity = 100 ×
              e<sup>−k × deviation</sup>, with φ = 1.6180339887 and k = {DEFAULT_SIMILARITY_K}. The constant k only sets
              how fast the percentage falls off — it is not a medical threshold or a standard of beauty.
            </p>
            <p>
              <span className="font-semibold text-ink">Limits of a 2D photo. </span>
              Camera distance and lens distortion, the angle of the head, expression, lighting and image resolution all
              change measured widths and heights. A close-up selfie, for example, enlarges the nose and centre of the
              face relative to the ears. Landmarks are estimates and can be off by a few pixels.
            </p>
            <p>
              <span className="font-semibold text-ink">About the hairline. </span>
              The model finds no hairline, so face length is measured from the top of the landmark mesh (on the
              forehead) unless you mark the hairline yourself.
            </p>
            <p>
              <span className="font-semibold text-ink">Please keep perspective. </span>
              Research on perceived attractiveness does not support φ as a rule for faces. Use this as a way to look
              at geometry, not to judge yourself or anyone else.
            </p>
          </Card>
        </section>
      </div>
    </div>
  )
}
