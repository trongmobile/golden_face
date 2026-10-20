import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'onDark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white shadow-soft hover:bg-navy-soft',
  gold: 'bg-accent-400 text-ink shadow-soft hover:bg-accent-300',
  secondary: 'border border-line-strong bg-paper text-ink hover:border-ink hover:bg-mist',
  ghost: 'text-ink hover:bg-accent-100',
  onDark: 'border border-white/25 bg-white/5 text-white hover:bg-white/15',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string {
  return cn(base, variants[variant], sizes[size], className)
}
