import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Loader2 } from 'lucide-react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
