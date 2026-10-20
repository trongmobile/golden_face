import { useCallback, useMemo, useState } from 'react'
import { Download, Printer, RefreshCw, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useI18n } from '@/i18n'
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
  const { t, lang, rich } = useI18n()
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
      await downloadReportPng({ image, result, measurements, layers, t, locale: lang })
    } catch {
      setExportError(t('results.exportError'))
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
        <p className="font-display text-2xl">{t('results.print.title')}</p>
        <p className="text-sm text-muted">
          {t('results.print.meta', { date: new Date(result.analyzedAt).toLocaleString(lang) })}
        </p>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase">{t('results.header.eyebrow')}</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            {t('results.header.title')}
          </h1>
          <p className="mt-3 text-muted">{t('results.header.intro', { count: result.landmarks.length })}</p>
        </div>
        <div className="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={onAnalyzeAnother} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
            {t('results.actions.another')}
          </Button>
          <Button className="w-full sm:w-auto" variant="primary" onClick={onDownload} loading={exporting} icon={<Download className="size-4" aria-hidden="true" />}>
            {t('results.actions.download')}
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" aria-hidden="true" />}>
            {t('results.actions.print')}
          </Button>
          <Button className="w-full sm:w-auto" variant="ghost" onClick={onClear} icon={<Trash2 className="size-4" aria-hidden="true" />}>
            {t('results.actions.clear')}
          </Button>
        </div>
      </header>

      {exportError && (
        <Alert tone="error" className="no-print mt-5">
          {exportError}
        </Alert>
      )}

      <Alert tone="info" className="mt-6 print-avoid-break" title={t('results.notice.title')}>
        {t('results.notice.text')}
      </Alert>

      {measurements.hairline.status === 'invalid' && (
        <Alert tone="warning" className="no-print mt-4" title={t('results.hairlineIgnored')}>
          {t(measurements.hairline.reason)}
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
              {t('results.sections.overall')}
            </h2>
            <p className="no-print mt-1 text-sm text-muted">{t('results.sections.overallHint')}</p>
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
              {t('results.sections.thirds')}
            </h2>
            <Card className="mt-4">
              <ThirdsBar thirds={measurements.thirds} />
              {!measurements.thirds.complete && measurements.hairline.status !== 'user' && (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {rich('results.sections.thirdsMissing', { b: (c) => <span className="font-medium text-ink">{c}</span> })}
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
            {t('results.sections.chart')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('results.sections.chartHint', { phi: formatRatio(PHI) })}</p>
          <Card className="mt-4">
            <RatioChart metrics={measurements.metrics} />
          </Card>
        </section>

        <section aria-labelledby="symmetry-title" className="print-avoid-break">
          <h2 id="symmetry-title" className="font-display text-2xl font-medium text-ink">
            {t('results.sections.symmetry')}
          </h2>
          <Card className="mt-4">
            <SymmetryPanel symmetry={measurements.symmetry} quality={result.quality} />
          </Card>
        </section>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2 print:grid-cols-1">
        <section aria-labelledby="quality-title" className="print-avoid-break">
          <h2 id="quality-title" className="font-display text-2xl font-medium text-ink">
            {t('results.sections.quality')}
          </h2>
          <Card className="mt-4">
            <QualityPanel quality={result.quality} model={result.model} />
          </Card>
        </section>

        <section aria-labelledby="notes-title" className="print-avoid-break">
          <h2 id="notes-title" className="font-display text-2xl font-medium text-ink">
            {t('results.sections.notes')}
          </h2>
          <Card className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
            <p>
              <span className="font-semibold text-ink">{t('results.notes.formulaTitle')} </span>
              {rich('results.notes.formula', { sup: (c) => <sup>{c}</sup> }, { k: DEFAULT_SIMILARITY_K })}
            </p>
            <p>
              <span className="font-semibold text-ink">{t('results.notes.limitsTitle')} </span>
              {t('results.notes.limits')}
            </p>
            <p>
              <span className="font-semibold text-ink">{t('results.notes.hairlineTitle')} </span>
              {t('results.notes.hairline')}
            </p>
            <p>
              <span className="font-semibold text-ink">{t('results.notes.perspectiveTitle')} </span>
              {t('results.notes.perspective')}
            </p>
          </Card>
        </section>
      </div>
    </div>
  )
}
