'use client'

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Activity,
  Calculator,
  Car,
  CheckCircle2,
  Fuel,
  History,
  Loader2,
  MapPin,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type DriverProfile = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type AssignedVehicle = {
  id: string
  model: string
  plate: string
  mileage: number | null
  current_branch_id: string | null
}

type FuelForm = {
  fuelType: string
  currentKm: string
  liters: string
  totalAmount: string
  fuelStation: string
}

type ConsumptionStats = {
  valid_records: number
  average_km_per_liter: number
  average_cost_per_km: number
  total_distance_km: number
  total_liters: number
  total_amount: number
  last_fuel_at: string | null
}

const initialForm: FuelForm = {
  fuelType: 'Gasolina',
  currentKm: '',
  liters: '',
  totalAmount: '',
  fuelStation: '',
}

function parseNumber(value: string): number {
  const normalized = value
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')

  const number = Number(normalized)

  return Number.isFinite(number)
    ? number
    : 0
}

export default function DriverFuelPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [profile, setProfile] =
    useState<DriverProfile | null>(null)

  const [vehicle, setVehicle] =
    useState<AssignedVehicle | null>(null)

  const [form, setForm] =
    useState<FuelForm>(initialForm)

  const [stats, setStats] =
    useState<ConsumptionStats | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [loadingStats, setLoadingStats] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [submissionId, setSubmissionId] =
    useState(() => crypto.randomUUID())

  const submissionInFlightRef =
    useRef(false)

  useEffect(() => {
    let mounted = true

    async function loadDriverData() {
      try {
        setLoading(true)
        setError('')

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error(
            'Não foi possível identificar o usuário.'
          )
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            'id, full_name, email, role, branch_id, active'
          )
          .eq('id', user.id)
          .maybeSingle()

        if (
          profileError ||
          !profileData
        ) {
          throw new Error(
            'Perfil do motorista não encontrado.'
          )
        }

        const driverProfile =
          profileData as DriverProfile

        if (
          !driverProfile.active ||
          driverProfile.role !== 'driver' ||
          !driverProfile.branch_id
        ) {
          throw new Error(
            'O perfil do motorista não está ativo ou não possui base válida.'
          )
        }

        const {
          data: assignment,
          error: assignmentError,
        } = await supabase
          .from(
            'driver_vehicle_assignments'
          )
          .select('vehicle_id, branch_id')
          .eq('driver_id', user.id)
          .is('ended_at', null)
          .maybeSingle()

        if (assignmentError) {
          throw assignmentError
        }

        if (!assignment) {
          if (mounted) {
            setProfile(driverProfile)
            setVehicle(null)
          }

          return
        }

        if (
          assignment.branch_id !==
          driverProfile.branch_id
        ) {
          throw new Error(
            'A atribuição ativa pertence a uma base diferente do motorista.'
          )
        }

        const {
          data: vehicleData,
          error: vehicleError,
        } = await supabase
          .from('vehicles')
          .select(`
            id,
            model,
            plate,
            mileage,
            current_branch_id
          `)
          .eq('id', assignment.vehicle_id)
          .single()

        if (vehicleError || !vehicleData) {
          throw new Error(
            'Veículo da atribuição ativa não encontrado.'
          )
        }

        if (
          vehicleData.current_branch_id !==
          driverProfile.branch_id
        ) {
          throw new Error(
            'O veículo atribuído pertence a uma base diferente do motorista.'
          )
        }

        if (!mounted) {
          return
        }

        setProfile(driverProfile)
        setVehicle(vehicleData as AssignedVehicle)

        setForm((current) => ({
          ...current,
          currentKm:
            vehicleData?.mileage != null
              ? String(
                  vehicleData.mileage
                )
              : '',
        }))
      } catch (err: unknown) {
        if (!mounted) {
          return
        }

        console.error(
          'Erro ao carregar motorista:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar dados.'
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadDriverData()

    return () => {
      mounted = false
    }
  }, [supabase])

  const loadHistoricalStats =
    useCallback(
      async (
        vehicleId: string,
        fuelType: string
      ) => {
        try {
          setLoadingStats(true)

          const {
            data,
            error: statsError,
          } = await supabase
            .from(
              'vehicle_fuel_consumption_stats'
            )
            .select(
              `
                valid_records,
                average_km_per_liter,
                average_cost_per_km,
                total_distance_km,
                total_liters,
                total_amount,
                last_fuel_at
              `
            )
            .eq(
              'vehicle_id',
              vehicleId
            )
            .eq(
              'fuel_type',
              fuelType
            )
            .maybeSingle()

          if (statsError) {
            console.error(
              'Erro ao carregar média histórica:',
              statsError
            )

            setStats(null)

            return
          }

          if (!data) {
            setStats(null)

            return
          }

          setStats({
            valid_records:
              Number(
                data.valid_records ?? 0
              ),

            average_km_per_liter:
              Number(
                data.average_km_per_liter ??
                  0
              ),

            average_cost_per_km:
              Number(
                data.average_cost_per_km ??
                  0
              ),

            total_distance_km:
              Number(
                data.total_distance_km ??
                  0
              ),

            total_liters:
              Number(
                data.total_liters ?? 0
              ),

            total_amount:
              Number(
                data.total_amount ?? 0
              ),

            last_fuel_at:
              data.last_fuel_at ?? null,
          })
        } catch (err) {
          console.error(
            'Erro inesperado ao carregar histórico:',
            err
          )

          setStats(null)
        } finally {
          setLoadingStats(false)
        }
      },
      [supabase]
    )

  useEffect(() => {
    if (!vehicle?.id) {
      setStats(null)

      return
    }

    void loadHistoricalStats(
      vehicle.id,
      form.fuelType
    )
  }, [
    vehicle?.id,
    form.fuelType,
    loadHistoricalStats,
  ])

  const previousKm =
    vehicle?.mileage ?? 0

  const currentKm =
    parseNumber(
      form.currentKm || '0'
    )

  const liters =
    parseNumber(
      form.liters || '0'
    )

  const totalAmount =
    parseNumber(
      form.totalAmount || '0'
    )

  const distance =
    currentKm >= previousKm
      ? currentKm - previousKm
      : 0

  const pricePerLiter =
    liters > 0
      ? totalAmount / liters
      : 0

  const kmPerLiter =
    liters > 0 &&
    distance > 0
      ? distance / liters
      : 0

  const costPerKm =
    distance > 0
      ? totalAmount / distance
      : 0

  const historicalAverage =
    stats?.average_km_per_liter ??
    0

  const consumptionDifference =
    historicalAverage > 0 &&
    kmPerLiter > 0
      ? ((kmPerLiter -
          historicalAverage) /
          historicalAverage) *
        100
      : null

  function updateField(
    field: keyof FuelForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setSuccess('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (submissionInFlightRef.current) {
      return
    }

    submissionInFlightRef.current = true

    setError('')
    setSuccess('')

    if (
      !profile ||
      !vehicle ||
      !profile.branch_id
    ) {
      setError(
        'Motorista, atribuição ativa ou base não disponíveis.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      !Number.isFinite(currentKm) ||
      currentKm <= 0
    ) {
      setError(
        'Informe uma quilometragem válida.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      !Number.isInteger(currentKm)
    ) {
      setError(
        'A quilometragem deve ser informada sem casas decimais.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      currentKm <
      previousKm
    ) {
      setError(
        `A quilometragem atual não pode ser menor que ${previousKm.toLocaleString(
          'pt-BR'
        )} km.`
      )
      submissionInFlightRef.current = false
      return
    }

    if (distance <= 0) {
      setError(
        'A quilometragem atual precisa ser maior que a quilometragem anterior para calcular o consumo.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      !Number.isFinite(liters) ||
      liters <= 0
    ) {
      setError(
        'Informe uma quantidade válida de litros.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      !Number.isFinite(
        totalAmount
      ) ||
      totalAmount <= 0
    ) {
      setError(
        'Informe um valor válido para o abastecimento.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      !form.fuelType.trim()
    ) {
      setError(
        'Informe o combustível utilizado.'
      )
      submissionInFlightRef.current = false
      return
    }

    if (
      !form.fuelStation.trim()
    ) {
      setError(
        'Informe o posto de combustível.'
      )
      submissionInFlightRef.current = false
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user || user.id !== profile.id) {
        throw new Error('Usuário não autenticado.')
      }

      const normalizedDistance =
        Math.round(distance)

      const normalizedKmPerLiter =
        Number(
          kmPerLiter.toFixed(3)
        )

      const normalizedCostPerKm =
        Number(
          costPerKm.toFixed(3)
        )

      const normalizedPricePerLiter =
        Number(
          pricePerLiter.toFixed(3)
        )

      const {
        error: insertError,
      } = await supabase
        .from('fuel_records')
        .insert({
          id: submissionId,

          user_id: profile.id,

          driver_id:
            profile.id,

          driver:
            profile.full_name,

          driver_email:
            profile.email,

          branch_id:
            profile.branch_id,

          vehicle_id:
            vehicle.id,

          vehicle_model:
            vehicle.model,

          vehicle_plate:
            vehicle.plate
              .trim()
              .toUpperCase(),

          fuel_type:
            form.fuelType.trim(),

          previous_km:
            previousKm,

          current_km:
            currentKm,

          liters,

          total_amount:
            totalAmount,

          price_per_liter:
            normalizedPricePerLiter,

          fuel_station:
            form.fuelStation.trim(),

          distance_km:
            normalizedDistance,

          km_per_liter:
            normalizedKmPerLiter,

          cost_per_km:
            normalizedCostPerKm,

          updated_at:
            new Date().toISOString(),
        })

      if (insertError) {
        if (insertError.code !== '23505') {
          throw insertError
        }

        const {
          data: existingSubmission,
          error: existingError,
        } = await supabase
          .from('fuel_records')
          .select('id')
          .eq('id', submissionId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existingError || !existingSubmission) {
          throw insertError
        }
      }

      setVehicle(
        (current) =>
          current
            ? {
                ...current,
                mileage:
                  currentKm,
              }
            : current
      )

      const usedFuel =
        form.fuelType

      setForm({
        ...initialForm,

        fuelType:
          usedFuel,

        currentKm:
          String(
            currentKm
          ),
      })

      setSubmissionId(crypto.randomUUID())

      setSuccess(
        `Abastecimento registrado com sucesso. Consumo calculado: ${normalizedKmPerLiter.toFixed(
          2
        )} km/L.`
      )

      await loadHistoricalStats(
        vehicle.id,
        usedFuel
      )
    } catch (err: unknown) {
      console.error(
        'Erro ao registrar abastecimento:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar o abastecimento.'
      )
    } finally {
      setSaving(false)
      submissionInFlightRef.current = false
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-6">

        <section>
          <p className="text-sm font-medium text-blue-400">
            Operação do motorista
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Registrar abastecimento
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Informe o combustível realmente utilizado.
            O FrotaPro calcula automaticamente
            distância, consumo, custo por quilômetro
            e mantém a média histórica individual
            deste veículo para cada combustível.
          </p>
        </section>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />

              <p className="text-sm text-zinc-500">
                Carregando veículo...
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
              >
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                <p>
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                <p>
                  {success}
                </p>
              </div>
            )}

            {vehicle && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">

                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                      <Car className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-semibold text-white">
                        {vehicle.model}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Placa{' '}
                        {vehicle.plate}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                    <p className="text-xs text-zinc-500">
                      KM registrado
                    </p>

                    <p className="mt-1 font-semibold text-zinc-200">
                      {previousKm.toLocaleString(
                        'pt-BR'
                      )}{' '}
                      km
                    </p>
                  </div>
                </div>
              </section>
            )}

            {vehicle &&
              profile && (
                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="space-y-6"
                >

                  <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

                    <div className="mb-6 flex items-center gap-3">

                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">
                        <Fuel className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-semibold text-white">
                          Dados do abastecimento
                        </h2>

                        <p className="text-xs text-zinc-500">
                          Informe os dados reais do abastecimento.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                      <Field label="Combustível utilizado">
                        <select
                          value={
                            form.fuelType
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              'fuelType',
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        >
                          <option value="Gasolina">
                            Gasolina
                          </option>

                          <option value="Etanol">
                            Etanol
                          </option>

                          <option value="Diesel">
                            Diesel
                          </option>

                          <option value="Diesel S10">
                            Diesel S10
                          </option>
                        </select>
                      </Field>

                      <Field label="Posto de combustível">
                        <div className="relative">

                          <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                          <input
                            type="text"
                            value={
                              form.fuelStation
                            }
                            onChange={(
                              event
                            ) =>
                              updateField(
                                'fuelStation',
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Nome do posto"
                            className={`${inputClass} pl-10`}
                            required
                          />
                        </div>
                      </Field>

                      <Field label="KM anterior">
                        <input
                          value={
                            previousKm
                          }
                          readOnly
                          className={`${inputClass} cursor-not-allowed opacity-70`}
                        />
                      </Field>

                      <Field label="KM atual">
                        <input
                          type="number"
                          min={
                            previousKm
                          }
                          step="1"
                          value={
                            form.currentKm
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              'currentKm',
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="KM atual"
                          className={
                            inputClass
                          }
                          required
                        />
                      </Field>

                      <Field label="Litros abastecidos">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            form.liters
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              'liters',
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="0,00"
                          className={
                            inputClass
                          }
                          required
                        />
                      </Field>

                      <Field label="Valor total (R$)">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            form.totalAmount
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              'totalAmount',
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="0,00"
                          className={
                            inputClass
                          }
                          required
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

                    <div className="mb-5 flex items-center gap-3">

                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">
                        <Calculator className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-semibold text-white">
                          Resumo calculado
                        </h2>

                        <p className="text-xs text-zinc-500">
                          Valores calculados antes do registro.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                      <Metric
                        label="Distância"
                        value={`${distance.toLocaleString(
                          'pt-BR'
                        )} km`}
                      />

                      <Metric
                        label="Preço/L"
                        value={
                          pricePerLiter >
                          0
                            ? formatCurrency(
                                pricePerLiter
                              )
                            : '--'
                        }
                      />

                      <Metric
                        label="Consumo"
                        value={
                          kmPerLiter >
                          0
                            ? `${kmPerLiter.toFixed(
                                2
                              )} km/L`
                            : '--'
                        }
                      />

                      <Metric
                        label="Custo/km"
                        value={
                          costPerKm >
                          0
                            ? formatCurrency(
                                costPerKm
                              )
                            : '--'
                        }
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex items-center gap-3">

                        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-400">
                          <History className="h-5 w-5" />
                        </div>

                        <div>
                          <h2 className="font-semibold text-white">
                            Média histórica
                          </h2>

                          <p className="text-xs text-zinc-500">
                            {vehicle.plate}{' '}
                            •{' '}
                            {
                              form.fuelType
                            }
                          </p>
                        </div>
                      </div>

                      {loadingStats && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Atualizando
                        </div>
                      )}
                    </div>

                    {!loadingStats &&
                    !stats ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-5">
                        <p className="text-sm font-medium text-zinc-300">
                          Ainda não existe histórico suficiente para{' '}
                          {
                            form.fuelType
                          }.
                        </p>

                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          Após os abastecimentos serem registrados,
                          o FrotaPro criará automaticamente
                          a média deste veículo para este combustível.
                        </p>
                      </div>
                    ) : (
                      stats && (
                        <>
                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                            <Metric
                              label="Média histórica"
                              value={
                                stats.average_km_per_liter >
                                0
                                  ? `${stats.average_km_per_liter.toFixed(
                                      2
                                    )} km/L`
                                  : '--'
                              }
                            />

                            <Metric
                              label="Custo médio/km"
                              value={
                                stats.average_cost_per_km >
                                0
                                  ? formatCurrency(
                                      stats.average_cost_per_km
                                    )
                                  : '--'
                              }
                            />

                            <Metric
                              label="Abastecimentos"
                              value={String(
                                stats.valid_records
                              )}
                            />

                            <Metric
                              label="KM analisados"
                              value={`${stats.total_distance_km.toLocaleString(
                                'pt-BR'
                              )} km`}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                            <SmallMetric
                              label="Litros no histórico"
                              value={`${formatNumber(
                                stats.total_liters,
                                2
                              )} L`}
                            />

                            <SmallMetric
                              label="Valor acumulado"
                              value={formatCurrency(
                                stats.total_amount
                              )}
                            />

                            <SmallMetric
                              label="Último abastecimento"
                              value={
                                stats.last_fuel_at
                                  ? formatDate(
                                      stats.last_fuel_at
                                    )
                                  : '--'
                              }
                            />
                          </div>
                        </>
                      )
                    )}
                  </section>

                  {consumptionDifference !==
                    null && (
                    <ConsumptionComparison
                      current={
                        kmPerLiter
                      }
                      historical={
                        historicalAverage
                      }
                      difference={
                        consumptionDifference
                      }
                      records={
                        stats?.valid_records ??
                        0
                      }
                    />
                  )}

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-64"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Fuel className="h-5 w-5" />
                        Registrar abastecimento
                      </>
                    )}
                  </button>
                </form>
              )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>

      {children}
    </label>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-zinc-100 sm:text-base">
        {value}
      </p>
    </div>
  )
}

function SmallMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-zinc-200">
        {value}
      </p>
    </div>
  )
}

function ConsumptionComparison({
  current,
  historical,
  difference,
  records,
}: {
  current: number
  historical: number
  difference: number
  records: number
}) {
  const isAbove =
    difference >= 0

  const differenceValue =
    Math.abs(difference)

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

      <div className="mb-5 flex items-center gap-3">

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-400">
          <Activity className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold text-white">
            Comparação de consumo
          </h2>

          <p className="text-xs text-zinc-500">
            Abastecimento atual comparado ao histórico do próprio veículo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-500">
            Consumo atual
          </p>

          <p className="mt-2 text-xl font-bold text-white">
            {current.toFixed(
              2
            )}{' '}
            km/L
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-500">
            Média histórica
          </p>

          <p className="mt-2 text-xl font-bold text-white">
            {historical.toFixed(
              2
            )}{' '}
            km/L
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            isAbove
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : 'border-amber-500/20 bg-amber-500/10'
          }`}
        >
          <div className="flex items-center gap-2">

            {isAbove ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-400" />
            )}

            <p
              className={`text-xs ${
                isAbove
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              Comparação
            </p>
          </div>

          <p
            className={`mt-2 text-xl font-bold ${
              isAbove
                ? 'text-emerald-300'
                : 'text-amber-300'
            }`}
          >
            {isAbove
              ? '+'
              : '-'}
            {differenceValue.toFixed(
              1
            )}
            %
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Comparação baseada em{' '}
        {records}{' '}
        abastecimento
        {records === 1
          ? ''
          : 's'}{' '}
        válido
        {records === 1
          ? ''
          : 's'}{' '}
        deste veículo com o mesmo combustível.
      </p>
    </section>
  )
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(
    Number.isFinite(value)
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
    Number.isFinite(value)
      ? value
      : 0
  )
}

function formatDate(
  value: string
) {
  const date =
    new Date(value)

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
      dateStyle: 'short',
      timeStyle: 'short',
    }
  ).format(date)
}

const inputClass =
  'h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
