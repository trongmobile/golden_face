import { Eye, EyeOff } from 'lucide-react'
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
  const definition = METRIC_BY_ID[metric.id]

  if (metric.status === 'skipped') {
    return (
      <article
        className="print-avoid-break rounded-2xl border border-dashed border-line-strong bg-ivory p-4"
        aria-label={`${definition.label}: not measured`}
      >
        <h4 className="text-sm font-semibold text-ink">{definition.label}</h4>
        <p className="mt-1 text-xs font-semibold tracking-wide text-champagne-700 uppercase">Not measured</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{metric.reason}</p>
      </article>
    )
  }

  const { golden } = metric
  return (
    <article
      onMouseEnter={() => onHover(metric.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(metric.id)}
      onBlur={() => onHover(null)}
      className={cn(
        'print-avoid-break rounded-2xl border bg-paper p-4 transition-colors sm:p-5',
        active ? 'border-champagne-500 shadow-soft' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink">{definition.label}</h4>
          {definition.goldenEligible && (
            <p className="mt-1 text-xs font-semibold tracking-wide text-champagne-700 uppercase">
              Compared with φ
            </p>
          )}
        </div>
        <button
          type="button"
          aria-pressed={pinned}
          aria-label={`${pinned ? 'Stop showing' : 'Keep showing'} ${definition.label} on the photo`}
          onClick={() => onTogglePin(metric.id)}
          className={cn(
            'no-print grid size-9 shrink-0 place-items-center rounded-full border text-muted hover:border-ink hover:text-ink',
            pinned ? 'border-ink bg-champagne-100 text-ink' : 'border-line',
          )}
        >
          {pinned ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>

      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl font-medium text-ink tabular-nums">{formatRatio(metric.ratio)}</span>
        <span className="text-xs text-muted">
          {metric.numerator.label} ÷ {metric.denominator.label}
        </span>
      </p>

      {golden ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-champagne-50 p-3.5 text-sm">
          <div>
            <dt className="text-xs text-muted">Reference ratio φ</dt>
            <dd className="font-semibold tabular-nums">{formatRatio(PHI)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Measured r (larger ÷ smaller)</dt>
            <dd className="font-semibold tabular-nums">{formatRatio(golden.ratio)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Relative deviation from φ</dt>
            <dd className="font-semibold tabular-nums">{formatPercent(golden.error * 100)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Geometric similarity to the reference golden ratio</dt>
            <dd className="font-semibold tabular-nums">{formatPercent(golden.similarity, 0)}</dd>
          </div>
          <div className="col-span-2" aria-hidden="true">
            <div className="h-1.5 overflow-hidden rounded-full bg-champagne-200">
              <div className="h-full rounded-full bg-champagne-600" style={{ width: `${golden.similarity}%` }} />
            </div>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Plain proportion — {definition.goldenNote.charAt(0).toLowerCase() + definition.goldenNote.slice(1)}
        </p>
      )}

      <details className="group mt-4 text-sm">
        <summary className="cursor-pointer rounded text-sm font-medium text-ink underline decoration-champagne-400 decoration-2 underline-offset-4 marker:text-champagne-700">
          How is this measured?
        </summary>
        <div className="mt-3 space-y-2.5 leading-relaxed text-muted">
          <p>{definition.meaning}</p>
          <p>
            <span className="font-semibold text-ink">Formula: </span>
            {definition.formula}
          </p>
          <p>
            <span className="font-semibold text-ink">Measured values: </span>
            {metric.numerator.label} {metric.numerator.value.toFixed(0)} px ({metric.numerator.source}),{' '}
            {metric.denominator.label} {metric.denominator.value.toFixed(0)} px ({metric.denominator.source}).
          </p>
          <p>
            <span className="font-semibold text-ink">Golden-ratio comparison: </span>
            {definition.goldenNote}
          </p>
          {definition.caveat && (
            <p>
              <span className="font-semibold text-ink">Keep in mind: </span>
              {definition.caveat}
            </p>
          )}
        </div>
      </details>
    </article>
  )
}
