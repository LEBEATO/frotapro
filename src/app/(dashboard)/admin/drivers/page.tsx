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
  ArrowLeft,
  Building2,
  Car,
  CheckCircle2,
  Gauge,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  Users,
  UserX,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

type DriverRow = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
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
  model: string
  plate: string
  status: string | null
  mileage: number | null
  driver_id: string | null
  current_branch_id: string | null
}

type AssignmentRow = {
  id: string
  driver_id: string
  vehicle_id: string
  branch_id: string | null
  assigned_at: string
  ended_at: string | null
}

type DriverFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'assigned'
  | 'unassigned'

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
// PÁGINA
// =====================================================

export default function AdminDriversPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [drivers, setDrivers] =
    useState<DriverRow[]>([])

  const [branches, setBranches] =
    useState<BranchRow[]>([])

  const [vehicles, setVehicles] =
    useState<VehicleRow[]>([])

  const [assignments, setAssignments] =
    useState<AssignmentRow[]>([])

  const [search, setSearch] =
    useState('')

  const [filter, setFilter] =
    useState<DriverFilter>('all')

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData =
    useCallback(async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [
          driversResponse,
          branchesResponse,
          vehiclesResponse,
          assignmentsResponse,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              email,
              role,
              branch_id,
              active
            `)
            .eq('role', 'driver')
            .order('full_name'),

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
              model,
              plate,
              status,
              mileage,
              driver_id,
              current_branch_id
            `)
            .order('plate'),

          supabase
            .from(
              'driver_vehicle_assignments'
            )
            .select(`
              id,
              driver_id,
              vehicle_id,
              branch_id,
              assigned_at,
              ended_at
            `)
            .is('ended_at', null),
        ])

        if (
          driversResponse.error
        ) {
          throw driversResponse.error
        }

        if (
          branchesResponse.error
        ) {
          throw branchesResponse.error
        }

        if (
          vehiclesResponse.error
        ) {
          throw vehiclesResponse.error
        }

        if (
          assignmentsResponse.error
        ) {
          throw assignmentsResponse.error
        }

        setDrivers(
          (
            driversResponse.data ??
            []
          ) as DriverRow[]
        )

        setBranches(
          (
            branchesResponse.data ??
            []
          ) as BranchRow[]
        )

        setVehicles(
          (
            vehiclesResponse.data ??
            []
          ) as VehicleRow[]
        )

        setAssignments(
          (
            assignmentsResponse.data ??
            []
          ) as AssignmentRow[]
        )
      } catch (error) {
        console.error(
          'Erro ao carregar motoristas:',
          error
        )

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os motoristas.'
        )
      } finally {
        setLoading(false)
      }
    }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // =====================================================
  // MAPAS
  // =====================================================

  const branchMap =
    useMemo(() => {
      return new Map(
        branches.map(
          (branch) => [
            branch.id,
            branch,
          ]
        )
      )
    }, [branches])

  const vehicleMap =
    useMemo(() => {
      return new Map(
        vehicles.map(
          (vehicle) => [
            vehicle.id,
            vehicle,
          ]
        )
      )
    }, [vehicles])

  const assignmentByDriver =
    useMemo(() => {
      return new Map(
        assignments.map(
          (assignment) => [
            assignment.driver_id,
            assignment,
          ]
        )
      )
    }, [assignments])

  // =====================================================
  // FILTROS
  // =====================================================

  const filteredDrivers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return drivers.filter(
        (driver) => {
          const assignment =
            assignmentByDriver.get(
              driver.id
            )

          const vehicle =
            assignment
              ? vehicleMap.get(
                  assignment.vehicle_id
                ) ?? null
              : null

          const branch =
            driver.branch_id
              ? branchMap.get(
                  driver.branch_id
                ) ?? null
              : null

          const state =
            getState(branch)

          if (
            filter ===
              'active' &&
            !driver.active
          ) {
            return false
          }

          if (
            filter ===
              'inactive' &&
            driver.active
          ) {
            return false
          }

          if (
            filter ===
              'assigned' &&
            !assignment
          ) {
            return false
          }

          if (
            filter ===
              'unassigned' &&
            assignment
          ) {
            return false
          }

          if (!query) {
            return true
          }

          const values = [
            driver.full_name,
            driver.email,
            branch?.name,
            branch?.code,
            branch?.city,
            state?.name,
            state?.uf,
            vehicle?.plate,
            vehicle?.model,
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
      assignmentByDriver,
      branchMap,
      drivers,
      filter,
      search,
      vehicleMap,
    ])

  // =====================================================
  // INDICADORES
  // =====================================================

  const activeDrivers =
    drivers.filter(
      (driver) => driver.active
    ).length

  const inactiveDrivers =
    drivers.length -
    activeDrivers

  const assignedDrivers =
    drivers.filter(
      (driver) =>
        assignmentByDriver.has(
          driver.id
        )
    ).length

  const unassignedDrivers =
    drivers.length -
    assignedDrivers

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div className="flex items-start gap-3">

            <Link
              href="/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>

              <p className="text-sm font-medium text-blue-400">
                Administração global
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Motoristas
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Acompanhe motoristas, bases, localização e veículos atualmente atribuídos em toda a operação.
              </p>

            </div>

          </div>

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

        </section>

        {/* =================================================
            INDICADORES
        ================================================= */}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">

          <StatCard
            label="Motoristas"
            value={drivers.length}
            icon={Users}
          />

          <StatCard
            label="Ativos"
            value={activeDrivers}
            icon={CheckCircle2}
          />

          <StatCard
            label="Inativos"
            value={inactiveDrivers}
            icon={UserX}
          />

          <StatCard
            label="Com veículo"
            value={assignedDrivers}
            icon={Car}
          />

          <StatCard
            label="Sem veículo"
            value={unassignedDrivers}
            icon={UserRound}
          />

        </section>

        {/* =================================================
            INFORMAÇÃO
        ================================================= */}

        <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

          <div className="flex items-start gap-3">

            <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

            <div>

              <p className="text-sm font-semibold text-blue-400">
                Visão nacional dos motoristas
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                O Admin acompanha todos os motoristas e suas respectivas bases. O cadastro e convite operacional continuam sendo feitos pelo gestor responsável pela unidade.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            BUSCA
        ================================================= */}

        <section className="flex flex-col gap-3">

          <div className="relative">

            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar motorista, e-mail, placa, veículo, base, cidade ou estado..."
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

          </div>

          {/* ===============================================
              FILTROS
          =============================================== */}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">

            <FilterButton
              active={
                filter === 'all'
              }
              onClick={() =>
                setFilter('all')
              }
            >
              Todos
            </FilterButton>

            <FilterButton
              active={
                filter === 'active'
              }
              onClick={() =>
                setFilter('active')
              }
            >
              Ativos
            </FilterButton>

            <FilterButton
              active={
                filter === 'inactive'
              }
              onClick={() =>
                setFilter('inactive')
              }
            >
              Inativos
            </FilterButton>

            <FilterButton
              active={
                filter === 'assigned'
              }
              onClick={() =>
                setFilter('assigned')
              }
            >
              Com veículo
            </FilterButton>

            <FilterButton
              active={
                filter === 'unassigned'
              }
              onClick={() =>
                setFilter(
                  'unassigned'
                )
              }
            >
              Sem veículo
            </FilterButton>

          </div>

        </section>

        {/* =================================================
            ERRO
        ================================================= */}

        {errorMessage && (
          <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">

            <p className="text-sm font-semibold text-red-400">
              Erro ao carregar motoristas
            </p>

            <p className="mt-1 text-xs text-red-300/80">
              {errorMessage}
            </p>

          </section>
        )}

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        {loading ? (

          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">

            <div className="flex flex-col items-center gap-3">

              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />

              <p className="text-sm text-zinc-500">
                Carregando motoristas...
              </p>

            </div>

          </div>

        ) : filteredDrivers.length ===
          0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">

            <Users className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-4 font-medium text-zinc-300">
              Nenhum motorista encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Nenhum motorista corresponde aos filtros selecionados.
            </p>

          </div>

        ) : (

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">

            {filteredDrivers.map(
              (driver) => {

                const assignment =
                  assignmentByDriver.get(
                    driver.id
                  )

                const vehicle =
                  assignment
                    ? vehicleMap.get(
                        assignment.vehicle_id
                      ) ?? null
                    : null

                const branch =
                  driver.branch_id
                    ? branchMap.get(
                        driver.branch_id
                      ) ?? null
                    : null

                const state =
                  getState(branch)

                return (
                  <article
                    key={driver.id}
                    className={[
                      'rounded-2xl border bg-zinc-900/60 p-5 transition sm:p-6',
                      driver.active
                        ? 'border-zinc-800 hover:border-zinc-700'
                        : 'border-zinc-800/70 opacity-80',
                    ].join(' ')}
                  >

                    {/* =====================================
                        TOPO
                    ===================================== */}

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <DriverStatus
                        active={
                          driver.active
                        }
                      />

                    </div>

                    {/* =====================================
                        MOTORISTA
                    ===================================== */}

                    <div className="mt-4 min-w-0">

                      <h2 className="wrap-break-word text-lg font-bold text-white">
                        {driver.full_name}
                      </h2>

                      <div className="mt-2 flex items-start gap-2 text-xs text-zinc-500">

                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                        <span className="wrap-break-word">
                          {driver.email}
                        </span>

                      </div>

                    </div>

                    {/* =====================================
                        BASE
                    ===================================== */}

                    <div className="mt-5 space-y-4 border-t border-zinc-800 pt-5">

                      <InfoRow
                        icon={Building2}
                        label="Base atual"
                        value={
                          branch
                            ? `${branch.name} • ${branch.code}`
                            : 'Sem base vinculada'
                        }
                      />

                      <InfoRow
                        icon={MapPin}
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
                        VEÍCULO
                    ===================================== */}

                    <div
                      className={[
                        'mt-5 rounded-xl border p-4',
                        vehicle
                          ? vehicle.status ===
                            'Manutenção'
                            ? 'border-amber-500/20 bg-amber-500/5'
                            : 'border-emerald-500/15 bg-emerald-500/5'
                          : 'border-zinc-800 bg-zinc-950/40',
                      ].join(' ')}
                    >

                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                        Veículo atual
                      </p>

                      {vehicle ? (
                        <>

                          <div className="mt-3 flex items-start justify-between gap-3">

                            <div>

                              <p className="font-semibold text-white">
                                {vehicle.model}
                              </p>

                              <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                {vehicle.plate}
                              </p>

                            </div>

                            <VehicleStatus
                              status={
                                vehicle.status
                              }
                            />

                          </div>

                          <div className="mt-4 flex items-center gap-2 border-t border-zinc-800/70 pt-3">

                            <Gauge className="h-4 w-4 text-zinc-500" />

                            <div>

                              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                                Quilometragem
                              </p>

                              <p className="mt-0.5 text-xs font-medium text-zinc-300">
                                {vehicle.mileage !=
                                null
                                  ? `${vehicle.mileage.toLocaleString(
                                      'pt-BR'
                                    )} km`
                                  : 'Não informada'}
                              </p>

                            </div>

                          </div>

                        </>
                      ) : (

                        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">

                          <Car className="h-4 w-4" />

                          Nenhum veículo atribuído

                        </div>

                      )}

                    </div>

                    {/* =====================================
                        ATRIBUIÇÃO
                    ===================================== */}

                    {assignment && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">

                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                          Veículo atribuído desde
                        </p>

                        <p className="mt-1 text-xs font-medium text-zinc-400">
                          {formatDate(
                            assignment.assigned_at
                          )}
                        </p>

                      </div>
                    )}

                    {/* =====================================
                        ALERTA SEM BASE
                    ===================================== */}

                    {!branch && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">

                        <p className="text-xs font-medium text-amber-400">
                          Motorista sem base vinculada
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Este perfil precisa estar vinculado a uma unidade operacional.
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

// =====================================================
// COMPONENTES
// =====================================================

type IconType =
  ComponentType<{
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

      <div className="flex items-center justify-between gap-4">

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
}

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

        <p className="mt-1 wrap-break-word text-sm font-medium text-zinc-300">
          {value}
        </p>

      </div>

    </div>
  )
}

function DriverStatus({
  active,
}: {
  active: boolean
}) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">

      <CheckCircle2 className="h-3.5 w-3.5" />

      Ativo

    </span>
  ) : (
    <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
      Inativo
    </span>
  )
}

function VehicleStatus({
  status,
}: {
  status: string | null
}) {
  const normalized =
    status ?? 'Ativo'

  if (
    normalized ===
    'Manutenção'
  ) {
    return (
      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
        Manutenção
      </span>
    )
  }

  if (
    normalized ===
    'Inativo'
  ) {
    return (
      <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
        Inativo
      </span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
      {normalized}
    </span>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm',
        active
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// =====================================================
// DATA
// =====================================================

function formatDate(
  value: string
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Data não informada'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'medium',
    }
  ).format(date)
}