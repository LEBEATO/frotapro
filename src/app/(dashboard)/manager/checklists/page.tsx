'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ManagerChecklistCard } from '@/components/checklists/ManagerChecklistCard'
import { ChecklistPhotosModal } from '@/components/checklists/ChecklistPhotosModal'
import type { Checklist, ChecklistItem } from '@/components/checklists/types'

import { createClient } from '@/lib/supabase/client'
import { Toast, ToastType } from '@/components/Toast'

import {
  ClipboardList,
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Building2,
} from 'lucide-react'

// =====================================================
// TIPOS
// =====================================================

interface ManagerProfile {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

interface StateData {
  name: string
  uf: string
}

interface BranchData {
  id: string
  name: string
  code: string
  city: string
  active: boolean
  states: StateData | StateData[] | null
}

// =====================================================
// PÁGINA
// =====================================================

export default function ManagerChecklistsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [checklists, setChecklists] =
    useState<Checklist[]>([])

  const [branch, setBranch] =
    useState<BranchData | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState('')

  const [filterIssues, setFilterIssues] =
    useState(false)

  const [
    selectedPhotos,
    setSelectedPhotos,
  ] = useState<string[] | null>(null)

  const [
    loadingPhotos,
    setLoadingPhotos,
  ] = useState(false)

  const [
    toast,
    setToast,
  ] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  // =====================================================
  // AUXILIARES
  // =====================================================

  function showToast(
    message: string,
    type: ToastType = 'success'
  ) {
    setToast({
      message,
      type,
    })
  }

  function getChecklistItems(
    items: ChecklistItem[] | null
  ) {
    return Array.isArray(items)
      ? items
      : []
  }

  function getChecklistPhotos(
    photos: string[] | null
  ) {
    return Array.isArray(photos)
      ? photos
      : []
  }

  async function viewChecklistPhotos(
    checklistId: string
  ) {
    setLoadingPhotos(true)

    try {
      const response = await fetch(
        '/api/manager/checklists/photos',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checklistId,
          }),
        }
      )
      const result = (await response.json()) as {
        urls?: unknown
        error?: string
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Não foi possível carregar as fotos.'
        )
      }

      const urls = Array.isArray(result.urls)
        ? result.urls.filter(
            (url): url is string =>
              typeof url === 'string'
          )
        : []

      if (urls.length === 0) {
        showToast(
          'Nenhuma foto disponível para este checklist.',
          'error'
        )
        return
      }

      setSelectedPhotos(urls)
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as fotos.',
        'error'
      )
    } finally {
      setLoadingPhotos(false)
    }
  }

  function getRecordedMileage(
    observation: string | null
  ) {
    if (!observation) {
      return null
    }

    const match =
      observation.match(
        /KM(?: Atual)?(?: registrado)?:\s*([\d.,]+)/i
      )

    return match
      ? match[1]
      : null
  }

  function getState(
    branchData: BranchData | null
  ): StateData | null {
    if (!branchData?.states) {
      return null
    }

    if (
      Array.isArray(
        branchData.states
      )
    ) {
      return (
        branchData.states[0] ??
        null
      )
    }

    return branchData.states
  }

  // =====================================================
  // CARREGAR CHECKLISTS
  // =====================================================

  async function fetchChecklists() {
    setLoading(true)

    try {
      // ===============================================
      // 1. USUÁRIO LOGADO
      // ===============================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        showToast(
          'Usuário não autenticado.',
          'error'
        )

        return
      }

      // ===============================================
      // 2. PERFIL DO GESTOR
      // ===============================================

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
        .eq(
          'id',
          user.id
        )
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

      if (
        !managerProfile.active
      ) {
        throw new Error(
          'Seu usuário está inativo.'
        )
      }

      if (
        managerProfile.role !==
        'branch_manager'
      ) {
        throw new Error(
          'Esta página está disponível apenas para gestores de base.'
        )
      }

      if (
        !managerProfile.branch_id
      ) {
        throw new Error(
          'O gestor ainda não está vinculado a uma base.'
        )
      }

      const branchId =
        managerProfile.branch_id

      // ===============================================
      // 3. BASE DO GESTOR
      // ===============================================

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
        .eq(
          'id',
          branchId
        )
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

      // ===============================================
      // 4. CHECKLISTS DA BASE DO GESTOR
      // ===============================================

      const {
        data,
        error,
      } = await supabase
        .from(
          'driver_checklists'
        )
        .select('*')
        .eq(
          'branch_id',
          branchId
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(
          'Erro detalhado do Supabase:',
          error
        )

        showToast(
          `Erro ao buscar checklists: ${error.message}`,
          'error'
        )

        return
      }

      // ===============================================
      // 5. ÚLTIMO CHECKLIST POR VEÍCULO
      // ===============================================

      const latestByPlateMap: Record<
        string,
        Checklist
      > = {}

      const checklistData =
        (data ?? []) as Checklist[]

      for (
        const current of checklistData
      ) {
        const plate =
          current.vehicle_plate
            ?.trim()
            .toUpperCase() ||
          current.id

        if (
          !latestByPlateMap[plate]
        ) {
          latestByPlateMap[plate] =
            current
        }
      }

      const latestByPlate: Checklist[] =
        Object.values(
          latestByPlateMap
        )

      // ===============================================
      // 6. CHECKLISTS COM AVARIA PRIMEIRO
      // ===============================================

      latestByPlate.sort(
        (
          a: Checklist,
          b: Checklist
        ) => {
          if (
            a.has_issue ===
            b.has_issue
          ) {
            return (
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
            )
          }

          return a.has_issue
            ? -1
            : 1
        }
      )

      setChecklists(
        latestByPlate
      )
    } catch (
      err: unknown
    ) {
      console.error(
        'Erro inesperado ao carregar checklists:',
        err
      )

      const message =
        err instanceof Error
          ? err.message
          : 'Erro inesperado'

      showToast(
        `Erro ao carregar checklists: ${message}`,
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // CARREGAMENTO INICIAL
  // =====================================================

  useEffect(() => {
    void fetchChecklists()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // =====================================================
  // FILTROS
  // =====================================================

  const filteredChecklists =
    checklists.filter(
      (item) => {
        const query =
          search
            .trim()
            .toLowerCase()

        const matchesSearch =
          (
            item.vehicle_plate ||
            ''
          )
            .toLowerCase()
            .includes(
              query
            ) ||
          (
            item.driver ||
            ''
          )
            .toLowerCase()
            .includes(
              query
            ) ||
          (
            item.vehicle_model ||
            ''
          )
            .toLowerCase()
            .includes(
              query
            )

        if (
          filterIssues
        ) {
          const checklistItems =
            getChecklistItems(
              item.items
            )

          const hasItemWithIssue =
            checklistItems.some(
              (check) =>
                !check.ok
            )

          return (
            matchesSearch &&
            (
              item.has_issue ||
              hasItemWithIssue
            )
          )
        }

        return matchesSearch
      }
    )

  const state =
    getState(branch)

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  const totalChecklists =
    checklists.length

  const withIssues =
    checklists.filter(
      (item) => {
        const items =
          getChecklistItems(
            item.items
          )

        return (
          item.has_issue ||
          items.some(
            (check) =>
              !check.ok
          )
        )
      }
    ).length

  const withoutIssues =
    totalChecklists -
    withIssues

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="min-h-screen bg-zinc-950 p-4 text-white md:p-8"
      aria-busy={loadingPhotos}
    >

      {/* TOAST */}

      {toast && (
        <Toast
          message={
            toast.message
          }
          type={
            toast.type
          }
          onClose={() =>
            setToast(null)
          }
        />
      )}

      {/* MODAL FOTOS */}

      {selectedPhotos && (
        <ChecklistPhotosModal
          selectedPhotos={selectedPhotos}
          onClose={() => setSelectedPhotos(null)}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-6">

        {/* CABEÇALHO */}

        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:flex-row md:items-center">

          <div className="flex items-start gap-3">

            <Link
              href="/manager"
              className="rounded-xl bg-zinc-800 p-2 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
              aria-label="Voltar ao painel do gestor"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>

              <p className="text-xs font-semibold text-blue-400">
                Gestão da base
              </p>

              <h1 className="mt-1 flex items-center gap-2 text-xl font-bold">

                <ClipboardList className="h-6 w-6 text-blue-500" />

                Inspeções e Checklists

              </h1>

              <p className="mt-1 text-xs text-zinc-400">
                Acompanhamento de rotina e relatórios pré-viagem da sua unidade
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void fetchChecklists()
            }
            disabled={
              loading
            }
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-2.5 text-xs text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
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

        </div>

        {/* BASE */}

        {branch && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Base responsável
                </p>

                <p className="mt-1 font-bold text-white">
                  {branch.name}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {branch.city}

                  {state?.uf
                    ? ` - ${state.uf}`
                    : ''}

                  {' • '}

                  Código{' '}
                  {branch.code}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* ESTATÍSTICAS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <StatCard
            label="Checklists"
            value={
              totalChecklists
            }
          />

          <StatCard
            label="Sem ocorrência"
            value={
              withoutIssues
            }
            success
          />

          <StatCard
            label="Com ocorrência"
            value={
              withIssues
            }
            warning
          />

        </div>

        {/* FILTROS */}

        <div className="flex flex-col items-center gap-3 sm:flex-row">

          <div className="relative w-full flex-1">

            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="text"
              placeholder="Buscar por placa, motorista ou veículo..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />

          </div>

          <button
            type="button"
            onClick={() =>
              setFilterIssues(
                !filterIssues
              )
            }
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition sm:w-auto ${
              filterIssues
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />

            Apenas com Avarias
          </button>

        </div>

        {/* CONTEÚDO */}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">

            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />

            <span>
              Carregando histórico...
            </span>

          </div>
        ) : filteredChecklists.length ===
          0 ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 py-16 text-center">

            <ClipboardList className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-4 text-sm font-medium text-zinc-400">
              Nenhum checklist encontrado para esta base.
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

            {filteredChecklists.map(
              (item) => {
                const checklistItems =
                  getChecklistItems(
                    item.items
                  )

                const checklistPhotos =
                  getChecklistPhotos(
                    item.photos
                  )

                const itensNaoOk =
                  checklistItems
                    .filter(
                      (check) =>
                        !check.ok
                    )
                    .map(
                      (check) =>
                        check.name
                    )

                const hasPendingMaintenance =
                  itensNaoOk.length >
                    0 ||
                  item.has_issue

                return (
                  <ManagerChecklistCard
                    key={item.id}
                    item={item}
                    checklistItems={checklistItems}
                    checklistPhotos={checklistPhotos}
                    itensNaoOk={itensNaoOk}
                    hasPendingMaintenance={hasPendingMaintenance}
                    recordedMileage={getRecordedMileage(item.observation)}
                    onViewPhotos={() =>
                      void viewChecklistPhotos(item.id)
                    }
                  />
                )
              }
            )}

          </div>
        )}

      </div>

    </div>
  )
}

// =====================================================
// CARD DE ESTATÍSTICA
// =====================================================

function StatCard({
  label,
  value,
  success = false,
  warning = false,
}: {
  label: string
  value: number
  success?: boolean
  warning?: boolean
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          warning
            ? 'text-amber-400'
            : success
              ? 'text-emerald-400'
              : 'text-white'
        }`}
      >
        {value}
      </p>

    </div>
  )
}
