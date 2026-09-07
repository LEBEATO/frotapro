interface MetricProps {
  label: string
  value: string
}

export function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-100 sm:text-base">
        {value}
      </p>
    </div>
  )
}
