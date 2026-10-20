import { Alert } from '@/components/ui/Alert'
import { formatPercent, formatSignedPercent } from '@/utils/format'
import type { QualityReport, SymmetryReport } from '@/types'
import { QUALITY_THRESHOLDS } from '../quality'

export function SymmetryPanel({ symmetry, quality }: { symmetry: SymmetryReport; quality: QualityReport }) {
  const turned = quality.pose !== null && quality.pose.yaw > QUALITY_THRESHOLDS.yaw.warn

  if (symmetry.pairs.length === 0) {
    return (
      <Alert tone="warning" title="Symmetry was not measured">
        Too few left/right landmark pairs were available on this photo.
      </Alert>
    )
  }

  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Average left–right difference', value: symmetry.meanHorizontalDeviationPct, hint: 'distance to the midline' },
          { label: 'Largest left–right difference', value: symmetry.maxHorizontalDeviationPct, hint: 'single feature pair' },
          { label: 'Average height difference', value: symmetry.meanVerticalOffsetPct, hint: '% of face width' },
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
        <Alert tone="warning" className="mt-4" title="Head rotation inflates these numbers">
          The head is turned slightly, which makes one side look larger than the other. Retake a straight-on photo
          for a fairer reading.
        </Alert>
      )}

      <div
        className="mt-5 overflow-x-auto"
        role="region"
        aria-label="Symmetry table (scrolls sideways on small screens)"
        tabIndex={0}
      >
        <table className="w-full min-w-[28rem] text-left text-sm">
          <caption className="sr-only">Left–right differences per pair of landmarks</caption>
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Feature pair</th>
              <th scope="col" className="py-2 pr-3 font-medium">Side difference</th>
              <th scope="col" className="py-2 font-medium">Height difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {symmetry.pairs.map((pair) => (
              <tr key={pair.id}>
                <th scope="row" className="py-2.5 pr-3 font-medium text-ink">{pair.label}</th>
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
          Not measured: {symmetry.skippedPairs.map((pair) => pair.label).join(', ')}.
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-ink">How to read this. </span>
        A positive side difference means the subject’s left-hand point sits farther from the midline than its right-hand
        partner; a positive height difference means the left point sits lower. On the photo, a ring marks where the right-side
        point would land if the face were perfectly mirrored. Every face has some natural asymmetry — perfect
        symmetry is neither expected nor “better”.
      </p>
    </div>
  )
}
