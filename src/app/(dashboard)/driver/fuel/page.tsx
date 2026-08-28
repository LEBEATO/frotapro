'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  Car,
  CheckCircle2,
  Fuel,
  Loader2,
  MapPin,
  TriangleAlert,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type DriverProfile = {
  id: string
  full_name: string
  email: string
  branch_id: string | null
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

const initialForm: FuelForm = {
  fuelType: 'Gasolina',
  currentKm: '',
  liters: '',
  totalAmount: '',
  fuelStation: '',
}

function parseNumber(value: string): number {
  return Number(value.replace(',', '.'))
}

export default function DriverFuelPage() {
  const supabase = createClient()

  const [profile, setProfile] =
    useState<DriverProfile | null>(null)

  const [vehicle, setVehicle] =
    useState<AssignedVehicle | null>(null)

  const [form, setForm] =
    useState<FuelForm>(initialForm)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

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
            'id, full_name, email, branch_id'
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

        if (!mounted) return

        setProfile(profileData)

        // Primeiro tenta a nova estrutura de atribuições.
        const {
          data: assignment,
        } = await supabase
          .from('driver_vehicle_assignments')
          .select('vehicle_id')
          .eq('driver_id', user.id)
          .is('ended_at', null)
          .maybeSingle()

        let vehicleData: AssignedVehicle | null = null

        if (assignment?.vehicle_id) {
          const {
            data,
            error: vehicleError,
          } = await supabase
            .from('vehicles')
            .select(
              'id, model, plate, mileage, current_branch_id'
            )
            .eq('id', assignment.vehicle_id)
            .maybeSingle()

          if (!vehicleError) {
            vehicleData = data
          }
        }

        // Compatibilidade temporária com veículos antigos.
        if (!vehicleData) {
          const {
            data,
            error: fallbackError,
          } = await supabase
            .from('vehicles')
            .select(
              'id, model, plate, mileage, current_branch_id'
            )
            .eq('driver_id', user.id)
            .maybeSingle()

          if (!fallbackError) {
            vehicleData = data
          }
        }

        if (!mounted) return

        if (!vehicleData) {
          throw new Error(
            'Nenhum veículo está atribuído ao seu usuário.'
          )
        }

        setVehicle(vehicleData)

        setForm((current) => ({
          ...current,
          currentKm:
            vehicleData?.mileage != null
              ? String(vehicleData.mileage)
              : '',
        }))
      } catch (err: unknown) {
        if (!mounted) return
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

    loadDriverData()

    return () => {
      mounted = false
    }
  }, [supabase])

  const previousKm =
    vehicle?.mileage ?? 0

  const currentKm =
    parseNumber(form.currentKm || '0')

  const liters =
    parseNumber(form.liters || '0')

  const totalAmount =
    parseNumber(form.totalAmount || '0')

  const distance =
    currentKm >= previousKm
      ? currentKm - previousKm
      : 0

  const pricePerLiter =
    liters > 0
      ? totalAmount / liters
      : 0

  const kmPerLiter =
    liters > 0 && distance > 0
      ? distance / liters
      : 0

  const costPerKm =
    distance > 0
      ? totalAmount / distance
      : 0

  const branchId = useMemo(
    () =>
      profile?.branch_id ??
      vehicle?.current_branch_id ??
      null,
    [
      profile?.branch_id,
      vehicle?.current_branch_id,
    ]
  )

  function updateField(
    field: keyof FuelForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      saving ||
      !profile ||
      !vehicle
    ) {
      return
    }

    setError('')
    setSuccess('')

    if (!branchId) {
      setError(
        'Seu motorista ou veículo ainda não está vinculado a uma base.'
      )
      return
    }

    if (
      currentKm < previousKm
    ) {
      setError(
        'A quilometragem atual não pode ser menor que a anterior.'
      )
      return
    }

    if (liters <= 0) {
      setError(
        'Informe uma quantidade válida de litros.'
      )
      return
    }

    if (totalAmount < 0) {
      setError(
        'Informe um valor válido para o abastecimento.'
      )
      return
    }

    if (!form.fuelStation.trim()) {
      setError(
        'Informe o posto de combustível.'
      )
      return
    }

    try {
      setSaving(true)

      const recordId =
        crypto.randomUUID()

      const {
        error: insertError,
      } = await supabase
        .from('fuel_records')
        .insert({
          id: recordId,

          user_id: profile.id,
          driver_id: profile.id,

          driver: profile.full_name,
          driver_email: profile.email,

          branch_id: branchId,

          vehicle_id: vehicle.id,
          vehicle_model: vehicle.model,
          vehicle_plate:
            vehicle.plate.toUpperCase(),

          fuel_type: form.fuelType,

          previous_km: previousKm,
          current_km: currentKm,

          liters,
          total_amount: totalAmount,
          price_per_liter:
            Number(
              pricePerLiter.toFixed(3)
            ),

          fuel_station:
            form.fuelStation.trim(),
        })

      if (insertError) {
        throw insertError
      }

      const {
        error: vehicleError,
      } = await supabase
        .from('vehicles')
        .update({
          mileage: currentKm,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (vehicleError) {
        console.error(
          'Abastecimento registrado, mas houve erro ao atualizar KM:',
          vehicleError
        )
      }

      setVehicle((current) =>
        current
          ? {
              ...current,
              mileage: currentKm,
            }
          : current
      )

      setForm({
        ...initialForm,
        fuelType: form.fuelType,
        currentKm:
          String(currentKm),
      })

      setSuccess(
        'Abastecimento registrado com sucesso.'
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
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl space-y-6">

        <section>
          <p className="text-sm font-medium text-blue-400">
            Operação do motorista
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Registrar abastecimento
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Informe os dados do abastecimento para manter o consumo e os custos da frota atualizados.
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
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                {success}
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
                        Placa {vehicle.plate}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-950/70 px-4 py-3">
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

            {vehicle && profile && (
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <Fuel className="h-5 w-5 text-blue-400" />

                    <div>
                      <h2 className="font-semibold text-white">
                        Dados do abastecimento
                      </h2>

                      <p className="text-xs text-zinc-500">
                        Todos os valores devem corresponder ao comprovante do posto.
                      </p>
                    </div>
                  </div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label="Combustível"
                    >
                      <select
                        value={
                          form.fuelType
                        }
                        onChange={(e) =>
                          updateField(
                            'fuelType',
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option>
                          Gasolina
                        </option>
                        <option>
                          Etanol
                        </option>
                        <option>
                          Diesel
                        </option>
                        <option>
                          Diesel S10
                        </option>
                      </select>
                    </Field>

                    <Field label="Posto">
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                        <input
                          value={
                            form.fuelStation
                          }
                          onChange={(e) =>
                            updateField(
                              'fuelStation',
                              e.target.value
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
                        onChange={(e) =>
                          updateField(
                            'currentKm',
                            e.target.value
                          )
                        }
                        className={inputClass}
                        required
                      />
                    </Field>

                    <Field label="Litros">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          form.liters
                        }
                        onChange={(e) =>
                          updateField(
                            'liters',
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        className={inputClass}
                        required
                      />
                    </Field>

                    <Field label="Valor total (R$)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.totalAmount}
                        onChange={(e) =>
                          updateField(
                            'totalAmount',
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        className={inputClass}
                        required
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-400" />

                    <h2 className="font-semibold text-white">
                      Resumo calculado
                    </h2>
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
                      value={formatCurrency(
                        pricePerLiter
                      )}
                    />

                    <Metric
                      label="Consumo"
                      value={
                        kmPerLiter > 0
                          ? `${kmPerLiter.toFixed(
                              2
                            )} km/L`
                          : '--'
                      }
                    />

                    <Metric
                      label="Custo/km"
                      value={
                        costPerKm > 0
                          ? formatCurrency(
                              costPerKm
                            )
                          : '--'
                      }
                    />
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-56"
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
  children: React.ReactNode
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

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(value || 0)
}

const inputClass =
  'h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'