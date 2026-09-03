'use client'

import Link from 'next/link'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Fuel,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Route,
  UserRound,
  Wrench,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

type DriverProfile = {
  id: string
  full_name: string
  email: string
  branch_id: string | null
  active: boolean
}

type VehicleData = {
  id: string
  model: string
  plate: string
  year: string
  status: string
  mileage: number | null
  driver_id: string | null
  current_branch_id: string | null
}

type LastChecklist = {
  id: string
  vehicle_model: string
  vehicle_plate: string
  km_atual: number | null
  has_issue: boolean
  observation: string | null
  submitted_at: string
}

type LastFuel = {
  id: string
  vehicle_model: string
  vehicle_plate: string
  fuel_type: string
  current_km: number | null
  liters: number | null
  total_amount: number | null
  km_per_liter: number | null
  cost_per_km: number | null
  fuel_station: string | null
  submitted_at: string
}

// =====================================================
// PÁGINA
// =====================================================

export default function DriverPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [profile, setProfile] =
    useState<DriverProfile | null>(
      null
    )

  const [vehicle, setVehicle] =
    useState<VehicleData | null>(
      null
    )

  const [
    lastChecklist,
    setLastChecklist,
  ] =
    useState<LastChecklist | null>(
      null
    )

  const [
    lastFuel,
    setLastFuel,
  ] =
    useState<LastFuel | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('')

  // =====================================================
  // CARREGAR DASHBOARD
  // =====================================================

  const loadDashboard =
    useCallback(async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        // ===============================================
        // USUÁRIO
        // ===============================================

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser()

        if (
          userError ||
          !user
        ) {
          throw new Error(
            'Não foi possível identificar o motorista.'
          )
        }

        // ===============================================
        // PERFIL
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
            'Perfil do motorista não encontrado.'
          )
        }

        const driverProfile =
          profileData as DriverProfile

        if (
          !driverProfile.active
        ) {
          throw new Error(
            'Seu usuário está inativo.'
          )
        }

        setProfile(
          driverProfile
        )

        // ===============================================
        // VEÍCULO ATRIBUÍDO
        // ===============================================

        let vehicleData:
          | VehicleData
          | null = null

        // 1. Estrutura oficial de atribuição.

        const {
          data: assignment,
          error:
            assignmentError,
        } = await supabase
          .from(
            'driver_vehicle_assignments'
          )
          .select(
            'vehicle_id'
          )
          .eq(
            'driver_id',
            user.id
          )
          .is(
            'ended_at',
            null
          )
          .maybeSingle()

        if (
          assignmentError
        ) {
          console.error(
            'Erro ao buscar atribuição:',
            assignmentError
          )
        }

        if (
          assignment?.vehicle_id
        ) {
          const {
            data,
            error,
          } = await supabase
            .from(
              'vehicles'
            )
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
              'id',
              assignment.vehicle_id
            )
            .maybeSingle()

          if (error) {
            console.error(
              'Erro ao buscar veículo atribuído:',
              error
            )
          } else if (data) {
            vehicleData =
              data as VehicleData
          }
        }

        // ===============================================
        // FALLBACK DRIVER_ID
        // ===============================================

        if (
          !vehicleData
        ) {
          const {
            data,
            error,
          } = await supabase
            .from(
              'vehicles'
            )
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
              'driver_id',
              user.id
            )
            .maybeSingle()

          if (error) {
            console.error(
              'Erro no fallback por driver_id:',
              error
            )
          } else if (data) {
            vehicleData =
              data as VehicleData
          }
        }

        // ===============================================
        // FALLBACK LEGADO POR EMAIL
        // ===============================================

        if (
          !vehicleData &&
          user.email
        ) {
          const {
            data,
            error,
          } = await supabase
            .from(
              'vehicles'
            )
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
              'driver_email',
              user.email
            )
            .maybeSingle()

          if (error) {
            console.error(
              'Erro no fallback por e-mail:',
              error
            )
          } else if (data) {
            vehicleData =
              data as VehicleData
          }
        }

        setVehicle(
          vehicleData
        )

        // ===============================================
        // ÚLTIMO CHECKLIST + ABASTECIMENTO
        // ===============================================

        if (
          vehicleData
        ) {
          const [
            checklistResponse,
            fuelResponse,
          ] =
            await Promise.all([
              supabase
                .from(
                  'driver_checklists'
                )
                .select(`
                  id,
                  vehicle_model,
                  vehicle_plate,
                  km_atual,
                  has_issue,
                  observation,
                  submitted_at
                `)
                .eq(
                  'user_id',
                  user.id
                )
                .eq(
                  'vehicle_id',
                  vehicleData.id
                )
                .order(
                  'submitted_at',
                  {
                    ascending:
                      false,
                  }
                )
                .limit(1)
                .maybeSingle(),

              supabase
                .from(
                  'fuel_records'
                )
                .select(`
                  id,
                  vehicle_model,
                  vehicle_plate,
                  fuel_type,
                  current_km,
                  liters,
                  total_amount,
                  km_per_liter,
                  cost_per_km,
                  fuel_station,
                  submitted_at
                `)
                .eq(
                  'user_id',
                  user.id
                )
                .eq(
                  'vehicle_id',
                  vehicleData.id
                )
                .order(
                  'submitted_at',
                  {
                    ascending:
                      false,
                  }
                )
                .limit(1)
                .maybeSingle(),
            ])

          if (
            checklistResponse.error
          ) {
            console.error(
              'Erro ao buscar último checklist:',
              checklistResponse.error
            )
          } else {
            setLastChecklist(
              checklistResponse.data as
                | LastChecklist
                | null
            )
          }

          if (
            fuelResponse.error
          ) {
            console.error(
              'Erro ao buscar último abastecimento:',
              fuelResponse.error
            )
          } else {
            setLastFuel(
              fuelResponse.data as
                | LastFuel
                | null
            )
          }
        } else {
          setLastChecklist(
            null
          )

          setLastFuel(
            null
          )
        }
      } catch (error) {
        console.error(
          'Erro ao carregar painel do motorista:',
          error
        )

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar seu painel.'
        )
      } finally {
        setLoading(false)
      }
    }, [supabase])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[65vh] items-center justify-center">

          <div className="text-center">

            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />

            <p className="mt-4 text-sm text-zinc-500">
              Carregando seu painel...
            </p>

          </div>

        </div>
      </AppShell>
    )
  }

  // =====================================================
  // ERRO
  // =====================================================

  if (errorMessage) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">

          <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">

            <div className="flex items-start gap-3">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>

                <h1 className="font-semibold text-white">
                  Não foi possível carregar seu painel
                </h1>

                <p className="mt-2 text-sm text-red-300">
                  {errorMessage}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <RefreshCw className="h-4 w-4" />

              Tentar novamente
            </button>

          </section>

        </div>
      </AppShell>
    )
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-sm font-semibold text-blue-400">
              Painel do motorista
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Olá
              {profile?.full_name
                ? `, ${getFirstName(
                    profile.full_name
                  )}`
                : ''}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Consulte seu veículo,
              checklist e abastecimentos
              em um único lugar.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />

            Atualizar
          </button>

        </section>

        {/* =================================================
            MOTORISTA
        ================================================= */}

        {profile && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">

                <UserRound className="h-6 w-6" />

              </div>

              <div className="min-w-0">

                <p className="font-semibold text-white">
                  {profile.full_name}
                </p>

                <p className="mt-1 truncate text-sm text-zinc-500">
                  {profile.email}
                </p>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            VEÍCULO
        ================================================= */}

        {vehicle ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">

                  <Car className="h-7 w-7" />

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Veículo atual
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    {vehicle.model}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {vehicle.plate}
                    {' • '}
                    {vehicle.year}
                  </p>

                </div>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">

                  <p className="text-xs text-zinc-500">
                    Quilometragem
                  </p>

                  <p className="mt-1 font-semibold text-zinc-200">
                    {Number(
                      vehicle.mileage ??
                        0
                    ).toLocaleString(
                      'pt-BR'
                    )}{' '}
                    km
                  </p>

                </div>

                <VehicleStatus
                  status={
                    vehicle.status
                  }
                />

              </div>

            </div>

          </section>
        ) : (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">

            <div className="flex items-start gap-3">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

              <div>

                <h2 className="font-semibold text-amber-300">
                  Nenhum veículo atribuído
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Entre em contato com o gestor da sua base para receber um veículo.
                </p>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            AÇÕES RÁPIDAS
        ================================================= */}

        <section>

          <div className="mb-4">

            <h2 className="text-lg font-bold text-white">
              Ações rápidas
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Registre as atividades diárias do veículo.
            </p>

          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <QuickActionCard
              href="/driver/checklist"
              icon={
                ClipboardCheck
              }
              title="Fazer checklist"
              description="Realize a inspeção diária antes de iniciar a operação."
              disabled={
                !vehicle
              }
            />

            <QuickActionCard
              href="/driver/fuel"
              icon={Fuel}
              title="Registrar abastecimento"
              description="Informe combustível, litros, valor e quilometragem."
              disabled={
                !vehicle
              }
            />

          </div>

        </section>

        {/* =================================================
            ÚLTIMAS ATIVIDADES
        ================================================= */}

        <section>

          <div className="mb-4 flex items-center gap-3">

            <History className="h-5 w-5 text-blue-400" />

            <div>

              <h2 className="text-lg font-bold text-white">
                Últimas atividades
              </h2>

              <p className="text-xs text-zinc-500">
                Registros mais recentes deste veículo.
              </p>

            </div>

          </div>

          <div className="grid gap-4 lg:grid-cols-2">

            {/* CHECKLIST */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">

                    <ClipboardCheck className="h-5 w-5" />

                  </div>

                  <div>

                    <h3 className="font-semibold text-white">
                      Último checklist
                    </h3>

                    <p className="text-xs text-zinc-500">
                      Inspeção veicular
                    </p>

                  </div>

                </div>

                <Link
                  href="/driver/checklist"
                  className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                >
                  Novo
                </Link>

              </div>

              {lastChecklist ? (
                <div className="mt-5 space-y-4">

                  <div className="grid grid-cols-2 gap-3">

                    <SmallMetric
                      label="Data"
                      value={formatDate(
                        lastChecklist.submitted_at
                      )}
                    />

                    <SmallMetric
                      label="KM"
                      value={
                        lastChecklist.km_atual !=
                        null
                          ? `${Number(
                              lastChecklist.km_atual
                            ).toLocaleString(
                              'pt-BR'
                            )} km`
                          : '--'
                      }
                    />

                  </div>

                  <div
                    className={[
                      'flex items-start gap-3 rounded-xl border p-4',

                      lastChecklist.has_issue
                        ? 'border-amber-500/20 bg-amber-500/10'
                        : 'border-emerald-500/20 bg-emerald-500/10',
                    ].join(' ')}
                  >

                    {lastChecklist.has_issue ? (
                      <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    )}

                    <div>

                      <p
                        className={
                          lastChecklist.has_issue
                            ? 'text-sm font-semibold text-amber-300'
                            : 'text-sm font-semibold text-emerald-300'
                        }
                      >
                        {lastChecklist.has_issue
                          ? 'Ocorrência encontrada'
                          : 'Veículo aprovado'}
                      </p>

                      {lastChecklist.observation && (
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-400">
                          {
                            lastChecklist.observation
                          }
                        </p>
                      )}

                    </div>

                  </div>

                </div>
              ) : (
                <EmptyActivity
                  text="Nenhum checklist registrado para este veículo."
                />
              )}

            </section>

            {/* ABASTECIMENTO */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-400">

                    <Fuel className="h-5 w-5" />

                  </div>

                  <div>

                    <h3 className="font-semibold text-white">
                      Último abastecimento
                    </h3>

                    <p className="text-xs text-zinc-500">
                      Consumo do veículo
                    </p>

                  </div>

                </div>

                <Link
                  href="/driver/fuel"
                  className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                >
                  Novo
                </Link>

              </div>

              {lastFuel ? (
                <div className="mt-5">

                  <div className="grid grid-cols-2 gap-3">

                    <SmallMetric
                      label="Combustível"
                      value={
                        lastFuel.fuel_type
                      }
                    />

                    <SmallMetric
                      label="Data"
                      value={formatDate(
                        lastFuel.submitted_at
                      )}
                    />

                    <SmallMetric
                      label="Litros"
                      value={
                        lastFuel.liters !=
                        null
                          ? `${formatNumber(
                              Number(
                                lastFuel.liters
                              ),
                              2
                            )} L`
                          : '--'
                      }
                    />

                    <SmallMetric
                      label="Valor"
                      value={
                        lastFuel.total_amount !=
                        null
                          ? formatCurrency(
                              Number(
                                lastFuel.total_amount
                              )
                            )
                          : '--'
                      }
                    />

                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">

                    <SmallMetric
                      label="Consumo"
                      value={
                        Number(
                          lastFuel.km_per_liter ??
                            0
                        ) > 0
                          ? `${Number(
                              lastFuel.km_per_liter
                            ).toFixed(
                              2
                            )} km/L`
                          : '--'
                      }
                    />

                    <SmallMetric
                      label="Custo/km"
                      value={
                        Number(
                          lastFuel.cost_per_km ??
                            0
                        ) > 0
                          ? formatCurrency(
                              Number(
                                lastFuel.cost_per_km
                              )
                            )
                          : '--'
                      }
                    />

                  </div>

                  {lastFuel.fuel_station && (
                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">

                      <p className="text-xs text-zinc-500">
                        Posto
                      </p>

                      <p className="mt-1 text-sm font-medium text-zinc-300">
                        {lastFuel.fuel_station}
                      </p>

                    </div>
                  )}

                </div>
              ) : (
                <EmptyActivity
                  text="Nenhum abastecimento registrado para este veículo."
                />
              )}

            </section>

          </div>

        </section>

        {/* =================================================
            RESUMO
        ================================================= */}

        {vehicle && (
          <section className="grid gap-4 sm:grid-cols-3">

            <DashboardMetric
              icon={Gauge}
              label="KM atual"
              value={`${Number(
                vehicle.mileage ??
                  0
              ).toLocaleString(
                'pt-BR'
              )} km`}
            />

            <DashboardMetric
              icon={
                ClipboardCheck
              }
              label="Checklist"
              value={
                lastChecklist
                  ? lastChecklist.has_issue
                    ? 'Com ocorrência'
                    : 'Aprovado'
                  : 'Sem registro'
              }
            />

            <DashboardMetric
              icon={Route}
              label="Status veículo"
              value={
                vehicle.status ||
                'Ativo'
              }
            />

          </section>
        )}

      </div>
    </AppShell>
  )
}

// =====================================================
// AÇÃO RÁPIDA
// =====================================================

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  href: string
  icon: typeof Fuel
  title: string
  description: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="cursor-not-allowed rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 opacity-50">

        <div className="flex items-start gap-4">

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-500">

            <Icon className="h-6 w-6" />

          </div>

          <div>

            <h3 className="font-semibold text-zinc-300">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {description}
            </p>

          </div>

        </div>

      </div>
    )
  }

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-blue-500/30 hover:bg-zinc-900"
    >

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-4">

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">

            <Icon className="h-6 w-6" />

          </div>

          <div>

            <h3 className="font-semibold text-white">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {description}
            </p>

          </div>

        </div>

        <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-blue-400" />

      </div>

    </Link>
  )
}

// =====================================================
// STATUS DO VEÍCULO
// =====================================================

function VehicleStatus({
  status,
}: {
  status: string
}) {
  const maintenance =
    status ===
      'Manutenção' ||
    status ===
      'Maintenance'

  return (
    <div
      className={[
        'rounded-xl border px-4 py-3',

        maintenance
          ? 'border-amber-500/20 bg-amber-500/10'
          : 'border-emerald-500/20 bg-emerald-500/10',
      ].join(' ')}
    >

      <p
        className={[
          'text-xs',

          maintenance
            ? 'text-amber-400'
            : 'text-emerald-400',
        ].join(' ')}
      >
        Status
      </p>

      <p
        className={[
          'mt-1 font-semibold',

          maintenance
            ? 'text-amber-300'
            : 'text-emerald-300',
        ].join(' ')}
      >
        {status ||
          'Ativo'}
      </p>

    </div>
  )
}

// =====================================================
// MÉTRICA PEQUENA
// =====================================================

function SmallMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">

      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-200">
        {value}
      </p>

    </div>
  )
}

// =====================================================
// MÉTRICA DO DASHBOARD
// =====================================================

function DashboardMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

      <div className="flex items-center gap-2 text-zinc-500">

        <Icon className="h-4 w-4" />

        <p className="text-xs">
          {label}
        </p>

      </div>

      <p className="mt-3 font-bold text-white">
        {value}
      </p>

    </div>
  )
}

// =====================================================
// ESTADO VAZIO
// =====================================================

function EmptyActivity({
  text,
}: {
  text: string
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-5 text-center">

      <CalendarDays className="mx-auto h-6 w-6 text-zinc-700" />

      <p className="mt-2 text-sm text-zinc-500">
        {text}
      </p>

    </div>
  )
}

// =====================================================
// FORMATAÇÃO
// =====================================================

function getFirstName(
  fullName: string
) {
  return (
    fullName
      .trim()
      .split(/\s+/)[0] ||
    'Motorista'
  )
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',
      currency:
        'BRL',
    }
  ).format(
    Number.isFinite(
      value
    )
      ? value
      : 0
  )
}

function formatNumber(
  value: number,
  digits = 2
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      minimumFractionDigits:
        digits,

      maximumFractionDigits:
        digits,
    }
  ).format(
    Number.isFinite(
      value
    )
      ? value
      : 0
  )
}

function formatDate(
  value: string
) {
  const date =
    new Date(
      value
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '--'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',
    }
  ).format(
    date
  )
}