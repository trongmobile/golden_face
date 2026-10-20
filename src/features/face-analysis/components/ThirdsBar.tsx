import { useI18n, type MsgKey } from '@/i18n'
import { formatShare } from '@/utils/format'
import type { ThirdsSummary } from '@/types'

const PARTS: readonly { key: 'upper' | 'middle' | 'lower'; label: MsgKey; hint: MsgKey; tone: string }[] = [
  { key: 'upper', label: 'results.thirds.upper', hint: 'results.thirds.upperHint', tone: 'bg-accent-200' },
  { key: 'middle', label: 'results.thirds.middle', hint: 'results.thirds.middleHint', tone: 'bg-accent-400' },
  { key: 'lower', label: 'results.thirds.lower', hint: 'results.thirds.lowerHint', tone: 'bg-navy' },
]

export function ThirdsBar({ thirds }: { thirds: ThirdsSummary }) {
  const { t } = useI18n()
  return (
    <div>
      <div
        className="flex h-12 overflow-hidden rounded-xl border border-line"
        role="img"
        aria-label={PARTS.map((part) => {
          const share = thirds.shares[part.key]
          return t('results.thirds.ariaPart', {
            part: t(part.label),
            value: share === null ? t('results.thirds.notMeasuredLabel') : formatShare(share),
          })
        }).join(', ')}
      >
        {PARTS.map((part) => {
          const share = thirds.shares[part.key]
          if (share === null) {
            return (
              <div
                key={part.key}
                className="grid flex-1 place-items-center border-r border-dashed border-line-strong bg-mist px-2 text-center text-[11px] leading-tight text-muted last:border-r-0"
              >
                {t('results.thirds.notMeasuredCell')}
              </div>
            )
          }
          return (
            <div
              key={part.key}
              className={`${part.tone} grid place-items-center text-sm font-semibold tabular-nums ${part.key === 'lower' ? 'text-white' : 'text-ink'}`}
              style={{ flexGrow: share, flexBasis: 0 }}
            >
              {formatShare(share)}
            </div>
          )
        })}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        {PARTS.map((part) => (
          <div key={part.key}>
            <dt className="flex items-center gap-2 font-medium text-ink">
              <span className={`size-2.5 shrink-0 rounded-full ${part.tone}`} aria-hidden="true" />
              {t(part.label)}
            </dt>
            <dd className="pl-[1.125rem] text-xs text-muted">{t(part.hint)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
