'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Car,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type DriverRow = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
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

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  async function loadData() {
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
            city
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
          .from('driver_vehicle_assignments')
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

      if (driversResponse.error) {
        throw driversResponse.error
      }

      if (branchesResponse.error) {
        throw branchesResponse.error
      }

      if (vehiclesResponse.error) {
        throw vehiclesResponse.error
      }

      if (assignmentsResponse.error) {
        throw assignmentsResponse.error
      }

      setDrivers(
        (driversResponse.data as DriverRow[] | null) ?? []
      )

      setBranches(
        (branchesResponse.data as BranchRow[] | null) ?? []
      )

      setVehicles(
        (vehiclesResponse.data as VehicleRow[] | null) ?? []
      )

      setAssignments(
        (
          assignmentsResponse.data as
            | AssignmentRow[]
            | null
        ) ?? []
      )
    } catch (error: unknown) {
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

  const vehicleMap = useMemo(() => {
    return new Map(
      vehicles.map((vehicle) => [
        vehicle.id,
        vehicle,
      ])
    )
  }, [vehicles])
  const assignmentByDriver =
    useMemo(() => {
      return new Map(
        assignments.map((assignment) => [
          assignment.driver_id,
          assignment,
        ])
      )
    }, [assignments])

  const filteredDrivers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    if (!query) {
      return drivers
    }

    return drivers.filter((driver) => {
      const branch =
        driver.branch_id
          ? branchMap.get(driver.branch_id)
          : null

      const assignment =
        assignmentByDriver.get(driver.id)

      const vehicle =
        assignment
          ? vehicleMap.get(
              assignment.vehicle_id
            )
          : null

      return (
        driver.full_name
          .toLowerCase()
          .includes(query) ||
        driver.email
          .toLowerCase()
          .includes(query) ||
        (branch?.name ?? '')
          .toLowerCase()
          .includes(query) ||
        (branch?.city ?? '')
          .toLowerCase()
          .includes(query) ||
        (vehicle?.plate ?? '')
          .toLowerCase()
          .includes(query) ||
        (vehicle?.model ?? '')
          .toLowerCase()
          .includes(query)
      )
    })
  }, [
    drivers,
    search,
    branchMap,
    assignmentByDriver,
    vehicleMap,
  ])

  const activeDrivers =
    drivers.filter(
      (driver) => driver.active
    ).length

  const assignedDrivers =
    drivers.filter((driver) =>
      assignmentByDriver.has(driver.id)
    ).length

  const unassignedDrivers =
    drivers.length - assignedDrivers

  return (
    <AppShell>
      <div className="space-y-6">

        {/* CABEÇALHO */}

        <section>
          <p className="text-sm font-medium text-blue-400">
            Gestão de pessoas
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Motoristas
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Acompanhe motoristas, bases e veículos atualmente atribuídos.
          </p>
        </section>

        {/* INDICADORES */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Motoristas"
            value={drivers.length}
            icon={Users}
          />

          <StatCard
            label="Ativos"
            value={activeDrivers}
            icon={UserRound}
          />

          <StatCard
            label="Sem veículo"
            value={unassignedDrivers}
            icon={Car}
          />
        </section>

        {/* BUSCA */}

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar motorista, e-mail, placa ou base..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
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

        {/* ERRO */}{errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* LISTAGEM */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />

              <p className="text-sm text-zinc-500">
                Carregando motoristas...
              </p>
            </div>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <Users className="mx-auto h-9 w-9 text-zinc-700" />

            <p className="mt-3 font-medium text-zinc-300">
              Nenhum motorista encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Nenhum perfil de motorista corresponde à busca.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDrivers.map(
              (driver) => {
                const branch =
                  driver.branch_id
                    ? branchMap.get(
                        driver.branch_id
                      )
                    : null

                const assignment =
                  assignmentByDriver.get(
                    driver.id
                  )

                const vehicle =
                  assignment
                    ? vehicleMap.get(
                        assignment.vehicle_id
                      )
                    : null

                return (
                  <article
                    key={driver.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6"
                  >
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

                    <div className="mt-4 min-w-0">
                      <h2 className="truncate text-lg font-bold text-white">
                        {driver.full_name}
                      </h2>

                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                        <Mail className="h-3.5 w-3.5 shrink-0" />

                        <span className="truncate">
                          {driver.email}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">
                      <InfoRow
                        icon={Building2}
                        label="Base atual"
                        value={
                          branch
                            ?` ${branch.name} • ${branch.code}`
                            : 'Sem base'
                        }
                      />

                      <InfoRow
                        icon={Car}
                        label="Veículo"
                        value={
                          vehicle
                            ?` ${vehicle.model} • ${vehicle.plate}`
                            : 'Não atribuído'
                        }
                      />{vehicle && (
                        <InfoRow
                          icon={Car}
                          label="Status veículo"
                          value={
                            vehicle.status ??
                            'Ativo'
                          }
                        />
                      )}
                    </div>

                    {assignment && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                          Atribuído desde
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {formatDate(
                            assignment.assigned_at
                          )}
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
        <p className="text-[11px] uppercase tracking-wider text-zinc-600">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-medium text-zinc-300">
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
    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
      Ativo
    </span>
  ) : (
    <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400">
      Inativo
    </span>
  )
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'medium',
    }
  ).format(new Date(value))
}