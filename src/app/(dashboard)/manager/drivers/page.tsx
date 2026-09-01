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
  Car,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Unlink,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

type ManagerProfile = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type DriverRow = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type VehicleRow = {
  id: string
  model: string
  plate: string
  year: string | null
  status: string | null
  mileage: number | null
  driver_id: string | null
  current_branch_id: string | null
}

type AssignmentRow = {
  id: string
  driver_id: string
  vehicle_id: string
  branch_id: string | null
  assigned_at: string
  ended_at: string | null
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
}

type SelectedDriver = {
  driver: DriverRow
  assignment: AssignmentRow | null
  vehicle: VehicleRow | null
}

// =====================================================
// PAGE
// =====================================================

export default function ManagerDriversPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [manager, setManager] =
    useState<ManagerProfile | null>(null)

  const [branch, setBranch] =
    useState<BranchRow | null>(null)

  const [drivers, setDrivers] =
    useState<DriverRow[]>([])

  const [vehicles, setVehicles] =
    useState<VehicleRow[]>([])

  const [assignments, setAssignments] =
    useState<AssignmentRow[]>([])

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [selectedDriver, setSelectedDriver] =
    useState<SelectedDriver | null>(null)

  const [selectedVehicleId, setSelectedVehicleId] =
    useState('')

  const [resendingId, setResendingId] =
    useState<string | null>(null)

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      // -------------------------------------------------
      // USUÁRIO LOGADO
      // -------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'Usuário não autenticado.'
        )
      }

      // -------------------------------------------------
      // PERFIL DO GESTOR
      // -------------------------------------------------

      const {
        data: managerData,
        error: managerError,
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
        .eq('id', user.id)
        .maybeSingle()

      if (managerError) {
        throw managerError
      }

      if (!managerData) {
        throw new Error(
          'Perfil do gestor não encontrado.'
        )
      }

      const managerProfile =
        managerData as ManagerProfile

      if (!managerProfile.active) {
        throw new Error(
          'Seu usuário está inativo.'
        )
      }

      if (
        managerProfile.role !==
        'branch_manager'
      ) {
        throw new Error(
          'Esta página é exclusiva para gestores de base.'
        )
      }

      if (!managerProfile.branch_id) {
        throw new Error(
          'O gestor não possui base vinculada.'
        )
      }

      setManager(managerProfile)

      const branchId =
        managerProfile.branch_id

      // -------------------------------------------------
      // BASE
      // -------------------------------------------------

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
          active
        `)
        .eq('id', branchId)
        .maybeSingle()

      if (branchError) {
        throw branchError
      }

      if (!branchData) {
        throw new Error(
          'Base do gestor não encontrada.'
        )
      }

      setBranch(
        branchData as BranchRow
      )

      // -------------------------------------------------
      // MOTORISTAS + VEÍCULOS + ATRIBUIÇÕES
      // -------------------------------------------------

      const [
        driversResponse,
        vehiclesResponse,
        assignmentsResponse,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            role,
            branch_id,
            active
          `)
          .eq('role', 'driver')
          .eq('branch_id', branchId)
          .order('full_name'),

        supabase
          .from('vehicles')
          .select(`
            id,
            model,
            plate,
            year,
            status,
            mileage,
            driver_id,
            current_branch_id
          `)
          .eq(
            'current_branch_id',
            branchId
          )
          .order('plate'),

        supabase
          .from(
            'driver_vehicle_assignments'
          )
          .select(`
            id,
            driver_id,
            vehicle_id,
            branch_id,
            assigned_at,
            ended_at
          `)
          .eq('branch_id', branchId)
          .is('ended_at', null),
      ])

      if (driversResponse.error) {
        throw driversResponse.error
      }

      if (vehiclesResponse.error) {
        throw vehiclesResponse.error
      }

      if (assignmentsResponse.error) {
        throw assignmentsResponse.error
      }

      setDrivers(
        (
          driversResponse.data ?? []
        ) as DriverRow[]
      )

      setVehicles(
        (
          vehiclesResponse.data ?? []
        ) as VehicleRow[]
      )

      setAssignments(
        (
          assignmentsResponse.data ?? []
        ) as AssignmentRow[]
      )
    } catch (error) {
      console.error(
        'Erro ao carregar motoristas:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os motoristas.'
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // =====================================================
  // MAPAS
  // =====================================================

  const assignmentByDriver =
    useMemo(() => {
      return new Map(
        assignments.map(
          (assignment) => [
            assignment.driver_id,
            assignment,
          ]
        )
      )
    }, [assignments])

  const assignmentByVehicle =
    useMemo(() => {
      return new Map(
        assignments.map(
          (assignment) => [
            assignment.vehicle_id,
            assignment,
          ]
        )
      )
    }, [assignments])

  const vehicleMap =
    useMemo(() => {
      return new Map(
        vehicles.map((vehicle) => [
          vehicle.id,
          vehicle,
        ])
      )
    }, [vehicles])

  // =====================================================
  // FILTRO
  // =====================================================

  const filteredDrivers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      if (!query) {
        return drivers
      }

      return drivers.filter(
        (driver) => {
          const assignment =
            assignmentByDriver.get(
              driver.id
            )

          const vehicle =
            assignment
              ? vehicleMap.get(
                  assignment.vehicle_id
                )
              : null

          const values = [
            driver.full_name,
            driver.email,
            vehicle?.model,
            vehicle?.plate,
            vehicle?.status,
          ]

          return values
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            )
        }
      )
    }, [
      drivers,
      search,
      assignmentByDriver,
      vehicleMap,
    ])

  // =====================================================
  // VEÍCULOS DISPONÍVEIS
  // =====================================================

  const availableVehicles =
    useMemo(() => {
      if (!selectedDriver) {
        return []
      }

      return vehicles.filter(
        (vehicle) => {
          const activeAssignment =
            assignmentByVehicle.get(
              vehicle.id
            )

          const belongsToSelectedDriver =
            activeAssignment?.driver_id ===
            selectedDriver.driver.id

          const isFree =
            !activeAssignment

          const status =
            vehicle.status ?? 'Ativo'

          return (
            status === 'Ativo' &&
            (
              isFree ||
              belongsToSelectedDriver
            )
          )
        }
      )
    }, [
      vehicles,
      assignmentByVehicle,
      selectedDriver,
    ])

  // =====================================================
  // ABRIR MODAL
  // =====================================================

  function openAssignmentModal(
    driver: DriverRow
  ) {
    const assignment =
      assignmentByDriver.get(
        driver.id
      ) ?? null

    const vehicle =
      assignment
        ? vehicleMap.get(
            assignment.vehicle_id
          ) ?? null
        : null

    setSelectedDriver({
      driver,
      assignment,
      vehicle,
    })

    setSelectedVehicleId(
      vehicle?.id ?? ''
    )

    setErrorMessage('')
    setSuccessMessage('')
  }

  function closeModal() {
    if (saving) {
      return
    }

    setSelectedDriver(null)
    setSelectedVehicleId('')
  }

  // =====================================================
  // ATRIBUIR / TROCAR VEÍCULO
  // =====================================================

  async function handleAssignVehicle() {
    if (
      !selectedDriver ||
      !manager?.branch_id ||
      !selectedVehicleId
    ) {
      setErrorMessage(
        'Selecione um veículo.'
      )

      return
    }

    const driver =
      selectedDriver.driver

    const oldAssignment =
      selectedDriver.assignment

    const oldVehicle =
      selectedDriver.vehicle

    if (
      oldVehicle?.id ===
      selectedVehicleId
    ) {
      setErrorMessage(
        'Este veículo já está atribuído ao motorista.'
      )

      return
    }

    const newVehicle =
      vehicles.find(
        (vehicle) =>
          vehicle.id ===
          selectedVehicleId
      )

    if (!newVehicle) {
      setErrorMessage(
        'Veículo não encontrado.'
      )

      return
    }

    if (
      newVehicle.current_branch_id !==
      manager.branch_id
    ) {
      setErrorMessage(
        'Este veículo não pertence à sua base.'
      )

      return
    }

    const vehicleAssignment =
      assignmentByVehicle.get(
        newVehicle.id
      )

    if (
      vehicleAssignment &&
      vehicleAssignment.driver_id !==
        driver.id
    ) {
      setErrorMessage(
        'Este veículo já está atribuído a outro motorista.'
      )

      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const now =
        new Date().toISOString()

      // -----------------------------------------------
      // ENCERRAR ATRIBUIÇÃO ANTERIOR
      // -----------------------------------------------

      if (oldAssignment) {
        const {
          error:
            closeAssignmentError,
        } = await supabase
          .from(
            'driver_vehicle_assignments'
          )
          .update({
            ended_at: now,
          })
          .eq(
            'id',
            oldAssignment.id
          )

        if (
          closeAssignmentError
        ) {
          throw closeAssignmentError
        }
      }

      // -----------------------------------------------
      // DESVINCULAR VEÍCULO ANTIGO
      // -----------------------------------------------

      if (
        oldVehicle &&
        oldVehicle.id !==
          newVehicle.id
      ) {
        const {
          error:
            oldVehicleError,
        } = await supabase
          .from('vehicles')
          .update({
            driver_id: null,
            updated_at: now,
          })
          .eq('id', oldVehicle.id)

        if (oldVehicleError) {
          throw oldVehicleError
        }
      }

      // -----------------------------------------------
      // CRIAR NOVA ATRIBUIÇÃO
      // -----------------------------------------------

      const {
        error: assignmentError,
      } = await supabase
        .from(
          'driver_vehicle_assignments'
        )
        .insert({
          id: crypto.randomUUID(),
          driver_id: driver.id,
          vehicle_id: newVehicle.id,
          branch_id:
            manager.branch_id,
          assigned_at: now,
          ended_at: null,
        })

      if (assignmentError) {
        throw assignmentError
      }

      // -----------------------------------------------
      // ATUALIZAR VEÍCULO
      // -----------------------------------------------

      const {
        error: vehicleError,
      } = await supabase
        .from('vehicles')
        .update({
          driver_id: driver.id,
          updated_at: now,
        })
        .eq('id', newVehicle.id)

      if (vehicleError) {
        throw vehicleError
      }

      setSuccessMessage(
        oldAssignment
          ? `Veículo do motorista ${driver.full_name} trocado com sucesso.`
          : `Veículo atribuído a ${driver.full_name} com sucesso.`
      )

      setSelectedDriver(null)
      setSelectedVehicleId('')

      await loadData()
    } catch (error) {
      console.error(
        'Erro ao atribuir veículo:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível atribuir o veículo.'
      )
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // REMOVER ATRIBUIÇÃO
  // =====================================================

  async function handleRemoveAssignment() {
    if (
      !selectedDriver?.assignment
    ) {
      return
    }

    const driver =
      selectedDriver.driver

    const assignment =
      selectedDriver.assignment

    const vehicle =
      selectedDriver.vehicle

    const confirmed =
      window.confirm(
        `Deseja remover o veículo de ${driver.full_name}?`
      )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const now =
        new Date().toISOString()

      // ENCERRA HISTÓRICO

      const {
        error: assignmentError,
      } = await supabase
        .from(
          'driver_vehicle_assignments'
        )
        .update({
          ended_at: now,
        })
        .eq('id', assignment.id)

      if (assignmentError) {
        throw assignmentError
      }

      // REMOVE MOTORISTA DO VEÍCULO

      if (vehicle) {
        const {
          error: vehicleError,
        } = await supabase
          .from('vehicles')
          .update({
            driver_id: null,
            updated_at: now,
          })
          .eq('id', vehicle.id)

        if (vehicleError) {
          throw vehicleError
        }
      }

      setSuccessMessage(
        `Veículo removido de ${driver.full_name}.`
      )

      setSelectedDriver(null)
      setSelectedVehicleId('')

      await loadData()
    } catch (error) {
      console.error(
        'Erro ao remover atribuição:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover a atribuição.'
      )
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // REENVIAR CONVITE
  // =====================================================

  async function handleResendInvite(
    driver: DriverRow
  ) {
    setResendingId(driver.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `/api/manager/drivers/${driver.id}/resend-invite`,
        {
          method: 'POST',
        }
      )

      const data =
        (await response.json()) as {
          message?: string
          error?: string
        }

      if (!response.ok) {
        throw new Error(
          data.error ??
            'Não foi possível reenviar o convite.'
        )
      }

      setSuccessMessage(
        data.message ??
          `Convite reenviado para ${driver.email}.`
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível reenviar o convite.'
      )
    } finally {
      setResendingId(null)
    }
  }

  // =====================================================
  // INDICADORES
  // =====================================================

  const activeDrivers =
    drivers.filter(
      (driver) => driver.active
    ).length

  const assignedDrivers =
    drivers.filter(
      (driver) =>
        assignmentByDriver.has(
          driver.id
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

          <div className="flex items-start gap-3">

            <Link
              href="/manager"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <p className="text-sm font-semibold text-blue-400">
                Gestão da unidade
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Motoristas
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                {branch
                  ? `${branch.name} • ${branch.city} • ${branch.code}`
                  : 'Motoristas da sua base'}
              </p>
            </div>

          </div>

          <Link
            href="/manager/drivers/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Novo motorista
          </Link>

        </section>

        {/* INDICADORES */}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">

          <StatCard
            label="Motoristas"
            value={drivers.length}
          />

          <StatCard
            label="Ativos"
            value={activeDrivers}
          />

          <StatCard
            label="Com veículo"
            value={assignedDrivers}
          />

        </section>

        {/* BUSCA */}

        <section className="flex flex-col gap-3 sm:flex-row">

          <div className="relative flex-1">

            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar motorista, e-mail, veículo ou placa..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
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

        {/* MENSAGENS */}

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* LISTAGEM */}

        {loading ? (

          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">

            <div className="text-center">

              <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-400" />

              <p className="mt-3 text-sm text-zinc-500">
                Carregando motoristas...
              </p>

            </div>

          </div>

        ) : filteredDrivers.length === 0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">

            <Users className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-4 font-semibold text-zinc-300">
              Nenhum motorista encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Cadastre um motorista ou altere a busca.
            </p>

          </div>

        ) : (

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredDrivers.map(
              (driver) => {

                const assignment =
                  assignmentByDriver.get(
                    driver.id
                  )

                const vehicle =
                  assignment
                    ? vehicleMap.get(
                        assignment.vehicle_id
                      )
                    : null

                return (
                  <article
                    key={driver.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <span
                        className={[
                          'rounded-full border px-2.5 py-1 text-xs font-semibold',
                          driver.active
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-500',
                        ].join(' ')}
                      >
                        {driver.active
                          ? 'Ativo'
                          : 'Inativo'}
                      </span>

                    </div>

                    <h2 className="mt-4 text-lg font-bold text-white">
                      {driver.full_name}
                    </h2>

                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                      <Mail className="h-4 w-4 shrink-0" />

                      <span className="truncate">
                        {driver.email}
                      </span>
                    </div>

                    <div className="mt-5 border-t border-zinc-800 pt-4">

                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Veículo atual
                      </p>

                      {vehicle ? (

                        <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                          <div className="flex items-center gap-3">

                            <Car className="h-5 w-5 text-blue-400" />

                            <div>
                              <p className="font-semibold text-white">
                                {vehicle.model}
                              </p>

                              <p className="mt-1 font-mono text-sm font-semibold text-blue-400">
                                {vehicle.plate}
                              </p>
                            </div>

                          </div>

                          <p className="mt-3 text-xs text-zinc-500">
                            {(
                              vehicle.mileage ?? 0
                            ).toLocaleString(
                              'pt-BR'
                            )}{' '}
                            km
                          </p>

                        </div>

                      ) : (

                        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
                          Nenhum veículo atribuído.
                        </div>

                      )}

                    </div>

                    <div className="mt-5 space-y-2 border-t border-zinc-800 pt-4">

                      <button
                        type="button"
                        onClick={() =>
                          openAssignmentModal(
                            driver
                          )
                        }
                        disabled={!driver.active}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Car className="h-4 w-4" />

                        {vehicle
                          ? 'Trocar veículo'
                          : 'Atribuir veículo'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleResendInvite(
                            driver
                          )
                        }
                        disabled={
                          resendingId ===
                          driver.id
                        }
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {resendingId ===
                        driver.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}

                        Reenviar convite
                      </button>

                    </div>

                  </article>
                )
              }
            )}

          </section>

        )}

      </div>

      {/* ===================================================
          MODAL DE ATRIBUIÇÃO
      =================================================== */}

      {selectedDriver && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Veículo do motorista
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  {selectedDriver.driver.full_name}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {selectedDriver.driver.email}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              {selectedDriver.vehicle && (

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">

                  <p className="text-xs font-semibold uppercase text-zinc-600">
                    Veículo atual
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {selectedDriver.vehicle.model}
                  </p>

                  <p className="mt-1 font-mono text-sm text-blue-400">
                    {selectedDriver.vehicle.plate}
                  </p>

                </div>

              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  {selectedDriver.vehicle
                    ? 'Novo veículo'
                    : 'Selecionar veículo'}
                </label>

                <select
                  value={selectedVehicleId}
                  onChange={(event) =>
                    setSelectedVehicleId(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">
                    Selecione um veículo
                  </option>

                  {availableVehicles.map(
                    (vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                      >
                        {vehicle.plate} •{' '}
                        {vehicle.model}
                      </option>
                    )
                  )}
                </select>

                {availableVehicles.length ===
                  0 && (
                  <p className="mt-2 text-xs text-amber-400">
                    Não há veículos ativos e disponíveis nesta base.
                  </p>
                )}
              </div>

            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 p-5 sm:flex-row sm:justify-between">

              <div>

                {selectedDriver.assignment && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleRemoveAssignment()
                    }
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Unlink className="h-4 w-4" />
                    Remover veículo
                  </button>
                )}

              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="min-h-11 rounded-xl border border-zinc-800 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleAssignVehicle()
                  }
                  disabled={
                    saving ||
                    !selectedVehicleId
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Car className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Salvando...'
                    : selectedDriver.assignment
                      ? 'Trocar veículo'
                      : 'Atribuir veículo'}
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </AppShell>
  )
}

// =====================================================
// STAT
// =====================================================

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