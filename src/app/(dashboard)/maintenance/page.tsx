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
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'

import { MaintenanceRecordCard } from '@/components/maintenance/MaintenanceRecordCard'
import { MaintenanceSummary } from '@/components/maintenance/MaintenanceSummary'
import type { MaintenanceRecord, MaintenanceView } from '@/components/maintenance/types'

import { AppShell } from '@/components/layout/AppShell'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  Toast,
  type ToastType,
} from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

type Vehicle = {
  id: string
  plate: string
  model: string | null
  status: string | null
  mileage: number | null
  current_branch_id: string | null
  issues: string | null
  created_at: string | null
  updated_at: string | null
}

// =====================================================
// PÁGINA
// =====================================================

export default function ManagerMaintenancePage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [records, setRecords] =
    useState<MaintenanceView[]>([])

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState('')

  const [resolvingId, setResolvingId] =
    useState<string | null>(null)

  const [startingId, setStartingId] =
    useState<string | null>(null)

  const [
    confirmResolve,
    setConfirmResolve,
  ] = useState<MaintenanceView | null>(
    null
  )

  const [branchName, setBranchName] =
    useState('Minha base')

  const [isGlobalView, setIsGlobalView] =
    useState(false)

  const [toast, setToast] =
    useState<{
      message: string
      type: ToastType
    } | null>(null)

  // =====================================================
  // TOAST
  // =====================================================

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'success'
    ) => {
      setToast({
        message,
        type,
      })
    },
    []
  )

  // =====================================================
  // CARREGAR MANUTENÇÕES
  // =====================================================

  const fetchMaintenance =
    useCallback(async () => {
      setLoading(true)

      try {
        // ================================================
        // 1. USUÁRIO AUTENTICADO
        // ================================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          showToast(
            'Usuário não autenticado.',
            'error'
          )

          setRecords([])

          return
        }

        // ================================================
        // 2. PERFIL
        // ================================================

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            `
            branch_id,
            role,
            active
          `
          )
          .eq('id', user.id)
          .maybeSingle()

        if (
          profileError ||
          !profile
        ) {
          showToast(
            'Não foi possível carregar o perfil do usuário.',
            'error'
          )

          setRecords([])

          return
        }

        if (
          profile.active === false
        ) {
          showToast(
            'Este usuário está desativado.',
            'error'
          )

          setRecords([])

          return
        }

        const isGlobalManager =
          profile.role === 'admin' ||
          profile.role ===
            'fleet_manager'

        const isBranchManager =
          profile.role ===
          'branch_manager'

        if (
          !isGlobalManager &&
          !isBranchManager
        ) {
          showToast(
            'Você não tem permissão para acessar as manutenções.',
            'error'
          )

          setRecords([])

          return
        }

        if (
          isBranchManager &&
          !profile.branch_id
        ) {
          showToast(
            'O gestor não está vinculado a uma base.',
            'error'
          )

          setRecords([])

          return
        }

        const branchId =
          profile.branch_id

        // ================================================
        // 3. NOME DA BASE / VISÃO GLOBAL
        // ================================================

        if (isGlobalManager) {
          setBranchName(
            'Visão global'
          )

          setIsGlobalView(true)
        } else if (branchId) {
          setIsGlobalView(false)

          const {
            data: branch,
          } = await supabase
            .from('branches')
            .select('name')
            .eq('id', branchId)
            .maybeSingle()

          if (branch?.name) {
            setBranchName(
              branch.name
            )
          }
        }

        // ================================================
        // 4. MANUTENÇÕES ABERTAS
        // ================================================

        let maintenanceQuery =
          supabase
            .from(
              'maintenance_records'
            )
            .select(
              `
              id,
              vehicle_id,
              vehicle_plate,
              branch_id,
              opened_by,
              mechanic_name,
              service_description,
              maintenance_type,
              mileage,
              status,
              notes,
              workshop,
              started_at,
              completed_at,
              created_at
            `
            )
            .or(
              'status.eq.pending,status.eq.in_progress'
            )
            .order(
              'started_at',
              {
                ascending: false,
              }
            )

        // ================================================
        // 5. VEÍCULOS EM MANUTENÇÃO
        // ================================================

        let maintenanceVehiclesQuery =
          supabase
            .from('vehicles')
            .select(
              `
              id,
              plate,
              model,
              status,
              mileage,
              current_branch_id,
              issues,
              created_at,
              updated_at
            `
            )
            .eq(
              'status',
              'Manutenção'
            )

        // ================================================
        // 6. FILTRAR BASE PARA GESTOR
        // ================================================

        if (
          !isGlobalManager &&
          branchId
        ) {
          maintenanceQuery =
            maintenanceQuery.eq(
              'branch_id',
              branchId
            )

          maintenanceVehiclesQuery =
            maintenanceVehiclesQuery.eq(
              'current_branch_id',
              branchId
            )
        }

        // ================================================
        // 7. EXECUTAR CONSULTAS
        // ================================================

        const [
          maintenanceResponse,
          maintenanceVehiclesResponse,
        ] = await Promise.all([
          maintenanceQuery,
          maintenanceVehiclesQuery,
        ])

        if (
          maintenanceResponse.error
        ) {
          console.error(
            'Erro ao buscar manutenções:',
            maintenanceResponse.error
          )

          showToast(
            `Erro ao buscar manutenções: ${maintenanceResponse.error.message}`,
            'error'
          )

          setRecords([])

          return
        }

        if (
          maintenanceVehiclesResponse.error
        ) {
          console.error(
            'Erro ao buscar veículos em manutenção:',
            maintenanceVehiclesResponse.error
          )

          showToast(
            `Erro ao buscar veículos em manutenção: ${maintenanceVehiclesResponse.error.message}`,
            'error'
          )

          setRecords([])

          return
        }

        const maintenance =
          (
            maintenanceResponse.data ??
            []
          ) as MaintenanceRecord[]

        const maintenanceVehicles =
          (
            maintenanceVehiclesResponse.data ??
            []
          ) as Vehicle[]

        // ================================================
        // 8. BUSCAR VEÍCULOS QUE ESTÃO NOS REGISTROS
        // ================================================

        const alreadyLoadedVehicleIds =
          new Set(
            maintenanceVehicles.map(
              (vehicle) =>
                vehicle.id
            )
          )

        const missingVehicleIds =
          Array.from(
            new Set(
              maintenance
                .map(
                  (item) =>
                    item.vehicle_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
                .filter(
                  (id) =>
                    !alreadyLoadedVehicleIds.has(
                      id
                    )
                )
            )
          )

        let extraVehicles: Vehicle[] =
          []

        if (
          missingVehicleIds.length >
          0
        ) {
          let extraVehicleQuery =
            supabase
              .from('vehicles')
              .select(
                `
                id,
                plate,
                model,
                status,
                mileage,
                current_branch_id,
                issues,
                created_at,
                updated_at
              `
              )
              .in(
                'id',
                missingVehicleIds
              )

          if (
            !isGlobalManager &&
            branchId
          ) {
            extraVehicleQuery =
              extraVehicleQuery.eq(
                'current_branch_id',
                branchId
              )
          }

          const {
            data:
              extraVehicleData,
            error:
              extraVehicleError,
          } =
            await extraVehicleQuery

          if (
            extraVehicleError
          ) {
            console.error(
              'Erro ao buscar veículos vinculados às manutenções:',
              extraVehicleError
            )
          } else {
            extraVehicles =
              (
                extraVehicleData ??
                []
              ) as Vehicle[]
          }
        }

        // ================================================
        // 9. MAPA DOS VEÍCULOS
        // ================================================

        const vehicles = [
          ...maintenanceVehicles,
          ...extraVehicles,
        ]

        const vehiclesById =
          new Map(
            vehicles.map(
              (vehicle) => [
                vehicle.id,
                vehicle,
              ]
            )
          )

        // ================================================
        // 10. NORMALIZAR REGISTROS REAIS
        // ================================================

        const normalized:
          MaintenanceView[] =
          maintenance.map(
            (record) => {
              const vehicle =
                record.vehicle_id
                  ? vehiclesById.get(
                      record.vehicle_id
                    )
                  : undefined

              return {
                ...record,

                vehicle_model:
                  vehicle?.model ??
                  null,

                vehicle_status:
                  vehicle?.status ??
                  null,

                virtual: false,
              }
            }
          )

        // ================================================
        // 11. VEÍCULOS SEM maintenance_records
        // ================================================

        const vehiclesWithOpenRecord =
          new Set(
            maintenance
              .map(
                (record) =>
                  record.vehicle_id
              )
              .filter(
                (
                  id
                ): id is string =>
                  Boolean(id)
              )
          )

        const virtualRecords:
          MaintenanceView[] =
          maintenanceVehicles
            .filter(
              (vehicle) =>
                !vehiclesWithOpenRecord.has(
                  vehicle.id
                )
            )
            .map(
              (vehicle) => {
                const startedAt =
                  vehicle.updated_at ??
                  vehicle.created_at ??
                  new Date().toISOString()

                return {
                  id:
                    `vehicle:${vehicle.id}`,

                  vehicle_id:
                    vehicle.id,

                  vehicle_plate:
                    vehicle.plate,

                  branch_id:
                    vehicle.current_branch_id,

                  opened_by: null,

                  mechanic_name:
                    'Não informado',

                  service_description:
                    vehicle.issues ??
                    'Veículo marcado como em manutenção.',

                  maintenance_type:
                    'Ocorrência operacional',

                  mileage:
                    vehicle.mileage,

                  status:
                    'pending',

                  notes:
                    vehicle.issues,

                  workshop: null,

                  started_at:
                    startedAt,

                  completed_at:
                    null,

                  created_at:
                    vehicle.created_at,

                  vehicle_model:
                    vehicle.model,

                  vehicle_status:
                    vehicle.status,

                  virtual: true,
                }
              }
            )

        // ================================================
        // 12. JUNTAR E ORDENAR
        // ================================================

        const allRecords = [
          ...normalized,
          ...virtualRecords,
        ].sort(
          (a, b) =>
            new Date(
              b.started_at
            ).getTime() -
            new Date(
              a.started_at
            ).getTime()
        )

        setRecords(allRecords)
      } catch (error) {
        console.error(
          'Erro inesperado ao carregar manutenções:',
          error
        )

        showToast(
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao carregar manutenções.',
          'error'
        )

        setRecords([])
      } finally {
        setLoading(false)
      }
    }, [
      showToast,
      supabase,
    ])

  // =====================================================
  // CARREGAR AO ABRIR
  // =====================================================

  useEffect(() => {
    void fetchMaintenance()
  }, [fetchMaintenance])

  // =====================================================
  // CONCLUIR E LIBERAR VEÍCULO
  // =====================================================

  async function transitionMaintenance(
    record: MaintenanceView,
    action:
      | 'start'
      | 'complete_and_release'
  ) {
    if (record.virtual) {
      showToast(
        'Este veículo está em manutenção sem registro vinculado. Regularize um maintenance_record antes de liberar.',
        'error'
      )

      return
    }

    if (action === 'start') {
      setStartingId(record.id)
    } else {
      setResolvingId(record.id)
    }

    try {
      const response =
        await fetch(
          `/api/maintenance/${record.id}/transition`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              action,
            }),
          }
        )

      const result =
        (await response.json()) as {
          success?: boolean
          message?: string
          error?: string
        }

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Não foi possível alterar a manutenção.'
        )
      }

      showToast(
        result.message ??
          'Manutenção atualizada com sucesso.',
        'success'
      )

      if (action === 'start') {
        setRecords(
          (current) =>
            current.map(
              (item) =>
                item.id === record.id
                  ? {
                      ...item,
                      status:
                        'in_progress',
                    }
                  : item
            )
        )

        return
      }

      setRecords(
        (current) =>
          current.filter(
            (item) =>
              item.id !== record.id
          )
      )

      return
    } catch (error) {
      console.error(
        'Erro ao alterar manutenção:',
        error
      )

      showToast(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar a manutenção.',
        'error'
      )
    } finally {
      setResolvingId(null)
      setStartingId(null)
      setConfirmResolve(null)
    }
  }

  // =====================================================
  // FILTRO
  // =====================================================

  const filteredRecords =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase()

      if (!term) {
        return records
      }

      return records.filter(
        (item) => {
          return [
            item.vehicle_plate,
            item.vehicle_model,
            item.service_description,
            item.maintenance_type,
            item.mechanic_name,
            item.notes,
            item.workshop,
          ].some(
            (value) =>
              (
                value ?? ''
              )
                .toLowerCase()
                .includes(term)
          )
        }
      )
    }, [
      records,
      search,
    ])

  // =====================================================
  // INDICADORES
  // =====================================================

  const pendingCount =
    records.filter(
      (item) =>
        item.status ===
        'pending'
    ).length

  const inProgressCount =
    records.filter(
      (item) =>
        item.status ===
        'in_progress'
    ).length

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      {/* =================================================
          TOAST
      ================================================= */}

      {toast && (
        <Toast
          message={
            toast.message
          }
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
        />
      )}

      {/* =================================================
          MODAL DE CONFIRMAÇÃO
      ================================================= */}

      {confirmResolve && (
        <ConfirmModal
          isOpen
          title="Concluir e liberar veículo"
          message={`Deseja concluir a manutenção do veículo ${confirmResolve.vehicle_plate}? Se não existir outra manutenção pendente, o veículo voltará automaticamente para ATIVO e ficará disponível para operação.`}
          isLoading={
            resolvingId ===
            confirmResolve.id
          }
          confirmText="Concluir e liberar"
          cancelText="Cancelar"
          onConfirm={() =>
            void transitionMaintenance(
              confirmResolve,
              'complete_and_release'
            )
          }
          onCancel={() =>
            setConfirmResolve(
              null
            )
          }
        />
      )}

      <div className="space-y-6 sm:space-y-8">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <Link
              href={
                isGlobalView
                  ? '/admin'
                  : '/manager'
              }
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>

              <p className="text-sm font-medium text-amber-400">
                {branchName}
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Manutenções Pendentes
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">

                {isGlobalView
                  ? 'Acompanhe as manutenções de todas as bases da frota.'
                  : 'Acompanhe somente os veículos e manutenções pertencentes à sua base.'}

              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void fetchMaintenance()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* =================================================
            INDICADORES
        ================================================= */}

        <MaintenanceSummary
          recordCount={records.length}
          pendingCount={pendingCount}
          inProgressCount={inProgressCount}
        />

        {/* =================================================
            INFORMAÇÃO
        ================================================= */}

        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

          <div className="flex items-start gap-3">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

            <div>

              <p className="text-sm font-semibold text-emerald-400">
                Liberação do veículo
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Ao concluir uma manutenção, o sistema verifica se existe outra manutenção pendente. Se não existir, o veículo volta automaticamente para o status Ativo.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            BUSCA
        ================================================= */}

        <section className="relative">

          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            type="text"
            placeholder="Buscar placa, modelo, serviço, oficina ou observação..."
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />

        </section>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        {loading ? (

          <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-zinc-500">

            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />

            <span className="text-sm">
              Carregando manutenções...
            </span>

          </div>

        ) : filteredRecords.length ===
          0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">

            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />

            <p className="mt-4 text-sm font-semibold text-zinc-200">
              Nenhuma manutenção pendente
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Não há manutenção aberta para os veículos.
            </p>

          </div>

        ) : (

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">

            {filteredRecords.map(
              (item) => {

                const isInProgress =
                  item.status ===
                  'in_progress'

                const isResolving =
                  resolvingId ===
                  item.id

                const isStarting =
                  startingId ===
                  item.id

                return (
                  <MaintenanceRecordCard
                    key={item.id}
                    item={item}
                    isInProgress={isInProgress}
                    isResolving={isResolving}
                    isStarting={isStarting}
                    onConfirmResolve={() => setConfirmResolve(item)}
                    onStart={() => void transitionMaintenance(item, 'start')}
                  />
                )
              }
            )}

          </section>

        )}

      </div>
    </AppShell>
  )
}
