import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export type AlertTone = 'info' | 'warning' | 'error' | 'success'

const tones: Record<AlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: 'border-line bg-accent-50 text-ink', icon: 'text-accent-700', Icon: Info },
  warning: { box: 'border-accent-300 bg-accent-100/70 text-ink', icon: 'text-accent-700', Icon: AlertTriangle },
  error: { box: 'border-[#e3c2b8] bg-[#fbf1ee] text-ink', icon: 'text-[#9a3f2b]', Icon: XCircle },
  success: { box: 'border-line bg-paper text-ink', icon: 'text-navy', Icon: CheckCircle2 },
}

interface AlertProps {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
  /** Use "alert" for errors that appear after an action, "status" for gentle updates. */
  role?: 'alert' | 'status' | 'note'
}

export function Alert({ tone = 'info', title, children, actions, className, role }: AlertProps) {
  const { box, icon, Icon } = tones[tone]
  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={cn('flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed', box, className)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-muted', title && 'mt-1')}>{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
