import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({ className, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-card border border-line bg-paper shadow-soft', padded && 'p-5 sm:p-6', className)}
      {...rest}
    />
  )
}
