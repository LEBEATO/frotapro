'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin } from 'lucide-react'

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

function getState(branch: BranchRow): BranchState | null {
  if (!branch.states) {
    return null
  }

  if (Array.isArray(branch.states)) {
    return branch.states[0] ?? null
  }

  return branch.states
}

export default function AdminBranchesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [branches, setBranches] = useState<BranchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadBranches() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
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
        console.error('Erro ao carregar bases:', error)
        setErrorMessage('Não foi possível carregar as bases.')
        setBranches([])
        setLoading(false)
        return
      }

      setBranches((data as BranchRow[] | null) ?? [])
      setLoading(false)
    }

    void loadBranches()
  }, [supabase])

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <section>
          <p className="text-sm font-medium text-blue-400">
            Estrutura operacional
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Bases e unidades
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Unidades operacionais distribuídas pelo território nacional.
          </p>
        </section>

        {/* Erro */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Bases */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">
              Carregando bases...
            </div>
          ) : branches.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">
              Nenhuma base cadastrada.
            </div>
          ) : (
            branches.map((branch) => {
              const state = getState(branch)

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
                      {branch.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <h2 className="mt-4 font-semibold text-white">
                    {branch.name}
                  </h2><p className="mt-1 text-xs text-zinc-500">
                    Código: {branch.code}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                    <MapPin className="h-4 w-4 shrink-0" />

                    <span>
                      {branch.city}
                      {state?.uf ?  ` - ${state.uf} `: ''}
                    </span>
                  </div>

                  {state?.name && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Estado: {state.name}
                    </p>
                  )}
                </article>
              )
            })
          )}
        </section>
      </div>
    </AppShell>
  )
}