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
  Loader2,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'

import {
  AppShell,
} from '@/components/layout/AppShell'

import {
  createClient,
} from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

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

type ManagerRow = {
  id: string

  full_name: string

  email: string

  role: string

  branch_id: string | null

  active: boolean
}

// =====================================================
// AUXILIAR ESTADO
// =====================================================

function getState(
  branch: BranchRow | null
): BranchState | null {
  if (
    !branch?.states
  ) {
    return null
  }

  if (
    Array.isArray(
      branch.states
    )
  ) {
    return (
      branch.states[0] ??
      null
    )
  }

  return branch.states
}

// =====================================================
// PAGE
// =====================================================

export default function AdminManagersPage() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )

  const [
    managers,
    setManagers,
  ] = useState<
    ManagerRow[]
  >([])

  const [
    branches,
    setBranches,
  ] = useState<
    BranchRow[]
  >([])

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData =
    useCallback(
      async () => {
        setLoading(true)

        setErrorMessage(
          ''
        )

        try {
          const [
            managersResponse,
            branchesResponse,
          ] =
            await Promise.all(
              [
                supabase
                  .from(
                    'profiles'
                  )
                  .select(
                    `
                      id,
                      full_name,
                      email,
                      role,
                      branch_id,
                      active
                    `
                  )
                  .eq(
                    'role',
                    'branch_manager'
                  )
                  .order(
                    'full_name'
                  ),

                supabase
                  .from(
                    'branches'
                  )
                  .select(
                    `
                      id,
                      name,
                      code,
                      city,
                      active,
                      states (
                        name,
                        uf
                      )
                    `
                  )
                  .order(
                    'name'
                  ),
              ]
            )

          if (
            managersResponse.error
          ) {
            throw managersResponse.error
          }

          if (
            branchesResponse.error
          ) {
            throw branchesResponse.error
          }

          setManagers(
            (
              managersResponse.data as
                | ManagerRow[]
                | null
            ) ?? []
          )

          setBranches(
            (
              branchesResponse.data as
                | BranchRow[]
                | null
            ) ?? []
          )
        } catch (
          error
        ) {
          console.error(
            'Erro ao carregar gestores:',
            error
          )

          setErrorMessage(
            'Não foi possível carregar os gestores.'
          )
        } finally {
          setLoading(
            false
          )
        }
      },
      [
        supabase,
      ]
    )

  useEffect(
    () => {
      void loadData()
    },
    [
      loadData,
    ]
  )

  // =====================================================
  // MAPA DE BASES
  // =====================================================

  const branchMap =
    useMemo(
      () =>
        new Map(
          branches.map(
            (
              branch
            ) => [
              branch.id,
              branch,
            ]
          )
        ),
      [
        branches,
      ]
    )

  // =====================================================
  // FILTRO
  // =====================================================

  const filteredManagers =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        if (
          !query
        ) {
          return managers
        }

        return managers.filter(
          (
            manager
          ) => {
            const branch =
              manager.branch_id
                ? branchMap.get(
                    manager.branch_id
                  ) ??
                  null
                : null

            const state =
              getState(
                branch
              )

            const values =
              [
                manager.full_name,
                manager.email,

                branch?.name,
                branch?.code,
                branch?.city,

                state?.name,
                state?.uf,
              ]

            return values
              .filter(
                Boolean
              )
              .some(
                (
                  value
                ) =>
                  String(
                    value
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
          }
        )
      },
      [
        managers,
        search,
        branchMap,
      ]
    )

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  const activeManagers =
    managers.filter(
      (
        manager
      ) =>
        manager.active
    ).length

  const managersWithBranch =
    managers.filter(
      (
        manager
      ) =>
        Boolean(
          manager.branch_id
        )
    ).length

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* HEADER */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              Administração
              global
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Gestores
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Gestores
              responsáveis
              pelas bases do
              FrotaPro.
            </p>
          </div>

          <Link
            href="/admin/managers/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />

            Novo gestor
          </Link>
        </section>

        {/* ESTATÍSTICAS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Gestores"
            value={
              managers.length
            }
            icon={
              Users
            }
          />

          <StatCard
            label="Ativos"
            value={
              activeManagers
            }
            icon={
              ShieldCheck
            }
          />

          <StatCard
            label="Com base"
            value={
              managersWithBranch
            }
            icon={
              Building2
            }
          />
        </section>

        {/* BUSCA */}

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Buscar gestor, e-mail, base, cidade ou estado..."
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={
              loading
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Atualizar
          </button>
        </section>

        {/* ERRO */}

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {
              errorMessage
            }
          </div>
        )}

        {/* CARREGANDO */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
          </div>
        ) : filteredManagers.length ===
          0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <UserRound className="mx-auto h-9 w-9 text-zinc-700" />

            <p className="mt-3 font-medium text-zinc-300">
              Nenhum gestor
              encontrado
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredManagers.map(
              (
                manager
              ) => {
                const branch =
                  manager.branch_id
                    ? branchMap.get(
                        manager.branch_id
                      ) ??
                      null
                    : null

                const state =
                  getState(
                    branch
                  )

                return (
                  <article
                    key={
                      manager.id
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          manager.active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {manager.active
                          ? 'Ativo'
                          : 'Inativo'}
                      </span>
                    </div>

                    <h2 className="mt-4 truncate text-lg font-bold text-white">
                      {
                        manager.full_name
                      }
                    </h2>

                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                      <Mail className="h-4 w-4 shrink-0" />

                      <span className="truncate">
                        {
                          manager.email
                        }
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">
                      <InfoRow
                        icon={
                          Building2
                        }
                        label="Base"
                        value={
                          branch
                            ? `${branch.name} • ${branch.code}`
                            : 'Sem base vinculada'
                        }
                      />

                      <InfoRow
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