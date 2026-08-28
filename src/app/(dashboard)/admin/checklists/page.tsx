'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type ChecklistRow = {
  id: string
  driver: string
  driver_email: string | null
  vehicle_model: string
  vehicle_plate: string
  has_issue: boolean
  observation: string
  manager_observation: string | null
  submitted_at: string
  km_atual: number | null
  branch_id: string | null
  vehicle_id: string | null
  driver_id: string | null
  checklist_date: string
}

type BranchRow = {
  id: string
  name: string
  code: string
}

export default function AdminChecklistsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [checklists, setChecklists] =
    useState<ChecklistRow[]>([])

  const [branches, setBranches] =
    useState<BranchRow[]>([])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    try {
      const [
        checklistResponse,
        branchResponse,
      ] = await Promise.all([
        supabase
          .from('driver_checklists')
          .select(`
            id,
            driver,
            driver_email,
            vehicle_model,
            vehicle_plate,
            has_issue,
            observation,
            manager_observation,
            submitted_at,
            km_atual,
            branch_id,
            vehicle_id,
            driver_id,
            checklist_date
          `)
          .order('submitted_at', {
            ascending: false,
          }),

        supabase
          .from('branches')
          .select('id, name, code'),
      ])

      if (checklistResponse.error) {
        throw checklistResponse.error
      }

      if (branchResponse.error) {
        throw branchResponse.error
      }

      setChecklists(
        (checklistResponse.data as ChecklistRow[] | null) ??
          []
      )

      setBranches(
        (branchResponse.data as BranchRow[] | null) ?? []
      )
    } catch (error: unknown) {
      console.error(
        'Erro ao carregar checklists:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os checklists.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const branchMap = useMemo(() => {
    return new Map(
      branches.map((branch) => [
        branch.id,
        branch,
      ])
    )
  }, [branches])

  const filteredChecklists = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    if (!query) {
      return checklists
    }

    return checklists.filter((checklist) => {
      const branch = checklist.branch_id
        ? branchMap.get(checklist.branch_id)
        : null

      return (
        checklist.driver
          .toLowerCase()
          .includes(query) ||
        (checklist.driver_email ?? '')
          .toLowerCase()
          .includes(query) ||
        checklist.vehicle_plate
          .toLowerCase()
          .includes(query) ||
        checklist.vehicle_model
          .toLowerCase()
          .includes(query) ||
        (branch?.name ?? '')
          .toLowerCase()
          .includes(query)
      )
    })
  }, [
    checklists,
    search,
    branchMap,
  ])

  const withIssues = checklists.filter(
    (item) => item.has_issue
  ).length

  const withoutIssues =
    checklists.length - withIssues

  return (
    <AppShell>
      <div className="space-y-6">

        <section>
          <p className="text-sm font-medium text-blue-400">
            Inspeções da frota
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Checklists
          </h1><p className="mt-2 text-sm text-zinc-400">
            Acompanhe as inspeções diárias realizadas pelos motoristas.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={checklists.length}
            icon={ClipboardCheck}
          />

          <StatCard
            label="Sem ocorrência"
            value={withoutIssues}
            icon={CheckCircle2}
          />

          <StatCard
            label="Com ocorrência"
            value={withIssues}
            icon={AlertTriangle}
          />
        </section>

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar motorista, placa, veículo ou base..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'h-4 w-4',
                loading ? 'animate-spin' : '',
              ].join(' ')}
            />

            Atualizar
          </button>
        </section>

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />

              <p className="text-sm text-zinc-500">
                Carregando checklists...
              </p>
            </div>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <ClipboardCheck className="mx-auto h-9 w-9 text-zinc-700" />

            <p className="mt-3 font-medium text-zinc-300">
              Nenhum checklist encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Ainda não existem inspeções para os filtros selecionados.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {filteredChecklists.map(
              (checklist) => {
                const branch =
                  checklist.branch_id
                    ? branchMap.get(
                        checklist.branch_id
                      )
                    : null

                return (
                  <article
                    key={checklist.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                            <ClipboardCheck className="h-5 w-5" />
                          </div><div>
                            <p className="font-bold text-white">
                              {checklist.vehicle_plate}
                            </p>

                            <p className="text-sm text-zinc-500">
                              {checklist.vehicle_model}
                            </p>
                          </div>
                        </div>
                      </div>

                      <ChecklistStatus
                        hasIssue={
                          checklist.has_issue
                        }
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                      <Info
                        icon={UserRound}
                        label="Motorista"
                        value={
                          checklist.driver
                        }
                      />

                      <Info
                        icon={Car}
                        label="Base"
                        value={
                          branch
                            ?` ${branch.name} • ${branch.code}`
                            : 'Sem base'
                        }
                      />

                      <Info
                        icon={Gauge}
                        label="KM"
                        value={
                          checklist.km_atual != null
                            ?` ${checklist.km_atual.toLocaleString(
                                'pt-BR'
                              )} km `
                            : 'Não informado'
                        }
                      />

                      <Info
                        icon={ClipboardCheck}
                        label="Data"
                        value={formatDate(
                          checklist.submitted_at
                        )}
                      />
                    </div>

                    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                        Observação do motorista
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {checklist.observation ||
                          'Sem observação.'}
                      </p>
                    </div>

                    {checklist.manager_observation && (
                      <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                          Observação da gestão
                        </p>

                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {
                            checklist.manager_observation
                          }
                        </p>
                      </div>
                    )}
                  </article>
                )
              }
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}

type IconType =
  React.ComponentType<{
    className?: string
  }>

function StatCard({
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  )
}function Info({
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
        <p className="text-[11px] uppercase tracking-wider text-zinc-600">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium text-zinc-300">
          {value}
        </p>
      </div>
    </div>
  )
}

function ChecklistStatus({
  hasIssue,
}: {
  hasIssue: boolean
}) {
  return hasIssue ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      Com ocorrência
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Sem ocorrência
    </span>
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
  ).format(new Date(value))
}