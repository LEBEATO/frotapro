import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message: string
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin text-blue-400" />
        <p className="text-sm text-zinc-500">{message}</p>
      </div>
    </div>
  )
}
