'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Car,
  Gauge,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type VehicleRow = {
  id: string
  model: string
  plate: string
  year: string
  status: string | null
  mileage: number | null
  fuel_level: number | null
  driver_id: string | null
  current_branch_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string
  email: string
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
}

export default function AdminVehiclesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    try {
      const [
        vehiclesResponse,
        profilesResponse,
        branchesResponse,
      ] = await Promise.all([
        supabase
          .from('vehicles')
          .select(`
            id,
            model,
            plate,
            year,
            status,
            mileage,
            fuel_level,
            driver_id,
            current_branch_id
          `)
          .order('plate'),

        supabase
          .from('profiles')
          .select('id, full_name, email'),

        supabase
          .from('branches')
          .select('id, name, code, city'),
      ])

      if (vehiclesResponse.error) {
        throw vehiclesResponse.error
      }

      if (profilesResponse.error) {
        throw profilesResponse.error
      }

      if (branchesResponse.error) {
        throw branchesResponse.error
      }

      setVehicles(
        (vehiclesResponse.data as VehicleRow[] | null) ?? []
      )

      setProfiles(
        (profilesResponse.data as ProfileRow[] | null) ?? []
      )

      setBranches(
        (branchesResponse.data as BranchRow[] | null) ?? []
      )
    } catch (error: unknown) {
      console.error(
        'Erro ao carregar veículos:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os veículos.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ])
    )
  }, [profiles])

  const branchMap = useMemo(() => {
    return new Map(
      branches.map((branch) => [
        branch.id,
        branch,
      ])
    )
  }, [branches])

  const filteredVehicles = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    if (!query) {
      return vehicles
    }

    return vehicles.filter((vehicle) => {
      const driver = vehicle.driver_id
        ? profileMap.get(vehicle.driver_id)
        : null

      const branch = vehicle.current_branch_id
        ? branchMap.get(vehicle.current_branch_id)
        : null

      return (
        vehicle.plate
          .toLowerCase()
          .includes(query) ||
        vehicle.model
          .toLowerCase()
          .includes(query) ||
        vehicle.year
          .toLowerCase()
          .includes(query) ||
        (driver?.full_name ?? '')
          .toLowerCase()
          .includes(query) ||
        (branch?.name ?? '')
          .toLowerCase()
          .includes(query)
      )
    })
  }, [
    vehicles,
    search,
    profileMap,
    branchMap,
  ])

  const activeVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === 'Ativo' ||
      !vehicle.status
  ).length
  const maintenanceVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === 'Manutenção'
  ).length

  return (
    <AppShell>
      <div className="space-y-6">

        {/* CABEÇALHO */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              Gestão da frota
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Veículos
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Consulte os veículos, motoristas,
              bases e situação operacional da frota.
            </p>
          </div>

          <Link
            href="/admin/vehicles/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </Link>
        </section>

        {/* INDICADORES */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={vehicles.length}
            icon={Car}
          />

          <StatCard
            label="Ativos"
            value={activeVehicles}
            icon={Gauge}
          />

          <StatCard
            label="Em manutenção"
            value={maintenanceVehicles}
            icon={RefreshCw}
          />
        </section>

        {/* BUSCA */}

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar por placa, modelo, motorista ou base..."
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

        {/* LISTAGEM */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />

              <p className="text-sm text-zinc-500">
                Carregando veículos...
              </p>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <Car className="mx-auto h-9 w-9 text-zinc-700" />

            <p className="mt-3 font-medium text-zinc-300">
              Nenhum veículo encontrado
            </p><p className="mt-1 text-sm text-zinc-500">
              Tente alterar a busca ou cadastre um novo veículo.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => {
              const driver = vehicle.driver_id
                ? profileMap.get(vehicle.driver_id)
                : null

              const branch =
                vehicle.current_branch_id
                  ? branchMap.get(
                      vehicle.current_branch_id
                    )
                  : null

              return (
                <article
                  key={vehicle.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                      <Car className="h-5 w-5" />
                    </div>

                    <VehicleStatus
                      status={vehicle.status}
                    />
                  </div>

                  <div className="mt-4">
                    <h2 className="text-lg font-bold text-white">
                      {vehicle.model}
                    </h2>

                    <p className="mt-1 font-mono text-sm font-semibold text-blue-400">
                      {vehicle.plate}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Ano {vehicle.year}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">
                    <InfoRow
                      icon={Gauge}
                      label="Quilometragem"
                      value={`${(
                        vehicle.mileage ?? 0
                      ).toLocaleString(
                        'pt-BR'
                      )}  `}
                    />

                    <InfoRow
                      icon={UserRound}
                      label="Motorista"
                      value={
                        driver?.full_name ??
                        'Não atribuído'
                      }
                    />

                    <InfoRow
                      icon={Building2}
                      label="Base"
                      value={
                        branch
                          ? `${branch.name} • ${branch.code}`
                          : 'Sem base'
                      }
                    />
                  </div>

                  {driver?.email && (
                    <p className="mt-4 truncate rounded-xl bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500">
                      {driver.email}
                    </p>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </div>
    </AppShell>
  )
}

type IconType = React.ComponentType<{
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
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" /><div className="min-w-0">
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

function VehicleStatus({
  status,
}: {
  status: string | null
}) {
  const value = status ?? 'Ativo'

  if (value === 'Manutenção') {
    return (
      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        Manutenção
      </span>
    )
  }

  if (value === 'Inativo') {
    return (
      <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400">
        Inativo
      </span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
      Ativo
    </span>
  )
}