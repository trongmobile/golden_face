import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { QualityReport, QualityStatus } from '@/types'
import { cn } from '@/utils/cn'

const RELIABILITY_COPY = {
  good: {
    label: 'Good',
    text: 'No capture problems were found. Remaining differences come from the natural limits of measuring a 2D photo.',
  },
  fair: {
    label: 'Fair',
    text: 'A few conditions may shift the numbers slightly. Read the notes below and retake the photo if you want steadier results.',
  },
  limited: {
    label: 'Limited',
    text: 'Several capture conditions may noticeably affect the numbers. Treat the results as rough and consider retaking the photo.',
  },
} as const

const STATUS_ICON: Record<QualityStatus, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  pass: { Icon: CheckCircle2, className: 'text-navy', label: 'OK' },
  warn: { Icon: AlertTriangle, className: 'text-champagne-700', label: 'Note' },
  fail: { Icon: XCircle, className: 'text-[#9a3f2b]', label: 'Problem' },
}

export function QualityPanel({ quality, model }: { quality: QualityReport; model: { name: string; delegate: string } }) {
  const summary = RELIABILITY_COPY[quality.reliability]
  const ordered = [...quality.checks].sort((a, b) => {
    const rank = { fail: 0, warn: 1, pass: 2 } as const
    return rank[a.status] - rank[b.status]
  })

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">Capture quality</p>
        <p className="font-display text-2xl font-medium text-ink">{summary.label}</p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{summary.text}</p>

      <ul className="mt-4 divide-y divide-line">
        {ordered.map((check) => {
          const { Icon, className, label } = STATUS_ICON[check.status]
          return (
            <li key={check.id} className="flex gap-3 py-3">
              <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {check.label} <span className="sr-only">— {label}</span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{check.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        These checks are simple heuristics, not a confidence score from the model. Hands, hair, glasses or masks that
        cover part of the face cannot be detected reliably — the model estimates the hidden landmarks.
        Landmarks by {model.name} ({model.delegate} delegate).
      </p>
    </div>
  )
}
