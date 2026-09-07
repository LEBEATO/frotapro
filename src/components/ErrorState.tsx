interface ErrorStateProps {
  title: string
  message: string
}

export function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <section role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
      <p className="text-sm font-semibold text-red-400">{title}</p>
      <p className="mt-1 text-xs text-red-300/80">{message}</p>
    </section>
  )
}
