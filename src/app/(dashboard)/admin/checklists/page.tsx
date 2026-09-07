'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react'

import Link from 'next/link'

import {
  AlertTriangle,
  Building2,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  MapPin,
  RefreshCw,
  UserRound,
  Wrench,
} from 'lucide-react'

import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { SearchInput } from '@/components/SearchInput'
import { FilterButton } from '@/components/FilterButton'
import { AppShell } from '@/components/layout/AppShell'
import { Toast, type ToastType } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

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

type BranchState = {
  name: string
  uf: string
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
  states:
    | BranchState
    | BranchState[]
    | null
}

type VehicleRow = {
  id: string
  plate: string
  model: string | null
  status: string | null
  current_branch_id: string | null
  mileage: number | null
  issues: string | null
}

type MaintenanceRow = {
  id: string
  source_checklist_id: string | null
}

type IssueFilter =
  | 'all'
  | 'with_issue'
  | 'without_issue'

// =====================================================
// AUXILIAR
// =====================================================

function getState(
  branch: BranchRow | null
): BranchState | null {
  if (!branch?.states) {
    return null
  }

  if (Array.isArray(branch.states)) {
    return branch.states[0] ?? null
  }

  return branch.states
}

// =====================================================
// PAGE
// =====================================================

export default function AdminChecklistsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [checklists, setChecklists] =
    useState<ChecklistRow[]>([])

  const [branches, setBranches] =
    useState<BranchRow[]>([])

  const [vehicles, setVehicles] =
    useState<VehicleRow[]>([])

  const [maintenances, setMaintenances] =
    useState<MaintenanceRow[]>([])

  const [search, setSearch] =
    useState('')

  const [issueFilter, setIssueFilter] =
    useState<IssueFilter>('all')

  const [loading, setLoading] =
    useState(true)

  const [toast, setToast] =
    useState<{
      message: string
      type: ToastType
    } | null>(null)

  // =====================================================
  // TOAST
  // =====================================================

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'success'
    ) => {
      setToast({
        message,
        type,
      })
    },
    []
  )

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData =
    useCallback(async () => {
      setLoading(true)

      try {
        const [
          checklistResponse,
          branchResponse,
          vehicleResponse,
          maintenanceResponse,
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
            .order(
              'submitted_at',
              {
                ascending: false,
              }
            ),

          supabase
            .from('branches')
            .select(`
              id,
              name,
              code,
              city,
              active,
              states (
                name,
                uf
              )
            `)
            .order('name'),

          supabase
            .from('vehicles')
            .select(`
              id,
              plate,
              model,
              status,
              current_branch_id,
              mileage,
              issues
            `),

          supabase
            .from('maintenance_records')
            .select(`
              id,
              source_checklist_id
            `),
        ])

        if (
          checklistResponse.error
        ) {
          throw checklistResponse.error
        }

        if (
          branchResponse.error
        ) {
          throw branchResponse.error
        }

        if (
          vehicleResponse.error
        ) {
          throw vehicleResponse.error
        }

        if (
          maintenanceResponse.error
        ) {
          throw maintenanceResponse.error
        }

        setChecklists(
          (
            checklistResponse.data ??
            []
          ) as ChecklistRow[]
        )

        setBranches(
          (
            branchResponse.data ??
            []
          ) as BranchRow[]
        )

        setVehicles(
          (
            vehicleResponse.data ??
            []
          ) as VehicleRow[]
        )

        setMaintenances(
          (
            maintenanceResponse.data ??
            []
          ) as MaintenanceRow[]
        )
      } catch (error) {
        console.error(
          'Erro ao carregar checklists:',
          error
        )

        showToast(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os checklists.',
          'error'
        )
      } finally {
        setLoading(false)
      }
    }, [
      showToast,
      supabase,
    ])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // =====================================================
  // MAPAS
  // =====================================================

  const branchMap =
    useMemo(
      () =>
        new Map(
          branches.map(
            (branch) => [
              branch.id,
              branch,
            ]
          )
        ),
      [branches]
    )

  const vehicleMap =
    useMemo(
      () =>
        new Map(
          vehicles.map(
            (vehicle) => [
              vehicle.id,
              vehicle,
            ]
          )
        ),
      [vehicles]
    )

  const maintenanceByChecklist =
    useMemo(
      () =>
        new Map(
          maintenances
            .filter(
              (maintenance) =>
                maintenance.source_checklist_id
            )
            .map(
              (maintenance) => [
                maintenance.source_checklist_id as string,
                maintenance,
              ]
            )
        ),
      [maintenances]
    )

  // =====================================================
  // FILTRO
  // =====================================================

  const filteredChecklists =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return checklists.filter(
        (checklist) => {
          if (
            issueFilter ===
              'with_issue' &&
            !checklist.has_issue
          ) {
            return false
          }

          if (
            issueFilter ===
              'without_issue' &&
            checklist.has_issue
          ) {
            return false
          }

          if (!query) {
            return true
          }

          const branch =
            checklist.branch_id
              ? branchMap.get(
                  checklist.branch_id
                ) ?? null
              : null

          const state =
            getState(branch)

          const vehicle =
            checklist.vehicle_id
              ? vehicleMap.get(
                  checklist.vehicle_id
                ) ?? null
              : null

          const values = [
            checklist.driver,
            checklist.driver_email,
            checklist.vehicle_plate,
            checklist.vehicle_model,
            checklist.observation,
            checklist.manager_observation,
            branch?.name,
            branch?.code,
            branch?.city,
            state?.name,
            state?.uf,
            vehicle?.status,
          ]

          return values
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
            )
        }
      )
    }, [
      branchMap,
      checklists,
      issueFilter,
      search,
      vehicleMap,
    ])

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  const withIssues =
    checklists.filter(
      (item) =>
        item.has_issue
    ).length

  const withoutIssues =
    checklists.length -
    withIssues

  const sentToMaintenance =
    checklists.filter(
      (checklist) => {
        if (
          !checklist.vehicle_id
        ) {
          return false
        }

        const vehicle =
          vehicleMap.get(
            checklist.vehicle_id
          )

        return (
          vehicle?.status ===
          'Manutenção'
        )
      }
    ).length

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      {toast && (
        <Toast
          message={
            toast.message
          }
          type={
            toast.type
          }
          onClose={() =>
            setToast(null)
          }
        />
      )}

      <div className="space-y-6 sm:space-y-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <PageHeader
          title="Checklists"
          description="Acompanhe as inspeções realizadas pelos motoristas de todas as bases e encaminhe ocorrências para manutenção."
          contextLabel="Administração global"
          backHref="/admin"
          backLabel="Voltar para o painel"
          actions={
            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <RefreshCw
                className={[
                  'h-4 w-4',
                  loading
                    ? 'animate-spin'
                    : '',
                ].join(' ')}
              />

              Atualizar

            </button>
          }
        />

        {/* =================================================
            ESTATÍSTICAS
        ================================================= */}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">

          <StatCard
            label="Total"
            value={
              checklists.length
            }
            icon={
              ClipboardCheck
            }
          />

          <StatCard
            label="Sem ocorrência"
            value={
              withoutIssues
            }
            icon={
              CheckCircle2
            }
          />

          <StatCard
            label="Com ocorrência"
            value={
              withIssues
            }
            icon={
              AlertTriangle
            }
          />

          <StatCard
            label="Em manutenção"
            value={
              sentToMaintenance
            }
            icon={
              Wrench
            }
          />

        </section>

        {/* =================================================
            INFORMAÇÃO
        ================================================= */}

        <section className="grid gap-3 sm:grid-cols-2">

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

            <div className="flex items-start gap-3">

              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

              <div>

                <p className="text-sm font-semibold text-emerald-400">
                  Checklist sem ocorrência
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Fica armazenado no histórico da frota sem alterar a situação do veículo.
                </p>

              </div>

            </div>

          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">

            <div className="flex items-start gap-3">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

              <div>

                <p className="text-sm font-semibold text-amber-400">
                  Checklist com ocorrência
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Pode ser encaminhado para manutenção. O veículo fica indisponível até sua liberação.
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            FILTROS
        ================================================= */}

        <section className="flex flex-col gap-3 xl:flex-row">

          <div className="relative flex-1">

            <SearchInput
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar motorista, placa, veículo, base, cidade ou estado..."
              label="Buscar checklists"
            />

          </div>

          <div className="grid grid-cols-3 gap-2">

            <FilterButton
              active={
                issueFilter ===
                'all'
              }
              onClick={() =>
                setIssueFilter(
                  'all'
                )
              }
            >
              Todos
            </FilterButton>

            <FilterButton
              active={
                issueFilter ===
                'without_issue'
              }
              onClick={() =>
                setIssueFilter(
                  'without_issue'
                )
              }
            >
              Sem ocorrência
            </FilterButton>

            <FilterButton
              active={
                issueFilter ===
                'with_issue'
              }
              onClick={() =>
                setIssueFilter(
                  'with_issue'
                )
              }
            >
              Ocorrências
            </FilterButton>

          </div>

        </section>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        {loading ? (

          <LoadingState message="Carregando checklists..." />

        ) : filteredChecklists.length ===
          0 ? (

          <EmptyState
            title="Nenhum checklist encontrado"
            description="Não existem registros para os filtros selecionados."
            icon={ClipboardCheck}
          />

        ) : (

          <section className="space-y-4">

            {filteredChecklists.map(
              (checklist) => {

                const branch =
                  checklist.branch_id
                    ? branchMap.get(
                        checklist.branch_id
                      ) ?? null
                    : null

                const state =
                  getState(
                    branch
                  )

                const vehicle =
                  checklist.vehicle_id
                    ? vehicleMap.get(
                        checklist.vehicle_id
                      ) ?? null
                    : null

                const isMaintenance =
                  vehicle?.status ===
                  'Manutenção'

                const maintenance =
                  maintenanceByChecklist.get(
                    checklist.id
                  )

                return (
                  <article
                    key={
                      checklist.id
                    }
                    className={[
                      'rounded-2xl border bg-zinc-900/60 p-5 transition sm:p-6',
                      checklist.has_issue
                        ? 'border-amber-500/25 hover:border-amber-500/40'
                        : 'border-zinc-800 hover:border-zinc-700',
                    ].join(' ')}
                  >

                    {/* =====================================
                        TOPO
                    ===================================== */}

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="flex min-w-0 items-start gap-3">

                        <div
                          className={[
                            'rounded-xl p-3',
                            checklist.has_issue
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-blue-500/10 text-blue-400',
                          ].join(' ')}
                        >
                          <ClipboardCheck className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">

                          <p className="font-bold text-white">
                            {checklist.vehicle_plate}
                          </p>

                          <p className="mt-0.5 text-sm text-zinc-500">
                            {checklist.vehicle_model}
                          </p>

                          {isMaintenance && (
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">

                              <Wrench className="h-3.5 w-3.5" />

                              Veículo em manutenção

                            </span>
                          )}

                        </div>

                      </div>

                      <ChecklistStatus
                        hasIssue={
                          checklist.has_issue
                        }
                      />

                    </div>

                    {/* =====================================
                        INFORMAÇÕES
                    ===================================== */}

                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-5 sm:grid-cols-2 xl:grid-cols-5">

                      <Info
                        icon={
                          UserRound
                        }
                        label="Motorista"
                        value={
                          checklist.driver
                        }
                      />

                      <Info
                        icon={
                          Car
                        }
                        label="Veículo"
                        value={
                          checklist.vehicle_model
                        }
                      />

                      <Info
                        icon={
                          Gauge
                        }
                        label="KM"
                        value={
                          checklist.km_atual !=
                          null
                            ? `${checklist.km_atual.toLocaleString(
                                'pt-BR'
                              )} km`
                            : 'Não informado'
                        }
                      />

                      <Info
                        icon={
                          Building2
                        }
                        label="Base"
                        value={
                          branch
                            ? `${branch.name} • ${branch.code}`
                            : 'Sem base'
                        }
                      />

                      <Info
                        icon={
                          MapPin
                        }
                        label="Cidade / Estado"
                        value={
                          branch
                            ? `${branch.city}${
                                state?.uf
                                  ? ` - ${state.uf}`
                                  : ''
                              }`
                            : 'Não informado'
                        }
                      />

                    </div>

                    {/* =====================================
                        DATA
                    ===================================== */}

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">

                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                        Checklist realizado
                      </p>

                      <p className="mt-1 text-sm font-medium text-zinc-300">
                        {formatDate(
                          checklist.submitted_at
                        )}
                      </p>

                    </div>

                    {/* =====================================
                        OBSERVAÇÃO MOTORISTA
                    ===================================== */}

                    <div
                      className={[
                        'mt-4 rounded-xl border p-4',
                        checklist.has_issue
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-zinc-800 bg-zinc-950/50',
                      ].join(' ')}
                    >

                      <p
                        className={[
                          'text-[11px] font-semibold uppercase tracking-wider',
                          checklist.has_issue
                            ? 'text-amber-400'
                            : 'text-zinc-600',
                        ].join(' ')}
                      >
                        Observação do motorista
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {checklist.observation ||
                          'Sem observação.'}
                      </p>

                    </div>

                    {/* =====================================
                        OBSERVAÇÃO GESTÃO
                    ===================================== */}

                    {checklist.manager_observation && (

                      <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                          Observação da gestão
                        </p>

                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {checklist.manager_observation}
                        </p>

                      </div>

                    )}

                    {/* =====================================
                        AÇÃO MANUTENÇÃO
                    ===================================== */}

                    {checklist.has_issue && (

                      <div className="mt-5 border-t border-zinc-800 pt-5">

                        <Link
                          href="/maintenance"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/10"
                        >
                          <Wrench className="h-4 w-4" />
                          {maintenance
                            ? 'Ver manutenção vinculada'
                            : 'Consultar fluxo de manutenção'}
                        </Link>

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

// =====================================================
// COMPONENTES
// =====================================================

type IconType =
  ComponentType<{
    className?: string
  }>

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

        <p className="text-[11px] uppercase tracking-wider text-zinc-600">
          {label}
        </p>

        <p className="mt-1 wrap-break-word text-sm font-medium text-zinc-300">
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
  ).format(
    new Date(value)
  )
}
