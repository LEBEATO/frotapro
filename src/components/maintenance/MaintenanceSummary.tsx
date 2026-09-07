import { AlertTriangle, Clock3, Wrench } from 'lucide-react'

interface MaintenanceSummaryProps {
  recordCount: number
  pendingCount: number
  inProgressCount: number
}

export function MaintenanceSummary({ recordCount, pendingCount, inProgressCount }: MaintenanceSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

      <SummaryCard
        label="Total aberto"
        value={
          recordCount
        }
        icon={Wrench}
      />

      <SummaryCard
        label="Pendentes"
        value={
          pendingCount
        }
        icon={
          AlertTriangle
        }
      />

      <SummaryCard
        label="Em andamento"
        value={
          inProgressCount
        }
        icon={Clock3}
      />

    </section>
  )
}

type IconType =
  React.ComponentType<{
    className?: string
  }>

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: IconType
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

      <div className="flex items-center justify-between gap-4">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>

        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
          <Icon className="h-5 w-5" />
        </div>

      </div>

    </article>
  )
}
