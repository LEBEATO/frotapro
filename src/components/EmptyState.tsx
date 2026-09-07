import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
      <Icon aria-hidden="true" className="mx-auto h-9 w-9 text-zinc-700" />
      <p className="mt-3 font-medium text-zinc-300">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  )
}
