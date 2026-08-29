'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Toast, type ToastType } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

type MaintenanceStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

type MaintenanceRecord = {
  id: string
  vehicle_id: string | null
  vehicle_plate: string
  branch_id: string | null
  opened_by: string | null
  mechanic_name: string
  service_description: string
  maintenance_type: string | null
  mileage: number | null
  status: MaintenanceStatus | null
  notes: string | null
  workshop: string | null
  started_at: string
  completed_at: string | null
  created_at: string | null
}

type Vehicle = {
  id: string
  plate: string
  model: string | null
  status: string | null
  mileage: number | null
  current_branch_id: string | null
}

type MaintenanceView = MaintenanceRecord & {
  vehicle_model: string | null
  vehicle_status: string | null
}

export default function ManagerMaintenancePage() {
  const supabase = useMemo(() => createClient(), [])

  const [records, setRecords] = useState<MaintenanceView[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [confirmResolve, setConfirmResolve] = useState<MaintenanceView | null>(null)
  const [branchName, setBranchName] = useState('Minha base')

  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      setToast({ message, type })
    },
    []
  )

  const fetchMaintenance = useCallback(async () => {
    setLoading(true)

    try {
      // =====================================================
      // 1. USUÁRIO AUTENTICADO
      // =====================================================
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        showToast('Usuário não autenticado.', 'error')
        return
      }

      // =====================================================
      // 2. PERFIL E BASE DO GESTOR
      // =====================================================
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('branch_id, role, active')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError || !profile) {
        showToast('Não foi possível carregar o perfil do gestor.', 'error')
        return
      }

      if (profile.active === false) {
        showToast('Este usuário está desativado.', 'error')
        return
      }

      if (!profile.branch_id) {
        showToast('O gestor não está vinculado a uma base.', 'error')
        setRecords([])
        return
      }

      const branchId = profile.branch_id

      const {
        data: branch,
      } = await supabase
        .from('branches')
        .select('name')
        .eq('id', branchId)
        .maybeSingle()

      if (branch?.name) {
        setBranchName(branch.name)
      }

      // =====================================================
      // 3. MANUTENÇÕES SOMENTE DA BASE DO GESTOR
      // =====================================================
      // O completed_at.is.null também cobre registros antigos
      // que foram gravados com status='completed' por causa do
      // default antigo do banco, mas ainda não foram concluídos.
      const {
        data: maintenanceData,
        error: maintenanceError,
      } = await supabase
        .from('maintenance_records')
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
        .eq('branch_id', branchId)
        .or('status.eq.pending,status.eq.in_progress,completed_at.is.null')
        .order('started_at', { ascending: false })

      if (maintenanceError) {
        console.error(
          'Erro ao buscar manutenções:',
          maintenanceError
        )
        showToast(
          `Erro ao buscar manutenções: ${maintenanceError.message}`,
          'error'
        )
        return
      }

      const maintenance = (maintenanceData ?? []) as MaintenanceRecord[]

      if (maintenance.length === 0) {
        setRecords([])
        return
      }

      // =====================================================
      // 4. BUSCAR DADOS DOS VEÍCULOS DA MESMA BASE
      // =====================================================
      const vehicleIds = Array.from(
        new Set(
          maintenance
            .map((item) => item.vehicle_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      let vehicles: Vehicle[] = []

      if (vehicleIds.length > 0) {
        const {
          data: vehicleData,
          error: vehicleError,
        } = await supabase
          .from('vehicles')
          .select(
            'id, plate, model, status, mileage, current_branch_id'
          )
          .eq('current_branch_id', branchId)
          .in('id', vehicleIds)

        if (vehicleError) {
          console.error(
            'Erro ao buscar veículos das manutenções:',
            vehicleError
          )
        } else {
          vehicles = (vehicleData ?? []) as Vehicle[]
        }
      }

      const vehiclesById = new Map(
        vehicles.map((vehicle) => [vehicle.id, vehicle])
      )

      const normalized: MaintenanceView[] = maintenance.map(
        (record) => {
          const vehicle = record.vehicle_id
            ? vehiclesById.get(record.vehicle_id)
            : undefined

          return {
            ...record,
            vehicle_model: vehicle?.model ?? null,
            vehicle_status: vehicle?.status ?? null,
          }
        }
      )

      setRecords(normalized)
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
    } finally {
      setLoading(false)
    }
  }, [showToast, supabase])

  useEffect(() => {
    void fetchMaintenance()
  }, [fetchMaintenance])

  async function resolveMaintenance(record: MaintenanceView) {
    setResolvingId(record.id)

    try {
      const now = new Date().toISOString()

      // =====================================================
      // 1. CONCLUIR O REGISTRO REAL DE MANUTENÇÃO
      // =====================================================
      const {
        error: maintenanceError,
      } = await supabase
        .from('maintenance_records')
        .update({
          status: 'completed',
          completed_at: now,
          updated_at: now,
        })
        .eq('id', record.id)

      if (maintenanceError) {
        throw maintenanceError
      }

      // =====================================================
      // 2. VERIFICAR SE O VEÍCULO AINDA TEM OUTRA PENDÊNCIA
      // =====================================================
      if (record.vehicle_id) {
        const {
          data: otherPending,
          error: otherPendingError,
        } = await supabase
          .from('maintenance_records')
          .select('id')
          .eq('vehicle_id', record.vehicle_id)
          .neq('id', record.id)
          .or('status.eq.pending,status.eq.in_progress,completed_at.is.null')
          .limit(1)

        if (otherPendingError) {
          throw otherPendingError
        }

        // Só libera o veículo quando não existir outra
        // manutenção pendente/em andamento.
        if (!otherPending || otherPending.length === 0) {
          const {
            error: vehicleError,
          } = await supabase
            .from('vehicles')
            .update({
              status: 'Ativo',
              issues: null,
              updated_at: now,
            })
            .eq('id', record.vehicle_id)

          if (vehicleError) {
            throw vehicleError
          }
        }
      }

      showToast(
        'Manutenção concluída com sucesso.',
        'success'
      )

      setRecords((current) =>
        current.filter((item) => item.id !== record.id)
      )
    } catch (error) {
      console.error(
        'Erro ao concluir manutenção:',
        error
      )

      showToast(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a manutenção.',
        'error'
      )
    } finally {
      setResolvingId(null)
      setConfirmResolve(null)
    }
  }

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return records

    return records.filter((item) => {
      return [
        item.vehicle_plate,
        item.vehicle_model,
        item.service_description,
        item.maintenance_type,
        item.mechanic_name,
        item.notes,
      ].some((value) =>
        (value ?? '')
          .toLowerCase()
          .includes(term)
      )
    })
  }, [records, search])

  const pendingCount = records.filter(
    (item) => item.status !== 'in_progress'
  ).length

  const inProgressCount = records.filter(
    (item) => item.status === 'in_progress'
  ).length

  return (
    <AppShell>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmResolve && (
        <ConfirmModal
          isOpen
          title="Concluir manutenção"
          message={`Deseja concluir a manutenção do veículo ${confirmResolve.vehicle_plate}? O veículo só será liberado se não existir outra manutenção pendente.`}
          isLoading={resolvingId === confirmResolve.id}
          confirmText="Concluir"
          cancelText="Cancelar"
          onConfirm={() =>
            void resolveMaintenance(confirmResolve)
          }
          onCancel={() => setConfirmResolve(null)}
        />
      )}

      <div className="space-y-6 sm:space-y-8">
        {/* CABEÇALHO */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/manager"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              aria-label="Voltar ao painel do gestor"
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
                Acompanhe somente os veículos e manutenções pertencentes à sua base.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchMaintenance()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            Atualizar
          </button>
        </section>

        {/* INDICADORES */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total aberto"
            value={records.length}
            icon={Wrench}
          />

          <SummaryCard
            label="Pendentes"
            value={pendingCount}
            icon={AlertTriangle}
          />

          <SummaryCard
            label="Em andamento"
            value={inProgressCount}
            icon={Clock3}
          />
        </section>

        {/* BUSCA */}
        <section className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            type="text"
            placeholder="Buscar por placa, modelo, serviço ou observação..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-500"
          />
        </section>

        {/* CONTEÚDO */}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span className="text-sm">
              Carregando manutenções da base...
            </span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />

            <p className="mt-4 text-sm font-semibold text-zinc-200">
              Nenhuma manutenção pendente
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Não há manutenção aberta para os veículos desta base.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredRecords.map((item) => {
              const isInProgress =
                item.status === 'in_progress'

              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-2xl border border-amber-500/25 bg-zinc-900/70 p-5 transition hover:border-amber-500/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                        {item.vehicle_plate}
                      </span>

                      <h2 className="mt-3 text-base font-semibold text-white">
                        {item.vehicle_model ?? 'Modelo não informado'}
                      </h2>
                    </div>

                    <span
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                        isInProgress
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-amber-500/10 text-amber-400',
                      ].join(' ')}
                    >
                      {isInProgress ? (
                        <Clock3 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}

                      {isInProgress
                        ? 'Em andamento'
                        : 'Pendente'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <InfoRow
                      icon={Wrench}
                      label="Serviço"
                      value={item.service_description}
                    />

                    <InfoRow
                      icon={Gauge}
                      label="KM"
                      value={
                        item.mileage != null
                          ? `${item.mileage.toLocaleString('pt-BR')} km`
                          : 'Não informado'
                      }
                    />

                    <InfoRow
                      icon={CalendarDays}
                      label="Aberta em"
                      value={formatDate(item.started_at)}
                    />

                    <InfoRow
                      icon={Car}
                      label="Tipo"
                      value={
                        item.maintenance_type ??
                        'Não informado'
                      }
                    />
                  </div>

                  {item.notes && (
                    <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                        Observação
                      </p>

                      <p className="mt-2 text-xs leading-5 text-zinc-400">
                        {item.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-5">
                    <button
                      type="button"
                      onClick={() => setConfirmResolve(item)}
                      disabled={resolvingId === item.id}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resolvingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      Concluir manutenção
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </AppShell>
  )
}

type IconType = React.ComponentType<{
  className?: string
}>

function SummaryCard({
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

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm text-zinc-300">
          {value}
        </p>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}