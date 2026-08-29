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
  Building2,
  Car,
  ClipboardCheck,
  Fuel,
  Loader2,
  RefreshCw,
  Users,
  Wrench,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

type ManagerProfile = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type StateData = {
  name: string
  uf: string
}

type BranchData = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
  states: StateData | StateData[] | null
}

type DashboardStats = {
  vehicles: number
  drivers: number
  checklists: number
  fuelRecords: number
  maintenance: number
}

type IconType = ComponentType<{
  className?: string
}>

// =====================================================
// AUXILIAR ESTADO
// =====================================================

function getState(branch: BranchData | null): StateData | null {
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

export default function ManagerPage() {
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<ManagerProfile | null>(null)

  const [branch, setBranch] = useState<BranchData | null>(null)

  const [stats, setStats] = useState<DashboardStats>({
    vehicles: 0,
    drivers: 0,
    checklists: 0,
    fuelRecords: 0,
    maintenance: 0,
  })

  const [loading, setLoading] = useState(true)

  const [errorMessage, setErrorMessage] = useState('')

  // =====================================================
  // CARREGAR DASHBOARD
  // =====================================================

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      // =================================================
      // USUÁRIO LOGADO
      // =================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error('Usuário não autenticado.')
      }

      // =================================================
      // PERFIL DO GESTOR
      // =================================================

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          branch_id,
          active
        `)
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profileData) {
        throw new Error(
          'Perfil do gestor não encontrado.'
        )
      }

      const managerProfile =
        profileData as ManagerProfile

      if (!managerProfile.active) {
        throw new Error(
          'Seu usuário está inativo.'
        )
      }

      if (
        managerProfile.role !==
        'branch_manager'
      ) {
        throw new Error(
          'Este painel está disponível apenas para gestores de base.'
        )
      }

      if (!managerProfile.branch_id) {
        throw new Error(
          'O gestor ainda não está vinculado a uma base.'
        )
      }

      setProfile(managerProfile)

      const branchId =
        managerProfile.branch_id

      // =================================================
      // BASE DO GESTOR
      // =================================================

      const {
        data: branchData,
        error: branchError,
      } = await supabase
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
        .eq('id', branchId)
        .maybeSingle()

      if (branchError) {
        throw branchError
      }

      if (!branchData) {
        throw new Error(
          'Base vinculada ao gestor não encontrada.'
        )
      }

      setBranch(
        branchData as BranchData
      )

      // =================================================
      // ESTATÍSTICAS DA BASE
      // =================================================

      const [
        vehiclesResponse,
        driversResponse,
        checklistsResponse,
        fuelResponse,
        maintenanceResponse,
      ] = await Promise.all([
        // VEÍCULOS
        supabase
          .from('vehicles')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'current_branch_id',
            branchId
          ),

        // MOTORISTAS
        supabase
          .from('profiles')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'role',
            'driver'
          )
          .eq(
            'branch_id',
            branchId
          ),

        // CHECKLISTS
        supabase
          .from('driver_checklists')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'branch_id',
            branchId
          ),

        // ABASTECIMENTOS
        supabase
          .from('fuel_records')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'branch_id',
            branchId
          ),

        // MANUTENÇÕES ABERTAS
        supabase
          .from('maintenance_records')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'branch_id',
            branchId
          )
          .in(
            'status',
            [
              'pending',
              'in_progress',
            ]
          ),
      ])

      if (vehiclesResponse.error) {
        throw vehiclesResponse.error
      }

      if (driversResponse.error) {
        throw driversResponse.error
      }

      if (checklistsResponse.error) {
        throw checklistsResponse.error
      }

      if (fuelResponse.error) {
        throw fuelResponse.error
      }

      if (maintenanceResponse.error) {
        throw maintenanceResponse.error
      }

      setStats({
        vehicles:
          vehiclesResponse.count ?? 0,

        drivers:
          driversResponse.count ?? 0,

        checklists:
          checklistsResponse.count ?? 0,

        fuelRecords:
          fuelResponse.count ?? 0,

        maintenance:
          maintenanceResponse.count ?? 0,
      })
    } catch (error) {
      console.error(
        'Erro ao carregar painel do gestor:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o painel do gestor.'
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const state =
    useMemo(
      () => getState(branch),
      [branch]
    )

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />

            <p className="mt-4 text-sm text-zinc-500">
              Carregando painel da base...
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  // =====================================================
  // ERRO
  // =====================================================

  if (errorMessage) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-lg font-bold text-white">
              Não foi possível carregar o painel
            </h1>

            <p className="mt-2 text-sm text-red-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <RefreshCw className="h-4 w-4" />

              Tentar novamente
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* HEADER */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-400">
              Gestão da base
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Painel do gestor
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Bem-vindo,{' '}
              <span className="font-medium text-zinc-200">
                {profile?.full_name}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" />

            Atualizar
          </button>
        </section>

        {/* BASE */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Base responsável
              </p>

              <h2 className="mt-1 truncate text-xl font-bold text-white">
                {branch?.name ??
                  'Base não identificada'}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {branch?.city}

                {state?.uf
                  ? ` - ${state.uf}`
                  : ''}
              </p>

              {branch?.code && (
                <p className="mt-1 text-xs text-zinc-600">
                  Código da base:{' '}
                  {branch.code}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ESTATÍSTICAS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Veículos"
            value={stats.vehicles}
            icon={Car}
          />

          <StatCard
            label="Motoristas"
            value={stats.drivers}
            icon={Users}
          />

          <StatCard
            label="Checklists"
            value={stats.checklists}
            icon={ClipboardCheck}
          />

          <StatCard
            label="Abastecimentos"
            value={stats.fuelRecords}
            icon={Fuel}
          />

          <StatCard
            label="Manutenções"
            value={stats.maintenance}
            icon={Wrench}
          />
        </section>

        {/* ACESSOS RÁPIDOS */}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              Gestão da unidade
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Acesse os módulos da sua base.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <QuickAccessCard
              title="Veículos"
              description="Consulte os veículos vinculados à sua base."
              href="/manager/vehicles"
              icon={Car}
            />

            <QuickAccessCard
              title="Motoristas"
              description="Consulte e gerencie os motoristas da sua unidade."
              href="/manager/drivers"
              icon={Users}
            />

            <QuickAccessCard
              title="Checklists"
              description="Acompanhe os checklists enviados pelos motoristas."
              href="/manager/checklists"
              icon={ClipboardCheck}
            />

            <QuickAccessCard
              title="Abastecimentos"
              description="Controle os abastecimentos realizados na base."
              href="/manager/fuel"
              icon={Fuel}
            />

            <QuickAccessCard
              title="Manutenções"
              description="Acompanhe veículos e ocorrências em manutenção."
              href="/manager/maintenance"
              icon={Wrench}
            />
          </div>
        </section>
      </div>
    </AppShell>
  )
}

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

// =====================================================
// QUICK ACCESS CARD
// =====================================================

function QuickAccessCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: IconType
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-blue-500/40 hover:bg-zinc-900"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400 transition group-hover:bg-blue-500/20">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h3 className="font-semibold text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-5 text-zinc-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}