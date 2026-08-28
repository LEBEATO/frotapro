'use client'

import { useEffect, useState } from 'react'
import { MapPinned } from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type StateRow = {
  id: string
  name: string
  uf: string
  ibge_code: string | null
  active: boolean
}

export default function AdminStatesPage() {
  const supabase = createClient()

  const [states, setStates] = useState<StateRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStates() {
      const { data, error } = await supabase
        .from('states')
        .select(`
          id,
          name,
          uf,
          ibge_code,
          active
        `)
        .order('name')

      if (error) {
        console.error('Erro ao carregar estados:', error)
      }

      setStates(data ?? [])
      setLoading(false)
    }

    loadStates()
  }, [supabase])

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-blue-400">
            Estrutura nacional
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Estados
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Estados atendidos pela operação FrotaPro.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-blue-400" />
              <h2 className="font-semibold text-white">
                Estados cadastrados
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
              {states.map((state) => (
                <div
                  key={state.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div>
                    <p className="font-semibold text-zinc-200">
                      {state.name}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      UF: {state.uf}
                      {state.ibge_code
                        ?  `• IBGE: ${state.ibge_code}`
                        : ''}
                    </p>
                  </div>

                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      state.active
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-500',
                    ].join(' ')}
                  >
                    {state.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}