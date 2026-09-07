'use client'

import { Metric } from '@/components/Metric'
import { formatCurrency, formatNumber, formatDateTime as formatDate } from '@/lib/formatters'
import type { VehicleFuelStat } from './types'

export function VehicleDetailsModal({
  stat,
  onClose,
}: {
  stat: VehicleFuelStat
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >

      <div
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-6"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-sm font-semibold text-blue-400">
              Histórico do veículo
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              {stat.vehicleModel}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {stat.vehiclePlate}{' '}
              •{' '}
              {stat.fuelType}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            Fechar
          </button>

        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">

          <Metric
            label="Média km/L"
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
            label="Custo/km"
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
            label="Preço médio/L"
            value={
              stat.averagePricePerLiter >
              0
                ? formatCurrency(
                    stat.averagePricePerLiter
                  )
                : '--'
            }
          />

          <Metric
            label="Registros"
            value={String(
              stat.records
            )}
          />

          <Metric
            label="Distância"
            value={`${formatNumber(
              stat.totalDistance,
              0
            )} km`}
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

          <Metric
            label="Último abastecimento"
            value={
              stat.lastFuelAt
                ? formatDate(
                    stat.lastFuelAt
                  )
                : '--'
            }
          />

        </div>

      </div>

    </div>
  )
}

