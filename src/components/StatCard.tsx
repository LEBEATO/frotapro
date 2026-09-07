import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  variant?: 'default' | 'compact' | 'outlined'
}

// Preserve the spacing and icon treatment of the existing indicator cards.
const variants = {
  default: {
    row: 'flex items-center justify-between gap-4',
    value: 'mt-2 text-3xl font-bold text-white',
    icon: 'rounded-xl bg-blue-500/10 p-3 text-blue-400',
  },
  compact: {
    row: 'flex items-center justify-between',
    value: 'mt-2 text-3xl font-bold text-white',
    icon: 'rounded-xl bg-blue-500/10 p-3 text-blue-400',
  },
  outlined: {
    row: 'flex items-center justify-between gap-4',
    value: 'mt-2 text-3xl font-bold tracking-tight text-white',
    icon: 'rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400',
  },
} as const

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: StatCardProps) {
  const styles = variants[variant]

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className={styles.row}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p className={styles.value}>{value}</p>
        </div>
        <div className={styles.icon}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  )
}
