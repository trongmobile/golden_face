import { Alert } from '@/components/ui/Alert'
import { useI18n } from '@/i18n'
import { formatPercent, formatSignedPercent } from '@/utils/format'
import type { QualityReport, SymmetryReport } from '@/types'
import { QUALITY_THRESHOLDS } from '../quality'

export function SymmetryPanel({ symmetry, quality }: { symmetry: SymmetryReport; quality: QualityReport }) {
  const { t } = useI18n()
  const turned = quality.pose !== null && quality.pose.yaw > QUALITY_THRESHOLDS.yaw.warn

  if (symmetry.pairs.length === 0) {
    return (
      <Alert tone="warning" title={t('results.symmetry.notMeasuredTitle')}>
        {t('results.symmetry.notMeasuredText')}
      </Alert>
    )
  }

  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t('results.symmetry.averageSide'), value: symmetry.meanHorizontalDeviationPct, hint: t('results.symmetry.averageSideHint') },
          { label: t('results.symmetry.largestSide'), value: symmetry.maxHorizontalDeviationPct, hint: t('results.symmetry.largestSideHint') },
          { label: t('results.symmetry.averageHeight'), value: symmetry.meanVerticalOffsetPct, hint: t('results.symmetry.averageHeightHint') },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-accent-50 p-4">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-3xl font-medium text-ink tabular-nums">
              {item.value === null ? '—' : formatPercent(item.value)}
            </dd>
            <dd className="text-xs text-muted">{item.hint}</dd>
          </div>
        ))}
      </dl>

      {turned && (
        <Alert tone="warning" className="mt-4" title={t('results.symmetry.turnedTitle')}>
          {t('results.symmetry.turnedText')}
        </Alert>
      )}

      <div
        className="mt-5 overflow-x-auto"
        role="region"
        aria-label={t('results.symmetry.tableLabel')}
        tabIndex={0}
      >
        <table className="w-full min-w-[28rem] text-left text-sm">
          <caption className="sr-only">{t('results.symmetry.caption')}</caption>
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">{t('results.symmetry.pair')}</th>
              <th scope="col" className="py-2 pr-3 font-medium">{t('results.symmetry.side')}</th>
              <th scope="col" className="py-2 font-medium">{t('results.symmetry.height')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {symmetry.pairs.map((pair) => (
              <tr key={pair.id}>
                <th scope="row" className="py-2.5 pr-3 font-medium text-ink">{t(`metrics.symmetryPairs.${pair.id}`)}</th>
                <td className="py-2.5 pr-3 tabular-nums text-muted">
                  {formatSignedPercent(pair.horizontalDeviationPct)}
                </td>
                <td className="py-2.5 tabular-nums text-muted">{formatSignedPercent(pair.verticalOffsetPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {symmetry.skippedPairs.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {t('results.symmetry.skipped', {
            features: symmetry.skippedPairs.map((pair) => t(`metrics.symmetryPairs.${pair.id}`)).join(', '),
          })}
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-ink">{t('results.symmetry.howTitle')} </span>
        {t('results.symmetry.how')}
      </p>
    </div>
  )
}
