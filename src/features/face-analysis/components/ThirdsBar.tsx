import { formatShare } from '@/utils/format'
import type { ThirdsSummary } from '@/types'

const PARTS = [
  { key: 'upper', label: 'Upper third', hint: 'hairline → brows', tone: 'bg-champagne-300' },
  { key: 'middle', label: 'Middle third', hint: 'brows → nose base', tone: 'bg-champagne-500' },
  { key: 'lower', label: 'Lower third', hint: 'nose base → chin', tone: 'bg-navy' },
] as const

export function ThirdsBar({ thirds }: { thirds: ThirdsSummary }) {
  return (
    <div>
      <div
        className="flex h-12 overflow-hidden rounded-xl border border-line"
        role="img"
        aria-label={PARTS.map((part) => {
          const share = thirds.shares[part.key]
          return `${part.label}: ${share === null ? 'not measured' : formatShare(share)}`
        }).join(', ')}
      >
        {PARTS.map((part) => {
          const share = thirds.shares[part.key]
          if (share === null) {
            return (
              <div
                key={part.key}
                className="grid flex-1 place-items-center border-r border-dashed border-line-strong bg-ivory px-2 text-center text-[11px] leading-tight text-muted last:border-r-0"
              >
                Not measured
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
              {part.label}
            </dt>
            <dd className="pl-[1.125rem] text-xs text-muted">{part.hint}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
