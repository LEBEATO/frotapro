'use client'

import { Car, TrendingDown, TrendingUp } from 'lucide-react'
import { Metric } from '@/components/Metric'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { VehicleFuelStat } from './types'

export function VehicleAverageCard({
  stat,
  onDetails,
}: {
  stat: VehicleFuelStat
  onDetails: () => void
}) {
  const difference =
    stat.differencePercent

  const isBetter =
    difference != null &&
    difference >= 0

  const isWorse =
    difference != null &&
    difference < 0

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <Car className="h-5 w-5" />
          </div>

          <div>

            <h3 className="font-semibold text-white">
              {stat.vehicleModel}
            </h3>

            <p className="mt-0.5 text-xs text-zinc-500">
              {stat.vehiclePlate}
            </p>

          </div>

        </div>

        <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300">
          {stat.fuelType}
        </span>

      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <Metric
          label="Média"
          value={
            stat.averageKmPerLiter >
            0
              ? `${stat.averageKmPerLiter.toFixed(
                  2
                )} km/L`
              : '--'
          }
        />

        <Metric
          label="Custo médio/km"
          value={
            stat.averageCostPerKm >
            0
              ? formatCurrency(
                  stat.averageCostPerKm
                )
              : '--'
          }
        />

        <Metric
          label="Litros"
          value={`${formatNumber(
            stat.totalLiters,
            2
          )} L`}
        />

        <Metric
          label="Total gasto"
          value={formatCurrency(
            stat.totalAmount
          )}
        />

      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">

        <div className="flex items-center justify-between gap-3">

          <div>

            <p className="text-xs text-zinc-500">
              Último consumo
            </p>

            <p className="mt-1 font-semibold text-zinc-200">
              {stat.latestKmPerLiter >
              0
                ? `${stat.latestKmPerLiter.toFixed(
                    2
                  )} km/L`
                : '--'}
            </p>

          </div>

          {difference != null && (
            <div
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                isBetter
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/10 text-amber-300'
              }`}
            >
              {isBetter ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}

              {isBetter
                ? '+'
                : '-'}
              {Math.abs(
                difference
              ).toFixed(1)}
              %
            </div>
          )}

        </div>

        {isWorse && (
          <p className="mt-3 text-xs leading-5 text-amber-300/80">
            O último abastecimento ficou abaixo do histórico anterior deste veículo com {stat.fuelType}.
          </p>
        )}

      </div>

      <div className="mt-4 flex items-center justify-between gap-3">

        <p className="text-xs text-zinc-600">
          {stat.records}{' '}
          abastecimento
          {stat.records === 1
            ? ''
            : 's'}{' '}
          válido
          {stat.records === 1
            ? ''
            : 's'}
        </p>

        <button
          type="button"
          onClick={onDetails}
          className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
        >
          Ver detalhes
        </button>

      </div>

    </article>
  )
}

