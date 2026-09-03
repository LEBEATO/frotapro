'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { createClient } from '@/lib/supabase/client'
import { Toast, ToastType } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'

import {
  ClipboardList,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Car,
  Image as ImageIcon,
  X,
  Loader2,
  RefreshCw,
  Mail,
  Wrench,
  ArrowLeft,
  Trash2,
  Building2,
} from 'lucide-react'

// =====================================================
// TIPOS
// =====================================================

interface ChecklistItem {
  name: string
  value?: 'SIM' | 'NÃO'
  ok: boolean
}

interface Checklist {
  id: string
  created_at: string
  driver: string | null
  driver_email: string | null
  vehicle_plate: string | null
  vehicle_model: string | null
  items: ChecklistItem[] | null
  has_issue: boolean
  observation: string | null
  photos: string[] | null
  branch_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
}

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

  const [profile, setProfile] =
    useState<ManagerProfile | null>(null)

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
    sendingMaintenance,
    setSendingMaintenance,
  ] = useState<string | null>(null)

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null)

  const [
    toast,
    setToast,
  ] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  const [
    confirmResolve,
    setConfirmResolve,
  ] = useState<{
    checklistId: string
    vehiclePlate: string | null
  } | null>(null)

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState<string | null>(null)

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

      setProfile(
        managerProfile
      )

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
  // EXCLUIR CHECKLIST
  // =====================================================

  async function handleDeleteChecklist(
    id: string
  ) {
    setDeletingId(id)

    try {
      if (!profile?.branch_id) {
        throw new Error(
          'Base do gestor não identificada.'
        )
      }

      const {
        error,
      } = await supabase
        .from(
          'driver_checklists'
        )
        .delete()
        .eq(
          'id',
          id
        )
        .eq(
          'branch_id',
          profile.branch_id
        )

      if (error) {
        throw error
      }

      showToast(
        'Checklist excluído com sucesso!',
        'success'
      )

      setChecklists(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== id
          )
      )
    } catch (
      err: unknown
    ) {
      console.error(
        'Erro ao excluir:',
        err
      )

      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao excluir'

      showToast(
        `Erro ao excluir checklist: ${message}`,
        'error'
      )
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  // =====================================================
  // RESOLVER MANUTENÇÃO
  // =====================================================

  async function executeResolveMaintenance(
    checklistId: string,
    vehiclePlate: string | null
  ) {
    setSendingMaintenance(
      checklistId
    )

    try {
      if (
        !profile?.branch_id
      ) {
        throw new Error(
          'Base do gestor não identificada.'
        )
      }

      const branchId =
        profile.branch_id

      // ===============================================
      // BUSCAR CHECKLIST
      // ===============================================

      const {
        data: current,
        error: fetchError,
      } = await supabase
        .from(
          'driver_checklists'
        )
        .select('*')
        .eq(
          'id',
          checklistId
        )
        .eq(
          'branch_id',
          branchId
        )
        .maybeSingle()

      if (
        fetchError ||
        !current
      ) {
        throw new Error(
          'Checklist não encontrado.'
        )
      }

      // ===============================================
      // MARCAR ITENS COMO RESOLVIDOS
      // ===============================================

      const updatedItems =
        Array.isArray(
          current.items
        )
          ? current.items.map(
              (
                item: ChecklistItem
              ) => ({
                ...item,

                ok: true,

                value:
                  item.value ===
                  'NÃO'
                    ? 'SIM'
                    : item.value,
              })
            )
          : []

      // ===============================================
      // NOVO CHECKLIST RESOLVIDO
      // ===============================================

      const {
        error: insertError,
      } = await supabase
        .from(
          'driver_checklists'
        )
        .insert({
          id:
            crypto.randomUUID(),

          driver:
            current.driver,

          driver_email:
            current.driver_email,

          vehicle_plate:
            current.vehicle_plate,

          vehicle_model:
            current.vehicle_model,

          items:
            updatedItems,

          has_issue:
            false,

          observation:
            'Manutenção realizada e pendências resolvidas pelo gestor.',

          photos:
            current.photos,

          branch_id:
            branchId,

          vehicle_id:
            current.vehicle_id ??
            null,

          driver_id:
            current.driver_id ??
            null,

          user_id:
            current.user_id ??
            null,

          km_atual:
            current.km_atual ??
            null,
        })

      if (insertError) {
        throw insertError
      }

      // ===============================================
      // ATUALIZAR VEÍCULO
      // ===============================================

      if (vehiclePlate) {
        const {
          error:
            vehicleUpdateError,
        } = await supabase
          .from('vehicles')
          .update({
            status:
              'Ativo',

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'current_branch_id',
            branchId
          )
          .ilike(
            'plate',
            vehiclePlate.trim()
          )

        if (
          vehicleUpdateError
        ) {
          console.error(
            'Checklist resolvido, mas houve erro ao atualizar veículo:',
            vehicleUpdateError
          )
        }
      }

      showToast(
        'Manutenção marcada como resolvida!',
        'success'
      )

      await fetchChecklists()
    } catch (
      err: unknown
    ) {
      console.error(
        'Erro ao resolver:',
        err
      )

      const message =
        err instanceof Error
          ? err.message
          : 'Erro inesperado'

      showToast(
        `Falha ao resolver manutenção: ${message}`,
        'error'
      )
    } finally {
      setSendingMaintenance(
        null
      )

      setConfirmResolve(
        null
      )
    }
  }

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
    <div className="min-h-screen bg-zinc-950 p-4 text-white md:p-8">

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

      {/* MODAL RESOLVER */}

      {confirmResolve && (
        <ConfirmModal
          isOpen={
            !!confirmResolve
          }
          title="Resolver Manutenção"
          message="Deseja marcar todas as avarias deste veículo como resolvidas e atualizar o status para Ativo?"
          isLoading={
            sendingMaintenance ===
            confirmResolve.checklistId
          }
          confirmText="Confirmar"
          cancelText="Cancelar"
          onConfirm={() =>
            executeResolveMaintenance(
              confirmResolve.checklistId,
              confirmResolve.vehiclePlate
            )
          }
          onCancel={() =>
            setConfirmResolve(
              null
            )
          }
        />
      )}

      {/* MODAL EXCLUSÃO */}

      {confirmDelete && (
        <ConfirmModal
          isOpen={
            !!confirmDelete
          }
          title="Excluir Checklist"
          message="Tem certeza que deseja apagar permanentemente este checklist?"
          isLoading={
            deletingId ===
            confirmDelete
          }
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() =>
            handleDeleteChecklist(
              confirmDelete
            )
          }
          onCancel={() =>
            setConfirmDelete(
              null
            )
          }
        />
      )}

      {/* MODAL FOTOS */}

      {selectedPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="relative w-full max-w-3xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">

              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <ImageIcon className="h-4 w-4 text-blue-400" />

                Fotos Anexadas
              </h3>

              <button
                type="button"
                onClick={() =>
                  setSelectedPhotos(
                    null
                  )
                }
                className="rounded-lg bg-zinc-800 p-1 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">

              {selectedPhotos.map(
                (
                  photoUrl,
                  index
                ) => (
                  <div
                    key={
                      `${photoUrl}-${index}`
                    }
                    className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black"
                  >
                    <Image
                      src={
                        photoUrl
                      }
                      alt={`Foto ${
                        index +
                        1
                      }`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )
              )}

            </div>

          </div>

        </div>
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
                  <div
                    key={
                      item.id
                    }
                    className={`flex flex-col justify-between space-y-4 rounded-2xl border bg-zinc-900 p-5 transition hover:border-zinc-700 ${
                      item.has_issue
                        ? 'border-amber-500/30'
                        : 'border-zinc-800'
                    }`}
                  >

                    <div>

                      {/* PLACA / DATA */}

                      <div className="mb-3 flex items-start justify-between gap-3">

                        <span className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-blue-400">
                          {item.vehicle_plate ||
                            'SEM PLACA'}
                        </span>

                        <div className="flex items-center gap-2">

                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">

                            <Calendar className="h-3.5 w-3.5" />

                            {new Date(
                              item.created_at
                            ).toLocaleDateString(
                              'pt-BR',
                              {
                                day:
                                  '2-digit',

                                month:
                                  '2-digit',

                                hour:
                                  '2-digit',

                                minute:
                                  '2-digit',
                              }
                            )}

                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete(
                                item.id
                              )
                            }
                            disabled={
                              deletingId ===
                              item.id
                            }
                            className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
                            title="Excluir checklist"
                          >
                            {deletingId ===
                            item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>

                        </div>

                      </div>

                      {/* MOTORISTA */}

                      <div className="mb-4 space-y-1">

                        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">

                          <User className="h-4 w-4 text-zinc-400" />

                          {item.driver ||
                            'Não informado'}

                        </div>

                        <div className="flex items-center gap-1 text-xs text-zinc-300">

                          <Car className="h-3 w-3 text-zinc-500" />

                          {item.vehicle_model ||
                            'Modelo não informado'}

                        </div>

                        {item.driver_email && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400">

                            <Mail className="h-3 w-3" />

                            {item.driver_email}

                          </div>
                        )}

                      </div>

                      {/* ITENS */}

                      <div className="mb-3 space-y-1.5 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">

                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Itens Checados
                        </div>

                        {checklistItems.length ===
                        0 ? (
                          <p className="text-xs text-zinc-600">
                            Nenhum item registrado.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">

                            {checklistItems.map(
                              (
                                check,
                                index
                              ) => (
                                <span
                                  key={
                                    `${check.name}-${index}`
                                  }
                                  className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${
                                    check.ok
                                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                      : 'border-red-500/20 bg-red-500/10 text-red-400'
                                  }`}
                                >
                                  {check.ok ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}

                                  {check.name}:{' '}

                                  {check.value ||
                                    (check.ok
                                      ? 'SIM'
                                      : 'NÃO')}
                                </span>
                              )
                            )}

                          </div>
                        )}

                      </div>

                      {/* KM */}

                      {getRecordedMileage(
                        item.observation
                      ) && (
                        <div className="mb-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">

                          <span className="font-semibold">
                            KM registrado:
                          </span>{' '}

                          {getRecordedMileage(
                            item.observation
                          )}

                        </div>
                      )}

                      {/* OBSERVAÇÃO */}

                      {item.observation && (
                        <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">

                          <div className="flex items-center gap-1 font-semibold">

                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />

                            Observação do Motorista:

                          </div>

                          <p className="leading-relaxed text-amber-200/80">
                            {item.observation}
                          </p>

                        </div>
                      )}

                      {/* PENDÊNCIAS */}

                      {hasPendingMaintenance && (
                        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">

                          <p className="flex items-start gap-1 text-xs font-medium text-red-400">

                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                            <span>
                              Pendências:{' '}

                              {itensNaoOk.length >
                              0
                                ? itensNaoOk.join(
                                    ', '
                                  )
                                : 'Ocorrência informada pelo motorista'}
                            </span>

                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmResolve(
                                {
                                  checklistId:
                                    item.id,

                                  vehiclePlate:
                                    item.vehicle_plate,
                                }
                              )
                            }
                            disabled={
                              sendingMaintenance ===
                              item.id
                            }
                            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            {sendingMaintenance ===
                            item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wrench className="h-3.5 w-3.5" />
                            )}

                            Resolver Manutenção

                          </button>

                        </div>
                      )}

                    </div>

                    {/* FOTOS */}

                    {checklistPhotos.length >
                      0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPhotos(
                            checklistPhotos
                          )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                      >
                        <ImageIcon className="h-4 w-4 text-blue-400" />

                        Ver{' '}
                        {
                          checklistPhotos.length
                        }{' '}

                        {checklistPhotos.length ===
                        1
                          ? 'Foto Anexada'
                          : 'Fotos Anexadas'}

                      </button>
                    )}

                  </div>
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