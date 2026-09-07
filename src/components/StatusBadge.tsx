interface StatusBadgeProps {
  label: string
  variant: 'neutral' | 'success' | 'warning'
}

const variants = {
  neutral: 'rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400',
  success: 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400',
  warning: 'rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400',
} as const

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return <span className={variants[variant]}>{label}</span>
}
