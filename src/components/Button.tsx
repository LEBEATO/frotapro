import type { MouseEventHandler, ReactNode } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'

interface ButtonProps {
  children: ReactNode
  variant?: 'secondary'
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  loading?: boolean
  icon?: LucideIcon
  // Permite preservar o spinner já usado pela página.
  loadingIcon?: LucideIcon
  'aria-label'?: string
}

const variants = {
  secondary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50',
} as const

export function Button({
  children,
  variant = 'secondary',
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  loadingIcon: LoadingIcon = Loader2,
  'aria-label': ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={variants[variant]}
    >
      {loading ? (
        <LoadingIcon aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon aria-hidden="true" className="h-4 w-4" />
      ) : null}
      {children}
    </button>
  )
}
