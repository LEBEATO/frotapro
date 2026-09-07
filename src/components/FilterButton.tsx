import type { ReactNode } from 'react'

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm',
        active
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
