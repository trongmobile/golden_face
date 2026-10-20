import { cn } from '@/utils/cn'

/** The GoldenFace mark: a face oval inside a golden-ratio rectangle with its spiral. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-8', className)} fill="none" aria-hidden="true">
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="11" className="fill-navy" />
      <path
        d="M31 33 A12 12 0 0 1 19 21 A7.4 7.4 0 0 1 26.4 13.6 A4.6 4.6 0 0 1 31 18.2 A2.8 2.8 0 0 1 28.2 21 A1.7 1.7 0 0 1 26.5 19.3"
        stroke="#d4b87e"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse cx="20" cy="20" rx="7.2" ry="11.6" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.3" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-xl font-medium tracking-tight text-ink">
        Golden<span className="text-champagne-700">Face</span>
      </span>
    </span>
  )
}
