import { cn } from '@/utils/cn'

/** A placeholder block with a subtle shimmer. Decorative: announce loading elsewhere. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden rounded-xl bg-accent-100/80', className)}
    >
      <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}
