'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Car,
  Gauge,
  Loader2,
  Plus,
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

type ManagerProfile = {
  id: string
  role: string
  branch_id: string | null
  active: boolean
}

export default function ManagerVehiclesPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [manager, setManager] =
    useState<ManagerProfile | null>(null)

  const [vehicles, setVehicles] =
    useState<VehicleRow[]>([])

  const [profiles, setProfiles] =
    useState<ProfileRow[]>([])

  const [branch, setBranch] =
    useState<BranchRow | null>(null)

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      // -------------------------------------------------
      // USUÁRIO AUTENTICADO
      // -------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'Usuário não autenticado.'
        )
      }

      // -------------------------------------------------
      // PERFIL DO GESTOR
      // -------------------------------------------------

      const {
        data: managerProfileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          branch_id,
          active
        `)
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!managerProfileData) {
        throw new Error(
          'Perfil do gestor não encontrado.'
        )
      }

      const managerProfile =
        managerProfileData as ManagerProfile

      if (
        managerProfile.active === false
      ) {
        throw new Error(
          'Este usuário está desativado.'
        )
      }

      if (
        managerProfile.role !==
        'branch_manager'
      ) {
        throw new Error(
          'Esta página é exclusiva para gestores de base.'
        )
      }

      if (!managerProfile.branch_id) {
        setManager(null)
        setVehicles([])
        setProfiles([])
        setBranch(null)

        throw new Error(
          'O gestor ainda não está vinculado a uma base.'
        )
      }

      setManager(managerProfile)

      const branchId =
        managerProfile.branch_id

      // -------------------------------------------------
      // CARREGAR DADOS DA BASE
      // -------------------------------------------------

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
          .eq(
            'current_branch_id',
            branchId
          )
          .order('plate'),

        supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            role,
            branch_id
          `)
          .eq(
            'branch_id',
            branchId
          ),

        supabase
          .from('branches')
          .select(`
            id,
            name,
            code,
            city
          `)
          .eq('id', branchId)
          .maybeSingle(),
      ])

      if (vehiclesResponse.error) {
        throw vehiclesResponse.error
      }

      if (profilesResponse.error) {
        throw profilesResponse.error
      }

      if (branchResponse.error) {
        throw branchResponse.error
      }

      setVehicles(
        (
          vehiclesResponse.data ??
          []
        ) as VehicleRow[]
      )

      setProfiles(
        (
          profilesResponse.data ??
          []
        ) as ProfileRow[]
      )

      setBranch(
        (
          branchResponse.data ??
          null
        ) as BranchRow | null
      )
    } catch (error) {
      console.error(
        'Erro ao carregar veículos da base:',
        error
      )

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

  // =====================================================
  // MAPA DOS MOTORISTAS
  // =====================================================

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    )
  }, [profiles])

  // =====================================================
  // FILTRO
  // =====================================================

  const filteredVehicles =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      if (!query) {
        return vehicles
      }

      return vehicles.filter(
        (vehicle) => {
          const driver =
            vehicle.driver_id
              ? profileMap.get(
                  vehicle.driver_id
                )
              : null

          const values = [
            vehicle.plate,
            vehicle.model,
            vehicle.year,
            vehicle.status,
            driver?.full_name,
            driver?.email,
          ]

          return values
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            )
        }
      )
    }, [
      vehicles,
      search,
      profileMap,
    ])

  // =====================================================
  // INDICADORES
  // =====================================================

  const totalVehicles =
    vehicles.length

  const activeVehicles =
    vehicles.filter(
      (vehicle) =>
        vehicle.status === 'Ativo' ||
        !vehicle.status
    ).length

  const maintenanceVehicles =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        'Manutenção'
    ).length

  const inactiveVehicles =
    vehicles.filter(
      (vehicle) =>
        vehicle.status === 'Inativo'
    ).length

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <Link
              href="/manager"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
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
                Cadastre e acompanhe somente os veículos da sua unidade.
                O acesso aos veículos de outras bases permanece bloqueado.
              </p>

            </div>

          </div>

          {/* AÇÕES */}

          <div className="flex flex-col gap-2 sm:flex-row">

            <Link
              href="/manager/vehicles/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Novo veículo
            </Link>

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

          </div>

        </section>

        {/* =================================================
            BASE
        ================================================= */}

        {branch && (
          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">

            <div className="flex items-start gap-3">

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Base responsável
                </p>

                <p className="mt-1 text-sm font-semibold text-blue-300">
                  {branch.name}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {branch.city} • Código {branch.code}
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Novos veículos cadastrados pelo gestor serão vinculados
                  automaticamente a esta unidade.
                </p>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            INDICADORES
        ================================================= */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Total da base"
            value={totalVehicles}
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
            icon={Wrench}
          />

          <StatCard
            label="Inativos"
            value={inactiveVehicles}
            icon={AlertTriangle}
          />

        </section>

        {/* =================================================
            BUSCA
        ================================================= */}

        <section className="relative">

          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar por placa, modelo, ano, motorista ou e-mail..."
            className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

        </section>

        {/* =================================================
            ERRO
        ================================================= */}

        {errorMessage && (
          <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">

            <p className="text-sm font-semibold text-red-400">
              Erro ao carregar veículos
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
                Carregando veículos da base...
              </p>

            </div>

          </div>

        ) : filteredVehicles.length === 0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">

            <Car className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-4 font-semibold text-zinc-300">
              Nenhum veículo encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre o primeiro veículo da unidade para começar a operação.
            </p>

            {manager && (
              <Link
                href="/manager/vehicles/new"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Cadastrar veículo
              </Link>
            )}

          </div>

        ) : (

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredVehicles.map(
              (vehicle) => {

                const driver =
                  vehicle.driver_id
                    ? profileMap.get(
                        vehicle.driver_id
                      )
                    : null

                return (
                  <article
                    key={vehicle.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6"
                  >

                    {/* STATUS */}

                    <div className="flex items-start justify-between gap-4">

                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                        <Car className="h-5 w-5" />
                      </div>

                      <VehicleStatus
                        status={
                          vehicle.status
                        }
                      />

                    </div>

                    {/* VEÍCULO */}

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

                    {/* INFORMAÇÕES */}

                    <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">

                      <InfoRow
                        icon={Gauge}
                        label="Quilometragem"
                        value={`${(
                          vehicle.mileage ??
                          0
                        ).toLocaleString(
                          'pt-BR'
                        )} km`}
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
                            : 'Base não identificada'
                        }
                      />

                    </div>

                    {/* MOTORISTA */}

                    {driver?.email && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                          E-mail do motorista
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {driver.email}
                        </p>

                      </div>
                    )}

                    {/* SEM MOTORISTA */}

                    {!driver && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">

                        <p className="text-xs font-medium text-amber-400">
                          Veículo disponível para atribuição.
                        </p>

                        <Link
                          href="/manager/drivers"
                          className="mt-2 inline-flex text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                        >
                          Ir para Motoristas →
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
// TIPOS AUXILIARES
// =====================================================

type IconType =
  React.ComponentType<{
    className?: string
  }>

// =====================================================
// STAT CARD
// =====================================================

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

// =====================================================
// INFO ROW
// =====================================================

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

// =====================================================
// STATUS DO VEÍCULO
// =====================================================

function VehicleStatus({
  status,
}: {
  status: string | null
}) {
  const value =
    status ?? 'Ativo'

  if (
    value === 'Manutenção'
  ) {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        Manutenção
      </span>
    )
  }

  if (
    value === 'Inativo'
  ) {
    return (
      <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400">
        Inativo
      </span>
    )
  }

  return (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
      Ativo
    </span>
  )
}