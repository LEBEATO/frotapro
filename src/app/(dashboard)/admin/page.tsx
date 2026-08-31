'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Truck,
  Wrench,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

interface Vehicle {
  id: string
  model: string
  plate: string
  status?: string | null
}

interface Checklist {
  id: string
  vehicle_plate: string
  driver: string
  has_issue: boolean
  created_at: string
}

export default function AdminDashboardPage() {
  const supabase = createClient()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [recentChecklists, setRecentChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        setLoading(true)

        const [vehiclesResponse, checklistsResponse] =
          await Promise.all([
            supabase
              .from('vehicles')
              .select('id, model, plate, status')
              .order('created_at', {
                ascending: false,
              }),

            supabase
              .from('driver_checklists')
              .select(
                'id, vehicle_plate, driver, has_issue, created_at'
              )
              .order('created_at', {
                ascending: false,
              })
              .limit(5),
          ])

        if (vehiclesResponse.error) {
          console.error(
            'Erro ao carregar veículos:',
            vehiclesResponse.error
          )
        }

        if (checklistsResponse.error) {
          console.error(
            'Erro ao carregar checklists:',
            checklistsResponse.error
          )
        }

        if (!mounted) return

        setVehicles(
          vehiclesResponse.data ?? []
        )

        setRecentChecklists(
          checklistsResponse.data ?? []
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [supabase])

  const totalVehicles = vehicles.length

  const activeVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === 'Ativo' ||
      !vehicle.status
  ).length

  const maintenanceVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === 'Manutenção'
  ).length

  const checklistIssues =
    recentChecklists.filter(
      (checklist) => checklist.has_issue
    ).length

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* CABEÇALHO */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              Gestão nacional
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Painel da Frota
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Acompanhe veículos, checklists,
              manutenções e alertas operacionais
              em um único lugar.
            </p>
          </div>

         <Link
               href="/admin/managers/new"
               className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
               <Plus className="h-4 w-4" />
               Novo gestor
          </Link>
        </section>

        {/* INDICADORES */}

        <section
          aria-label="Indicadores da frota"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <DashboardCard
            title="Total de veículos"
            value={totalVehicles}
            description="Cadastrados no sistema"
            icon={Truck}
          /><DashboardCard
            title="Veículos ativos"
            value={activeVehicles}
            description="Disponíveis para operação"
            icon={CheckCircle2}
          />

          <DashboardCard
            title="Em manutenção"
            value={maintenanceVehicles}
            description="Veículos que exigem atenção"
            icon={Wrench}
          />

          <DashboardCard
            title="Alertas recentes"
            value={checklistIssues}
            description="Ocorrências nos últimos checklists"
            icon={AlertTriangle}
          />
        </section>

        {/* CONTEÚDO */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* CHECKLISTS */}

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 xl:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-white">
                  Checklists recentes
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Últimas inspeções enviadas pelos motoristas
                </p>
              </div>

              <ClipboardCheck className="h-5 w-5 text-zinc-500" />
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Carregando informações...
              </div>
            ) : recentChecklists.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardCheck className="mx-auto h-8 w-8 text-zinc-700" />

                <p className="mt-3 text-sm font-medium text-zinc-300">
                  Nenhum checklist encontrado
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Os checklists enviados aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {recentChecklists.map(
                  (checklist) => (
                    <div
                      key={checklist.id}
                      className="flex flex-col gap-3 px-4 py-4 transition hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-200">
                          {checklist.vehicle_plate}
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          Motorista: {checklist.driver}
                        </p>
                      </div>

                      <div
                        className={[
                          'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          checklist.has_issue
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400',
                        ].join(' ')}
                      >
                        {checklist.has_issue ? (
                          <>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Com ocorrência
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Sem ocorrência
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* RESUMO */}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
            <h2 className="font-semibold text-white">
              Saúde da frota
            </h2><p className="mt-1 text-xs leading-5 text-zinc-500">
              Resumo operacional dos veículos cadastrados.
            </p>

            <div className="mt-6 space-y-5">
              <HealthItem
                label="Operacionais"
                value={activeVehicles}
                total={totalVehicles}
              />

              <HealthItem
                label="Em manutenção"
                value={maintenanceVehicles}
                total={totalVehicles}
              />
            </div>

            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-medium text-blue-300">
                Inteligência operacional
              </p>

              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Esta área será usada para as
                recomendações automáticas de consumo,
                manutenção e eficiência da frota.
              </p>
            </div>
          </div>

        </section>
      </div>
    </AppShell>
  )
}

type DashboardCardProps = {
  title: string
  value: number
  description: string
  icon: React.ComponentType<{
    className?: string
  }>
}

function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
}: DashboardCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {description}
      </p>
    </article>
  )
}

type HealthItemProps = {
  label: string
  value: number
  total: number
}

function HealthItem({
  label,
  value,
  total,
}: HealthItemProps) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-400">
          {label}
        </span>

        <span className="text-sm font-semibold text-zinc-200">
          {value} / {total}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{
            width:` ${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}