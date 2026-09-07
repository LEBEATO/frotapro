'use client'

import Link from 'next/link'
import { AlertTriangle, Calendar, Car, CheckCircle2, Image as ImageIcon, Mail, User, Wrench, X } from 'lucide-react'
import type { Checklist, ChecklistItem } from './types'

interface ManagerChecklistCardProps {
  item: Checklist
  checklistItems: ChecklistItem[]
  checklistPhotos: string[]
  itensNaoOk: string[]
  hasPendingMaintenance: boolean
  recordedMileage: string | null
  onViewPhotos: () => void
}

export function ManagerChecklistCard({
  item,
  checklistItems,
  checklistPhotos,
  itensNaoOk,
  hasPendingMaintenance,
  recordedMileage,
  onViewPhotos,
}: ManagerChecklistCardProps) {
  return (
    <div
      className={`flex flex-col justify-between space-y-4 rounded-2xl border bg-zinc-900 p-5 transition hover:border-zinc-700 ${
        item.has_issue
          ? 'border-amber-500/30'
          : 'border-zinc-800'
      }`}
    >

      <div>

        {/* PLACA / DATA */}

        <div className="mb-3 flex items-start justify-between gap-3">

          <span className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-blue-400">
            {item.vehicle_plate ||
              'SEM PLACA'}
          </span>

          <div className="flex items-center gap-2">

            <span className="flex items-center gap-1 text-[11px] text-zinc-500">

              <Calendar className="h-3.5 w-3.5" />

              {new Date(
                item.created_at
              ).toLocaleDateString(
                'pt-BR',
                {
                  day:
                    '2-digit',

                  month:
                    '2-digit',

                  hour:
                    '2-digit',

                  minute:
                    '2-digit',
                }
              )}

            </span>


          </div>

        </div>

        {/* MOTORISTA */}

        <div className="mb-4 space-y-1">

          <div className="flex items-center gap-1.5 text-sm font-semibold text-white">

            <User className="h-4 w-4 text-zinc-400" />

            {item.driver ||
              'Não informado'}

          </div>

          <div className="flex items-center gap-1 text-xs text-zinc-300">

            <Car className="h-3 w-3 text-zinc-500" />

            {item.vehicle_model ||
              'Modelo não informado'}

          </div>

          {item.driver_email && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">

              <Mail className="h-3 w-3" />

              {item.driver_email}

            </div>
          )}

        </div>

        {/* ITENS */}

        <div className="mb-3 space-y-1.5 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">

          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Itens Checados
          </div>

          {checklistItems.length ===
          0 ? (
            <p className="text-xs text-zinc-600">
              Nenhum item registrado.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">

              {checklistItems.map(
                (
                  check,
                  index
                ) => (
                  <span
                    key={
                      `${check.name}-${index}`
                    }
                    className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${
                      check.ok
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/20 bg-red-500/10 text-red-400'
                    }`}
                  >
                    {check.ok ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}

                    {check.name}:{' '}

                    {check.value ||
                      (check.ok
                        ? 'SIM'
                        : 'NÃO')}
                  </span>
                )
              )}

            </div>
          )}

        </div>

        {/* KM */}

        {recordedMileage && (
          <div className="mb-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">

            <span className="font-semibold">
              KM registrado:
            </span>{' '}

            {recordedMileage}

          </div>
        )}

        {/* OBSERVAÇÃO */}

        {item.observation && (
          <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">

            <div className="flex items-center gap-1 font-semibold">

              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />

              Observação do Motorista:

            </div>

            <p className="leading-relaxed text-amber-200/80">
              {item.observation}
            </p>

          </div>
        )}

        {/* PENDÊNCIAS */}

        {hasPendingMaintenance && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">

            <p className="flex items-start gap-1 text-xs font-medium text-red-400">

              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

              <span>
                Pendências:{' '}

                {itensNaoOk.length >
                0
                  ? itensNaoOk.join(
                      ', '
                    )
                  : 'Ocorrência informada pelo motorista'}
              </span>

            </p>

            <Link
              href="/maintenance"
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-600 py-2 text-xs font-semibold text-white transition hover:bg-amber-500"
            >
              <Wrench className="h-3.5 w-3.5" />
              Acompanhar na manutenção
            </Link>

          </div>
        )}

      </div>

      {/* FOTOS */}

      {checklistPhotos.length >
        0 && (
        <button
          type="button"
          onClick={onViewPhotos}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
        >
          <ImageIcon className="h-4 w-4 text-blue-400" />

          Ver{' '}
          {
            checklistPhotos.length
          }{' '}

          {checklistPhotos.length ===
          1
            ? 'Foto Anexada'
            : 'Fotos Anexadas'}

        </button>
      )}

    </div>
  )
}
