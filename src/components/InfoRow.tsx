import type { LucideIcon } from 'lucide-react'

interface InfoRowProps {
  icon: LucideIcon
  label: string
  value: string
  textOverflow?: 'wrap' | 'truncate'
}

export function InfoRow({
  icon: Icon,
  label,
  value,
  textOverflow = 'wrap',
}: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-zinc-600">
          {label}
        </p>
        <p
          className={textOverflow === 'truncate'
            ? 'mt-0.5 truncate text-sm font-medium text-zinc-300'
            : 'mt-0.5 wrap-break-word text-sm font-medium text-zinc-300'}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
