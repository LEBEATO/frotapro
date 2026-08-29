'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Car,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
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
  role: string | null
  branch_id: string | null
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
}

export default function ManagerVehiclesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [branch, setBranch] = useState<BranchRow | null>(null)

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Usuário não autenticado.')
      }

      const {
        data: managerProfile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('id, role, branch_id, active')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!managerProfile) {
        throw new Error('Perfil do gestor não encontrado.')
      }

      if (managerProfile.active === false) {
        throw new Error('Este usuário está desativado.')
      }

      if (!managerProfile.branch_id) {
        setVehicles([])
        setProfiles([])
        setBranch(null)
        throw new Error('O gestor ainda não está vinculado a uma base.')
      }

      const branchId = managerProfile.branch_id

      const [
        vehiclesResponse,
        profilesResponse,
        branchResponse,
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
          .eq('current_branch_id', branchId)
          .order('plate'),

        supabase
          .from('profiles')
          .select('id, full_name, email, role, branch_id')
          .eq('branch_id', branchId),

        supabase
          .from('branches')
          .select('id, name, code, city')
          .eq('id', branchId)
          .maybeSingle(),
      ])

      if (vehiclesResponse.error) throw vehiclesResponse.error
      if (profilesResponse.error) throw profilesResponse.error
      if (branchResponse.error) throw branchResponse.error

      setVehicles(
        (vehiclesResponse.data as VehicleRow[] | null) ?? []
      )

      setProfiles(
        (profilesResponse.data as ProfileRow[] | null) ?? []
      )

      setBranch(
        (branchResponse.data as BranchRow | null) ?? null
      )
    } catch (error: unknown) {
      console.error('Erro ao carregar veículos da base:', error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os veículos da base.'
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => [profile.id, profile])
    )
  }, [profiles])

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return vehicles

    return vehicles.filter((vehicle) => {
      const driver = vehicle.driver_id
        ? profileMap.get(vehicle.driver_id)
        : null

      return (
        vehicle.plate.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        vehicle.year.toLowerCase().includes(query) ||
        (driver?.full_name ?? '').toLowerCase().includes(query) ||
        (driver?.email ?? '').toLowerCase().includes(query)
      )
    })
  }, [vehicles, search, profileMap])

  const totalVehicles = vehicles.length

  const activeVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === 'Ativo' ||
      !vehicle.status
  ).length

  const maintenanceVehicles = vehicles.filter(
    (vehicle) => vehicle.status === 'Manutenção'
  ).length

  const inactiveVehicles = vehicles.filter(
    (vehicle) => vehicle.status === 'Inativo'
  ).length

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/manager"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              aria-label="Voltar ao painel do gestor"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <p className="text-sm font-medium text-blue-400">
                {branch
                  ? `${branch.name} • ${branch.city}`
                  : 'Minha base'}
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Veículos da Base
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Consulte somente os veículos vinculados à sua unidade.
                O acesso a outras bases é bloqueado pela aplicação e pelo RLS.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
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

        {branch && (
          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-300">
                  {branch.name}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {branch.city} • Código {branch.code}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total da base" value={totalVehicles} icon={Car} />
          <StatCard label="Ativos" value={activeVehicles} icon={Gauge} />
          <StatCard
            label="Em manutenção"
            value={maintenanceVehicles}
            icon={Wrench}
          />
          <StatCard
            label="Inativos"
            value={inactiveVehicles}
            icon={AlertTriangle}
          />
        </section>

        <section className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por placa, modelo, ano, motorista ou e-mail..."
            className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
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
                Carregando veículos da base...
              </p>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <Car className="mx-auto h-9 w-9 text-zinc-700" />

            <p className="mt-3 font-medium text-zinc-300">
              Nenhum veículo encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Não há veículos vinculados à sua base ou a busca não encontrou resultados.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => {
              const driver = vehicle.driver_id
                ? profileMap.get(vehicle.driver_id)
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

                    <VehicleStatus status={vehicle.status} />
                  </div>

                  <div className="mt-4">
                    <h2 className="text-lg font-bold text-white">
                      {vehicle.model}
                    </h2>

                    <p className="mt-1 font-mono text-sm font-semibold uppercase text-blue-400">
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
                      ).toLocaleString('pt-BR')} km`}
                    />

                    <InfoRow
                      icon={UserRound}
                      label="Motorista"
                      value={driver?.full_name ?? 'Não atribuído'}
                    />

                    <InfoRow
                      icon={Building2}
                      label="Base"
                      value={
                        branch
                          ? `${branch.name} • ${branch.code}`
                          : 'Base não identificada'
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
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