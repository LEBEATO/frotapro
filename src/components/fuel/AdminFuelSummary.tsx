import type { ComponentType } from 'react'
import { Building2, Droplets, Fuel, Gauge, WalletCards } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { formatNumber } from './admin-formatters'

type IconType = ComponentType<{ className?: string }>

interface AdminFuelSummaryProps {
  recordCount: number
  activeBranches: number
  totalAmount: number
  totalLiters: number
  averagePrice: number
  totalDistance: number
}

export function AdminFuelSummary({ recordCount, activeBranches, totalAmount, totalLiters, averagePrice, totalDistance }: AdminFuelSummaryProps) {
  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-6">

      <StatCard
        label="Abastecimentos"
        value={String(
          recordCount
        )}
        icon={Fuel}
      />

      <StatCard
        label="Bases"
        value={String(
          activeBranches
        )}
        icon={Building2}
      />

      <StatCard
        label="Total gasto"
        value={formatCurrency(
          totalAmount
        )}
        icon={WalletCards}
      />

      <StatCard
        label="Litros"
        value={`${formatNumber(
          totalLiters
        )} L`}
        icon={Droplets}
      />

      <StatCard
        label="Preço médio"
        value={`${formatCurrency(
          averagePrice
        )}/L`}
        icon={Fuel}
      />

      <StatCard
        label="KM percorrido"
        value={`${formatNumber(
          totalDistance
        )} km`}
        icon={Gauge}
      />

    </section>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: IconType
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>

          <p className="mt-2 wrap-break-word text-xl font-bold text-white sm:text-2xl">
            {value}
          </p>

        </div>

        <div className="shrink-0 rounded-xl bg-blue-500/10 p-3 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>

      </div>

    </article>
  )
}
