'use client'

import { AlertTriangle, CalendarDays, Car, CheckCircle2, Clock3, Gauge, Loader2, Wrench } from 'lucide-react'
import type { MaintenanceView } from './types'

interface MaintenanceRecordCardProps {
  item: MaintenanceView
  isInProgress: boolean
  isResolving: boolean
  isStarting: boolean
  onConfirmResolve: () => void
  onStart: () => void
}

export function MaintenanceRecordCard({ item, isInProgress, isResolving, isStarting, onConfirmResolve, onStart }: MaintenanceRecordCardProps) {
  return (
    <article
      className="flex flex-col rounded-2xl border border-amber-500/25 bg-zinc-900/70 p-5 transition hover:border-amber-500/40"
    >

      {/* ===============================
          TOPO
      =============================== */}

      <div className="flex items-start justify-between gap-4">

        <div>

          <span className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
            {item.vehicle_plate}
          </span>

          <h2 className="mt-3 text-base font-semibold text-white">
            {item.vehicle_model ??
              'Modelo não informado'}
          </h2>

        </div>

        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            isInProgress
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-amber-500/10 text-amber-400',
          ].join(
            ' '
          )}
        >

          {isInProgress ? (
            <Clock3 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}

          {isInProgress
            ? 'Em andamento'
            : 'Pendente'}

        </span>

      </div>

      {/* ===============================
          DADOS
      =============================== */}

      <div className="mt-5 space-y-3 text-sm">

        <InfoRow
          icon={Wrench}
          label="Serviço"
          value={
            item.service_description
          }
        />

        <InfoRow
          icon={Gauge}
          label="KM"
          value={
            item.mileage !=
            null
              ? `${item.mileage.toLocaleString(
                  'pt-BR'
                )} km`
              : 'Não informado'
          }
        />

        <InfoRow
          icon={
            CalendarDays
          }
          label="Aberta em"
          value={formatDate(
            item.started_at
          )}
        />

        <InfoRow
          icon={Car}
          label="Tipo"
          value={
            item.maintenance_type ??
            'Não informado'
          }
        />

        {item.workshop && (
          <InfoRow
            icon={Wrench}
            label="Oficina"
            value={
              item.workshop
            }
          />
        )}

      </div>

      {/* ===============================
          OBSERVAÇÃO
      =============================== */}

      {item.notes && (

        <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">

          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Observação
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-400">
            {item.notes}
          </p>

        </div>

      )}

      {/* ===============================
          STATUS DO VEÍCULO
      =============================== */}

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">

        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          Situação do veículo
        </p>

        <p className="mt-1 text-sm font-semibold text-amber-400">
          Em manutenção
        </p>

      </div>

      <div className="mt-auto pt-5">

        {item.virtual ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs leading-5 text-zinc-500">
            Veículo em manutenção sem maintenance_record vinculado. Regularize o registro para preservar o histórico antes da liberação.
          </div>
        ) : isInProgress ? (
          <button
            type="button"
            onClick={onConfirmResolve}
            disabled={
              isResolving
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {isResolving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Liberando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Concluir e liberar veículo
              </>
            )}

          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={
              isStarting
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Clock3 className="h-4 w-4" />
                Iniciar manutenção
              </>
            )}

          </button>
        )}

      </div>

    </article>
  )
}

type IconType =
  React.ComponentType<{
    className?: string
  }>

function InfoRow({
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

        <p className="mt-0.5 wrap-break-word text-sm text-zinc-300">
          {value}
        </p>

      </div>

    </div>
  )
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  ).format(
    new Date(value)
  )
}
