import { Eye, EyeOff } from 'lucide-react'
import { useI18n, type MsgKey } from '@/i18n'
import { cn } from '@/utils/cn'
import { formatPercent, formatRatio } from '@/utils/format'
import type { MetricResult } from '@/types'
import { METRIC_BY_ID, type MetricId } from '../metric-catalog'
import { PHI } from '../golden-ratio'

interface MetricCardProps {
  metric: MetricResult
  /** This metric is currently emphasised on the photo (hovered, focused or pinned). */
  active: boolean
  /** The user pinned this metric with the eye button, so it stays emphasised. */
  pinned: boolean
  /** Temporary emphasis while the pointer or keyboard focus is on the card. */
  onHover: (id: MetricId | null) => void
  onTogglePin: (id: MetricId) => void
}

export function MetricCard({ metric, active, pinned, onHover, onTogglePin }: MetricCardProps) {
  const { t, lang } = useI18n()
  const definition = METRIC_BY_ID[metric.id]
  const label = t(`metrics.items.${metric.id}.label`)

  if (metric.status === 'skipped') {
    return (
      <article
        className="print-avoid-break rounded-2xl border border-dashed border-line-strong bg-mist p-4"
        aria-label={t('results.metric.notMeasuredLabel', { label })}
      >
        <h4 className="text-sm font-semibold text-ink">{label}</h4>
        <p className="mt-1 text-xs font-semibold tracking-wide text-accent-700 uppercase">
          {t('results.metric.notMeasured')}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(metric.reason)}</p>
      </article>
    )
  }

  const goldenNote = t(`metrics.items.${metric.id}.goldenNote`)
  const segmentName = (id: typeof metric.numerator.id) => t(`metrics.segments.${id}`)

  const { golden } = metric
  return (
    <article
      onMouseEnter={() => onHover(metric.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(metric.id)}
      onBlur={() => onHover(null)}
      className={cn(
        'print-avoid-break rounded-2xl border bg-paper p-4 transition-colors sm:p-5',
        active ? 'border-accent-500 shadow-soft' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink">{label}</h4>
          {definition.goldenEligible && (
            <p className="mt-1 text-xs font-semibold tracking-wide text-accent-700 uppercase">
              {t('results.metric.comparedWithPhi')}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-pressed={pinned}
          aria-label={t(pinned ? 'results.metric.pinHide' : 'results.metric.pinShow', { label })}
          onClick={() => onTogglePin(metric.id)}
          className={cn(
            'no-print grid size-9 shrink-0 place-items-center rounded-full border text-muted hover:border-ink hover:text-ink',
            pinned ? 'border-ink bg-accent-100 text-ink' : 'border-line',
          )}
        >
          {pinned ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>

      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl font-medium text-ink tabular-nums">{formatRatio(metric.ratio)}</span>
        <span className="text-xs text-muted">
          {t('results.metric.ratioOf', {
            numerator: segmentName(metric.numerator.id),
            denominator: segmentName(metric.denominator.id),
          })}
        </span>
      </p>

      {golden ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-accent-50 p-3.5 text-sm">
          <div>
            <dt className="text-xs text-muted">{t('results.metric.referenceRatio')}</dt>
            <dd className="font-semibold tabular-nums">{formatRatio(PHI)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('results.metric.measuredR')}</dt>
            <dd className="font-semibold tabular-nums">{formatRatio(golden.ratio)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('results.metric.deviation')}</dt>
            <dd className="font-semibold tabular-nums">{formatPercent(golden.error * 100)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('results.metric.similarity')}</dt>
            <dd className="font-semibold tabular-nums">{formatPercent(golden.similarity, 0)}</dd>
          </div>
          <div className="col-span-2" aria-hidden="true">
            <div className="h-1.5 overflow-hidden rounded-full bg-accent-200">
              <div className="h-full rounded-full bg-accent-600" style={{ width: `${golden.similarity}%` }} />
            </div>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t('results.metric.plain', { note: goldenNote.charAt(0).toLocaleLowerCase(lang) + goldenNote.slice(1) })}
        </p>
      )}

      <details className="group mt-4 text-sm">
        <summary className="cursor-pointer rounded text-sm font-medium text-ink underline decoration-accent-400 decoration-2 underline-offset-4 marker:text-accent-700">
          {t('results.metric.how')}
        </summary>
        <div className="mt-3 space-y-2.5 leading-relaxed text-muted">
          <p>{t(`metrics.items.${metric.id}.meaning`)}</p>
          <p>
            <span className="font-semibold text-ink">{t('results.metric.formula')} </span>
            {t(`metrics.items.${metric.id}.formula`)}
          </p>
          <p>
            <span className="font-semibold text-ink">{t('results.metric.values')} </span>
            {t('results.metric.valuesText', {
              numerator: segmentName(metric.numerator.id),
              numeratorPx: metric.numerator.value.toFixed(0),
              numeratorSource: t(metric.numerator.source),
              denominator: segmentName(metric.denominator.id),
              denominatorPx: metric.denominator.value.toFixed(0),
              denominatorSource: t(metric.denominator.source),
            })}
          </p>
          <p>
            <span className="font-semibold text-ink">{t('results.metric.goldenComparison')} </span>
            {goldenNote}
          </p>
          {definition.hasCaveat && (
            <p>
              <span className="font-semibold text-ink">{t('results.metric.keepInMind')} </span>
              {t(`metrics.items.${metric.id}.caveat` as MsgKey)}
            </p>
          )}
        </div>
      </details>
    </article>
  )
}
