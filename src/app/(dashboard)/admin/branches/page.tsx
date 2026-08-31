'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import {
  Building2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

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
  states: BranchState | BranchState[] | null
}

function getState(
  branch: BranchRow
): BranchState | null {
  if (!branch.states) {
    return null
  }

  if (Array.isArray(branch.states)) {
    return branch.states[0] ?? null
  }

  return branch.states
}

export default function AdminBranchesPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [branches, setBranches] =
    useState<BranchRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [search, setSearch] =
    useState('')

  const loadBranches = useCallback(
    async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const {
          data,
          error,
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
          .order('name')

        if (error) {
          throw error
        }

        setBranches(
          (data as BranchRow[] | null) ?? []
        )
      } catch (error) {
        console.error(
          'Erro ao carregar bases:',
          error
        )

        setErrorMessage(
          'Não foi possível carregar as bases.'
        )

        setBranches([])
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    void loadBranches()
  }, [loadBranches])

  const filteredBranches = useMemo(() => {
    const query =
      search.trim().toLowerCase()

    if (!query) {
      return branches
    }

    return branches.filter(
      (branch) => {
        const state =
          getState(branch)

        return [
          branch.name,
          branch.code,
          branch.city,
          state?.name,
          state?.uf,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          )
      }
    )
  }, [branches, search])

  const activeBranches =
    branches.filter(
      (branch) => branch.active
    ).length

  const inactiveBranches =
    branches.length -
    activeBranches

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* CABEÇALHO */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              Estrutura operacional
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Bases e unidades
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Cadastre cidades e bases que fazem parte da operação do FrotaPro.
            </p>
          </div>

          <Link
            href="/admin/branches/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Nova base
          </Link>
        </section>

        {/* INDICADORES */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total de bases"
            value={branches.length}
          />

          <StatCard
            label="Ativas"
            value={activeBranches}
          />

          <StatCard
            label="Inativas"
            value={inactiveBranches}
          />
        </section>

        {/* BUSCA */}

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar base, cidade, estado ou código..."
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void loadBranches()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
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

        {/* ERRO */}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* LISTAGEM */}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-500">
              Carregando bases...
            </div>
          ) : filteredBranches.length ===
            0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-zinc-700" />

              <p className="mt-4 font-medium text-zinc-300">
                Nenhuma base encontrada
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Cadastre uma nova cidade e base para começar.
              </p>
            </div>
          ) : (
            filteredBranches.map(
              (branch) => {
                const state =
                  getState(branch)

                return (
                  <article
                    key={branch.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <span
                        className={[
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          branch.active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-500',
                        ].join(' ')}
                      >
                        {branch.active
                          ? 'Ativa'
                          : 'Inativa'}
                      </span>
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-white">
                      {branch.name}
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      Código: {branch.code}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-4 w-4 shrink-0" />

                      <span>
                        {branch.city}

                        {state?.uf
                          ? ` - ${state.uf}`
                          : ''}
                      </span>
                    </div>

                    {state?.name && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Estado: {state.name}
                      </p>
                    )}
                  </article>
                )
              }
            )
          )}
        </section>
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value}
      </p>
    </article>
  )
}