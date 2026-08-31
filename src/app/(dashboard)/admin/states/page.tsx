'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Building2,
  MapPinned,
  RefreshCw,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type StateRow = {
  id: string
  name: string
  uf: string
  ibge_code: string | null
  active: boolean
}

type BranchRow = {
  id: string
  state_id: string
  active: boolean
}

type StateWithBranches = StateRow & {
  totalBranches: number
  activeBranches: number
}

export default function AdminStatesPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [states, setStates] =
    useState<StateWithBranches[]>([])

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  const loadStates = useCallback(
    async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [
          statesResponse,
          branchesResponse,
        ] = await Promise.all([
          supabase
            .from('states')
            .select(`
              id,
              name,
              uf,
              ibge_code,
              active
            `)
            .order('name'),

          supabase
            .from('branches')
            .select(`
              id,
              state_id,
              active
            `),
        ])

        if (statesResponse.error) {
          throw statesResponse.error
        }

        if (branchesResponse.error) {
          throw branchesResponse.error
        }

        const stateRows =
          (statesResponse.data as StateRow[] | null) ?? []

        const branchRows =
          (branchesResponse.data as BranchRow[] | null) ?? []

        const formattedStates =
          stateRows.map((state) => {
            const stateBranches =
              branchRows.filter(
                (branch) =>
                  branch.state_id === state.id
              )

            const activeBranches =
              stateBranches.filter(
                (branch) =>
                  branch.active
              ).length

            return {
              ...state,
              totalBranches:
                stateBranches.length,
              activeBranches,
            }
          })

        setStates(formattedStates)
      } catch (error) {
        console.error(
          'Erro ao carregar estados:',
          error
        )

        setErrorMessage(
          'Não foi possível carregar os estados.'
        )

        setStates([])
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    void loadStates()
  }, [loadStates])

  const statesInOperation =
    states.filter(
      (state) =>
        state.activeBranches > 0
    ).length

  const statesWithoutOperation =
    states.length -
    statesInOperation

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              aria-label="Voltar para o painel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <p className="text-sm font-medium text-blue-400">
                Estrutura nacional
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Estados
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Acompanhe em quais estados a empresa possui bases
                e operações ativas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadStates()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* =====================================================
            INDICADORES
        ===================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Estados cadastrados"
            value={states.length}
          />

          <StatCard
            label="Em operação"
            value={statesInOperation}
          />

          <StatCard
            label="Sem operação"
            value={statesWithoutOperation}
          />
        </section>

        {/* =====================================================
            EXPLICAÇÃO
        ===================================================== */}

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

            <div>
              <p className="text-sm font-semibold text-blue-300">
                Como funciona
              </p>

              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Um estado aparece como
                <strong className="mx-1 text-emerald-400">
                  Em operação
                </strong>
                quando possui pelo menos uma base ativa.
                Estados sem bases ativas aparecem como
                <strong className="ml-1 text-zinc-300">
                  Sem operação
                </strong>.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            ERRO
        ===================================================== */}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* =====================================================
            LISTA
        ===================================================== */}

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-blue-400" />

              <h2 className="font-semibold text-white">
                Estrutura por estado
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Carregando estados...
            </div>
          ) : states.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Nenhum estado cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {states.map(
                (state) => {
                  const inOperation =
                    state.activeBranches > 0

                  return (
                    <div
                      key={state.id}
                      className="flex flex-col gap-4 px-5 py-5 transition hover:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      {/* ESTADO */}

                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={[
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                              inOperation
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                : 'border-zinc-800 bg-zinc-950 text-zinc-600',
                            ].join(' ')}
                          >
                            <MapPinned className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="font-semibold text-zinc-200">
                              {state.name}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              UF: {state.uf}

                              {state.ibge_code
                                ? ` • IBGE: ${state.ibge_code}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* INFORMAÇÕES */}

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Building2 className="h-4 w-4 text-zinc-500" />

                          <span>
                            {state.activeBranches}{' '}
                            {state.activeBranches === 1
                              ? 'base ativa'
                              : 'bases ativas'}
                          </span>
                        </div>

                        <span
                          className={[
                            'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
                            inOperation
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-zinc-800 text-zinc-400',
                          ].join(' ')}
                        >
                          {inOperation
                            ? 'Em operação'
                            : 'Sem operação'}
                        </span>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
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