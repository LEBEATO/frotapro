import type { ComponentType } from 'react'
import { Building2, Droplets, Fuel, MapPin, UserRound, WalletCards } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { formatDate, formatNumber } from './admin-formatters'
import type { FuelRecord, BranchRow } from './admin-types'

type IconType = ComponentType<{ className?: string }>

interface AdminFuelRecordCardProps {
  record: FuelRecord
  branch: BranchRow | null | undefined
  consumption: number | null
}

export function AdminFuelRecordCard({ record, branch, consumption }: AdminFuelRecordCardProps) {
  return (
    <article
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6"
    >

      {/* CABEÇALHO DO CARD */}

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-3">

          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
            <Fuel className="h-5 w-5" />
          </div>

          <div>

            <p className="font-mono text-sm font-bold uppercase text-white">
              {record.vehicle_plate}
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              {record.vehicle_model}
            </p>

          </div>

        </div>

        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
          {record.fuel_type}
        </span>

      </div>

      {/* BASE */}

      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">

        <div className="flex items-start gap-3">

          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
              Base
            </p>

            <p className="mt-1 text-sm font-semibold text-zinc-300">
              {branch?.name ??
                'Base não identificada'}
            </p>

            {branch && (
              <p className="mt-1 text-xs text-zinc-500">
                {branch.city}
                {' • '}
                Código {branch.code}
              </p>
            )}

          </div>

        </div>

      </div>

      {/* DADOS */}

      <div className="mt-5 grid gap-4 border-t border-zinc-800 pt-5 sm:grid-cols-2">

        <Info
          icon={UserRound}
          label="Motorista"
          value={
            record.driver ||
            'Não informado'
          }
        />

        <Info
          icon={MapPin}
          label="Posto"
          value={
            record.fuel_station ||
            'Não informado'
          }
        />

        <Info
          icon={Droplets}
          label="Litros"
          value={
            record.liters != null
              ? `${formatNumber(
                  record.liters
                )} L`
              : 'Não informado'
          }
        />

        <Info
          icon={WalletCards}
          label="Valor total"
          value={
            record.total_amount != null
              ? formatCurrency(
                  record.total_amount
                )
              : 'Não informado'
          }
        />

      </div>

      {/* MÉTRICAS */}

      <div className="mt-4 grid grid-cols-3 gap-3">

        <MetricBox
          label="KM anterior"
          value={
            record.previous_km != null
              ? `${record.previous_km.toLocaleString(
                  'pt-BR'
                )} km`
              : '-'
          }
        />

        <MetricBox
          label="KM atual"
          value={
            record.current_km != null
              ? `${record.current_km.toLocaleString(
                  'pt-BR'
                )} km`
              : '-'
          }
        />

        <MetricBox
          label="Consumo"
          value={
            consumption != null
              ? `${formatNumber(
                  consumption
                )} km/L`
              : '-'
          }
        />

      </div>

      {/* DATA */}

      <div className="mt-4 border-t border-zinc-800 pt-4">

        <p className="text-xs text-zinc-500">
          Registrado em{' '}
          <span className="font-medium text-zinc-300">
            {formatDate(
              record.submitted_at ??
                record.created_at
            )}
          </span>
        </p>

      </div>

    </article>
  )
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">

      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />

      <div className="min-w-0">

        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {label}
        </p>

        <p className="mt-1 wrap-break-word text-sm font-medium text-zinc-300">
          {value}
        </p>

      </div>

    </div>
  )
}

function MetricBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">

      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-zinc-200">
        {value}
      </p>

    </div>
  )
}
