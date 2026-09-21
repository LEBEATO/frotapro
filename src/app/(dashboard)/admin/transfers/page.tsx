'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowRightLeft,
  Car,
  History,
  RefreshCw,
  UserRound,
} from 'lucide-react'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { Toast, type ToastType } from '@/components/Toast'
import { AppShell } from '@/components/layout/AppShell'

type EntityType = 'driver' | 'vehicle'

type Branch = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
}

type Driver = {
  id: string
  full_name: string
  branch_id: string | null
}

type Vehicle = {
  id: string
  model: string
  plate: string
  current_branch_id: string | null
}

type Transfer = {
  id: string
  entity_type: EntityType
  driver_id: string | null
  vehicle_id: string | null
  from_branch_id: string
  to_branch_id: string
  reason: string
  transferred_by: string
  transferred_at: string
}

type Actor = {
  id: string
  full_name: string
}

type TransferData = {
  branches: Branch[]
  drivers: Driver[]
  vehicles: Vehicle[]
  transfers: Transfer[]
  actors: Actor[]
}

const initialData: TransferData = {
  branches: [],
  drivers: [],
  vehicles: [],
  transfers: [],
  actors: [],
}

export default function AdminTransfersPage() {
  const [data, setData] = useState<TransferData>(initialData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [entityType, setEntityType] = useState<EntityType>('driver')
  const [entityId, setEntityId] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const branchById = useMemo(
    () => new Map(data.branches.map((branch) => [branch.id, branch])),
    [data.branches]
  )
  const driverById = useMemo(
    () => new Map(data.drivers.map((driver) => [driver.id, driver])),
    [data.drivers]
  )
  const vehicleById = useMemo(
    () => new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [data.vehicles]
  )
  const actorById = useMemo(
    () => new Map(data.actors.map((actor) => [actor.id, actor])),
    [data.actors]
  )

  const selectedEntity =
    entityType === 'driver'
      ? driverById.get(entityId)
      : vehicleById.get(entityId)
  const sourceBranchId =
    selectedEntity && 'branch_id' in selectedEntity
      ? selectedEntity.branch_id
      : selectedEntity && 'current_branch_id' in selectedEntity
        ? selectedEntity.current_branch_id
        : null

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/admin/transfers', { cache: 'no-store' })
      const result = (await response.json()) as TransferData & { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? 'Não foi possível carregar os dados.')
      }

      setData(result)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as transferências.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function changeEntityType(value: EntityType) {
    setEntityType(value)
    setEntityId('')
    setTargetBranchId('')
    setReason('')
  }

  function requestTransfer() {
    if (!entityId || !sourceBranchId || !targetBranchId || reason.trim().length < 5) {
      setErrorMessage('Selecione o item, a base de destino e informe o motivo.')
      return
    }

    if (sourceBranchId === targetBranchId) {
      setErrorMessage('A base de destino deve ser diferente da base atual.')
      return
    }

    setErrorMessage('')
    setConfirmOpen(true)
  }

  async function confirmTransfer() {
    if (!sourceBranchId) return

    setSaving(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/admin/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          targetBranchId,
          expectedBranchId: sourceBranchId,
          reason,
        }),
      })
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? 'Não foi possível concluir a transferência.')
      }

      setConfirmOpen(false)
      setEntityId('')
      setTargetBranchId('')
      setReason('')
      setToast({ message: 'Transferência concluída e registrada no histórico.', type: 'success' })
      await loadData()
    } catch (error) {
      setConfirmOpen(false)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a transferência.'
      )
    } finally {
      setSaving(false)
    }
  }

  const entityName =
    entityType === 'driver'
      ? driverById.get(entityId)?.full_name
      : vehicleById.get(entityId)
        ? `${vehicleById.get(entityId)?.plate} — ${vehicleById.get(entityId)?.model}`
        : undefined

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Transferências"
          description="Transfira motoristas e veículos entre bases com encerramento seguro das associações e histórico permanente."
          contextLabel="Gestão nacional"
          backHref="/admin"
          actions={
            <Button icon={RefreshCw} onClick={() => void loadData()} disabled={loading}>
              Atualizar
            </Button>
          }
        />

        {errorMessage && (
          <ErrorState title="Não foi possível continuar" message={errorMessage} />
        )}

        {loading ? (
          <LoadingState message="Carregando transferências..." />
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Nova transferência</h2>
                  <p className="text-sm text-zinc-500">A operação exige confirmação e registra quem realizou a alteração.</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Tipo</span>
                  <select
                    value={entityType}
                    onChange={(event) => changeEntityType(event.target.value as EntityType)}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="driver">Motorista</option>
                    <option value="vehicle">Veículo</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm text-zinc-300">
                  <span>{entityType === 'driver' ? 'Motorista' : 'Veículo'}</span>
                  <select
                    value={entityId}
                    onChange={(event) => {
                      setEntityId(event.target.value)
                      setTargetBranchId('')
                    }}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione</option>
                    {entityType === 'driver'
                      ? data.drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name}
                          </option>
                        ))
                      : data.vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate} — {vehicle.model}
                          </option>
                        ))}
                  </select>
                </label>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Base atual</p>
                  <p className="mt-1 font-medium text-zinc-200">
                    {sourceBranchId
                      ? branchById.get(sourceBranchId)?.name ?? 'Base não localizada'
                      : 'Selecione um motorista ou veículo'}
                  </p>
                </div>

                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Base de destino</span>
                  <select
                    value={targetBranchId}
                    onChange={(event) => setTargetBranchId(event.target.value)}
                    disabled={!sourceBranchId}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Selecione a base</option>
                    {data.branches
                      .filter((branch) => branch.id !== sourceBranchId)
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} — {branch.city}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-zinc-300 lg:col-span-2">
                  <span>Motivo da transferência</span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Informe o motivo operacional da transferência"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-blue-500"
                  />
                  <span className="block text-right text-xs text-zinc-600">{reason.length}/500</span>
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <Button icon={ArrowRightLeft} onClick={requestTransfer} disabled={!entityId || !targetBranchId}>
                  Revisar transferência
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                <h2 className="font-semibold text-white">Histórico recente</h2>
              </div>

              {data.transfers.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nenhuma transferência registrada"
                  description="As movimentações concluídas aparecerão aqui."
                />
              ) : (
                <div className="grid gap-3">
                  {data.transfers.map((transfer) => {
                    const driver = transfer.driver_id
                      ? driverById.get(transfer.driver_id)
                      : null
                    const vehicle = transfer.vehicle_id
                      ? vehicleById.get(transfer.vehicle_id)
                      : null
                    const Icon = transfer.entity_type === 'driver' ? UserRound : Car

                    return (
                      <article key={transfer.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <div className="h-fit rounded-xl bg-zinc-800 p-2.5 text-blue-400">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white">
                                {driver?.full_name ??
                                  (vehicle ? `${vehicle.plate} — ${vehicle.model}` : 'Registro histórico')}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                                <span>{branchById.get(transfer.from_branch_id)?.name ?? 'Base anterior'}</span>
                                <ArrowRight className="h-4 w-4 text-zinc-600" />
                                <span>{branchById.get(transfer.to_branch_id)?.name ?? 'Base de destino'}</span>
                              </div>
                              <p className="mt-2 text-sm text-zinc-500">{transfer.reason}</p>
                            </div>
                          </div>
                          <div className="text-left text-xs text-zinc-500 sm:text-right">
                            <p>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(transfer.transferred_at))}</p>
                            <p className="mt-1">por {actorById.get(transfer.transferred_by)?.full_name ?? 'Gestor autorizado'}</p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirmar transferência"
        message={`Transferir ${entityName ?? 'o item selecionado'} para ${branchById.get(targetBranchId)?.name ?? 'a nova base'}? A associação atual com veículo será encerrada, quando existir.`}
        confirmText="Confirmar transferência"
        isLoading={saving}
        onConfirm={() => void confirmTransfer()}
        onCancel={() => setConfirmOpen(false)}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AppShell>
  )
}
