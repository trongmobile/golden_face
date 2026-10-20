import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { QualityReport, QualityStatus } from '@/types'
import { cn } from '@/utils/cn'

const STATUS_ICON: Record<QualityStatus, { Icon: typeof CheckCircle2; className: string }> = {
  pass: { Icon: CheckCircle2, className: 'text-navy' },
  warn: { Icon: AlertTriangle, className: 'text-accent-700' },
  fail: { Icon: XCircle, className: 'text-[#9a3f2b]' },
}

export function QualityPanel({ quality, model }: { quality: QualityReport; model: { name: string; delegate: string } }) {
  const { t } = useI18n()
  const ordered = [...quality.checks].sort((a, b) => {
    const rank = { fail: 0, warn: 1, pass: 2 } as const
    return rank[a.status] - rank[b.status]
  })

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{t('quality.panel.capture')}</p>
        <p className="font-display text-2xl font-medium text-ink">
          {t(`quality.panel.reliability.${quality.reliability}.label`)}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {t(`quality.panel.reliability.${quality.reliability}.text`)}
      </p>

      <ul className="mt-4 divide-y divide-line">
        {ordered.map((check) => {
          const { Icon, className } = STATUS_ICON[check.status]
          return (
            <li key={check.id} className="flex gap-3 py-3">
              <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {t(check.label)} <span className="sr-only">— {t(`quality.panel.status.${check.status}`)}</span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{t(check.detail)}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {t('quality.panel.footnote', { name: model.name, delegate: model.delegate })}
      </p>
    </div>
  )
}
