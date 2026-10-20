import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-accent-300 bg-accent-50 px-3 py-1 text-xs font-medium tracking-wide text-accent-700',
        className,
      )}
    >
      {children}
    </span>
  )
}
