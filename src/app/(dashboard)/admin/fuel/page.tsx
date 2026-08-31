'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Building2,
  Droplets,
  Fuel,
  Gauge,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

type FuelRecord = {
  id: string
  motorista: string
  driver_email: string | null
  vehicle_model: string
  vehicle_plate: string
  fuel_type: string
  previous_km: number | null
  current_km: number | null
  liters: number | null
  submitted_at: string | null
  user_id: string | null
  branch_id: string | null
  vehicle_id: string | null
  driver_id: string | null
  total_amount: number | null
  price_per_liter: number | null
  fuel_station: string | null
  created_at: string
  updated_at: string
}

type BranchState = {
  name: string
  uf: string
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
  states: BranchState | BranchState[] | null
}

// =====================================================
// AUXILIARES
// =====================================================

function getState(
  branch: BranchRow | null
): BranchState | null {
  if (!branch?.states) {
    return null
  }

  if (Array.isArray(branch.states)) {
    return branch.states[0] ?? null
  }

  return branch.states
}

function calculateDistance(
  previousKm: number | null,
  currentKm: number | null
) {
  if (
    previousKm == null ||
    currentKm == null
  ) {
    return null
  }

  if (currentKm < previousKm) {
    return null
  }

  return currentKm - previousKm
}

function calculateConsumption(
  distance: number | null,
  liters: number | null
) {
  if (
    distance == null ||
    liters == null ||
    liters <= 0
  ) {
    return null
  }

  return distance / liters
}

// =====================================================
// PÁGINA
// =====================================================

export default function AdminFuelPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [records, setRecords] =
    useState<FuelRecord[]>([])

  const [branches, setBranches] =
    useState<BranchRow[]>([])

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData =
    useCallback(async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [
          fuelResponse,
          branchResponse,
        ] = await Promise.all([
          supabase
            .from('fuel_records')
            .select(`
              id,
              motorista,
              driver_email,
              vehicle_model,
              vehicle_plate,
              fuel_type,
              previous_km,
              current_km,
              liters,
              submitted_at,
              user_id,
              branch_id,
              vehicle_id,
              driver_id,
              total_amount,
              price_per_liter,
              fuel_station,
              created_at,
              updated_at
            `)
            .order(
              'created_at',
              {
                ascending: false,
              }
            ),

          supabase
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
            .order('name'),
        ])

        if (fuelResponse.error) {
          throw fuelResponse.error
        }

        if (branchResponse.error) {
          throw branchResponse.error
        }

        setRecords(
          (fuelResponse.data ??
            []) as FuelRecord[]
        )

        setBranches(
          (branchResponse.data ??
            []) as BranchRow[]
        )
      } catch (error) {
        console.error(
          'Erro ao carregar abastecimentos:',
          error
        )

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os abastecimentos.'
        )
      } finally {
        setLoading(false)
      }
    }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // =====================================================
  // MAPA DE BASES
  // =====================================================

  const branchMap =
    useMemo(() => {
      return new Map(
        branches.map(
          (branch) => [
            branch.id,
            branch,
          ]
        )
      )
    }, [branches])

  // =====================================================
  // FILTRO
  // =====================================================

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      if (!query) {
        return records
      }

      return records.filter(
        (record) => {
          const branch =
            record.branch_id
              ? branchMap.get(
                  record.branch_id
                ) ?? null
              : null

          const state =
            getState(branch)

          const values = [
            record.motorista,
            record.driver_email,
            record.vehicle_model,
            record.vehicle_plate,
            record.fuel_type,
            record.fuel_station,
            branch?.name,
            branch?.code,
            branch?.city,
            state?.name,
            state?.uf,
          ]

          return values
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
            )
        }
      )
    }, [
      branchMap,
      records,
      search,
    ])

  // =====================================================
  // INDICADORES
  // =====================================================

  const totalLiters =
    records.reduce(
      (total, record) =>
        total +
        Number(
          record.liters ?? 0
        ),
      0
    )

  const totalAmount =
    records.reduce(
      (total, record) =>
        total +
        Number(
          record.total_amount ?? 0
        ),
      0
    )

  const priceRecords =
    records.filter(
      (record) =>
        record.price_per_liter !=
        null
    )

  const averagePrice =
    totalLiters > 0 &&
    totalAmount > 0
      ? totalAmount / totalLiters
      : priceRecords.length > 0
        ? priceRecords.reduce(
            (total, record) =>
              total +
              Number(
                record.price_per_liter ??
                  0
              ),
            0
          ) / priceRecords.length
        : 0

  const totalDistance =
    records.reduce(
      (total, record) => {
        const distance =
          calculateDistance(
            record.previous_km,
            record.current_km
          )

        return (
          total +
          (distance ?? 0)
        )
      },
      0
    )

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* CABEÇALHO */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div className="flex items-start gap-3">

            <Link
              href="/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>

              <p className="text-sm font-medium text-blue-400">
                Administração global
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Abastecimentos
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Acompanhe os abastecimentos,
                custos, consumo e
                quilometragem de toda a
                frota.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* INDICADORES */}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">

          <StatCard
            label="Abastecimentos"
            value={String(
              records.length
            )}
            icon={Fuel}
          />

          <StatCard
            label="Total gasto"
            value={formatCurrency(
              totalAmount
            )}
            icon={WalletCards}
          />

          <StatCard
            label="Litros"
            value={`${formatNumber(
              totalLiters
            )} L`}
            icon={Droplets}
          />

          <StatCard
            label="Preço médio"
            value={`${formatCurrency(
              averagePrice
            )}/L`}
            icon={Fuel}
          />

          <StatCard
            label="KM percorrido"
            value={`${formatNumber(
              totalDistance
            )} km`}
            icon={Gauge}
          />

        </section>

        {/* INFORMAÇÃO */}

        <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

          <div className="flex items-start gap-3">

            <Fuel className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

            <div>

              <p className="text-sm font-semibold text-blue-400">
                Controle financeiro e operacional
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Acompanhe gastos com
                combustível por veículo,
                motorista, posto e unidade,
                além do consumo estimado
                da frota.
              </p>

            </div>

          </div>

        </section>

        {/* BUSCA */}

        <section className="relative">

          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar motorista, placa, veículo, posto, base, cidade ou estado..."
            className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

        </section>

        {/* ERRO */}

        {errorMessage && (
          <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">

            <p className="text-sm font-semibold text-red-400">
              Erro ao carregar abastecimentos
            </p>

            <p className="mt-1 text-xs text-red-300/80">
              {errorMessage}
            </p>

          </section>
        )}

        {/* CONTEÚDO */}

        {loading ? (

          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">

            <div className="flex flex-col items-center gap-3">

              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />

              <p className="text-sm text-zinc-500">
                Carregando abastecimentos...
              </p>

            </div>

          </div>

        ) : filteredRecords.length ===
          0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">

            <Fuel className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-4 font-medium text-zinc-300">
              Nenhum abastecimento encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Ainda não existem registros
              para os filtros selecionados.
            </p>

          </div>

        ) : (

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">

            {filteredRecords.map(
              (record) => {
                const branch =
                  record.branch_id
                    ? branchMap.get(
                        record.branch_id
                      ) ?? null
                    : null

                const state =
                  getState(branch)

                const distance =
                  calculateDistance(
                    record.previous_km,
                    record.current_km
                  )

                const consumption =
                  calculateConsumption(
                    distance,
                    record.liters
                  )

                return (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 sm:p-6"
                  >

                    {/* VEÍCULO */}

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex min-w-0 items-start gap-3">

                        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                          <Fuel className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">

                          <p className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                            {record.vehicle_plate}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {record.vehicle_model}
                          </p>

                        </div>

                      </div>

                      <FuelBadge
                        fuelType={
                          record.fuel_type
                        }
                      />

                    </div>

                    {/* MOTORISTA E LOCAL */}

                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-5 sm:grid-cols-2 lg:grid-cols-3">

                      <Info
                        icon={UserRound}
                        label="Motorista"
                        value={
                          record.motorista ||
                          'Não informado'
                        }
                      />

                      <Info
                        icon={Building2}
                        label="Base"
                        value={
                          branch
                            ? `${branch.name} • ${branch.code}`
                            : 'Sem base'
                        }
                      />

                      <Info
                        icon={MapPin}
                        label="Cidade / Estado"
                        value={
                          branch
                            ? `${branch.city}${
                                state?.uf
                                  ? ` - ${state.uf}`
                                  : ''
                              }`
                            : 'Não informado'
                        }
                      />

                    </div>

                    {/* FINANCEIRO */}

                    <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:grid-cols-2">

                      <Info
                        icon={Droplets}
                        label="Litros"
                        value={
                          record.liters !=
                          null
                            ? `${formatNumber(
                                record.liters
                              )} L`
                            : 'Não informado'
                        }
                      />

                      <Info
                        icon={WalletCards}
                        label="Valor total"
                        value={
                          record.total_amount !=
                          null
                            ? formatCurrency(
                                record.total_amount
                              )
                            : 'Não informado'
                        }
                      />

                      <Info
                        icon={Fuel}
                        label="Preço por litro"
                        value={
                          record.price_per_liter !=
                          null
                            ? `${formatCurrency(
                                record.price_per_liter
                              )}/L`
                            : 'Não informado'
                        }
                      />

                      <Info
                        icon={Building2}
                        label="Posto"
                        value={
                          record.fuel_station ||
                          'Não informado'
                        }
                      />

                    </div>

                    {/* QUILOMETRAGEM */}

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">

                      <MetricBox
                        label="KM anterior"
                        value={
                          record.previous_km !=
                          null
                            ? `${record.previous_km.toLocaleString(
                                'pt-BR'
                              )} km`
                            : 'Não informado'
                        }
                      />

                      <MetricBox
                        label="KM atual"
                        value={
                          record.current_km !=
                          null
                            ? `${record.current_km.toLocaleString(
                                'pt-BR'
                              )} km`
                            : 'Não informado'
                        }
                      />

                      <MetricBox
                        label="KM percorrido"
                        value={
                          distance != null
                            ? `${distance.toLocaleString(
                                'pt-BR'
                              )} km`
                            : 'Não calculado'
                        }
                      />

                    </div>

                    {/* CONSUMO */}

                    <div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
                            Consumo estimado
                          </p>

                          <p className="mt-1 text-xl font-bold text-white">

                            {consumption !=
                            null
                              ? `${formatNumber(
                                  consumption
                                )} km/L`
                              : 'Não calculado'}

                          </p>

                        </div>

                        <Gauge className="h-6 w-6 text-emerald-500" />

                      </div>

                    </div>

                    {/* DATA */}

                    <div className="mt-4 flex flex-col gap-1 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">

                      <span className="text-xs text-zinc-600">
                        Registrado em
                      </span>

                      <span className="text-xs font-medium text-zinc-400">
                        {formatDate(
                          record.submitted_at ??
                            record.created_at
                        )}
                      </span>

                    </div>

                  </article>
                )
              }
            )}

          </section>

        )}

      </div>
    </AppShell>
  )
}

// =====================================================
// COMPONENTES
// =====================================================

type IconType =
  ComponentType<{
    className?: string
  }>

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: IconType
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>

          <p className="mt-2 wrap-break-word text-2xl font-bold text-white sm:text-3xl">
            {value}
          </p>

        </div>

        <div className="shrink-0 rounded-xl bg-blue-500/10 p-3 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>

      </div>

    </article>
  )
}

function Info({
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

        <p className="mt-1 wrap-break-word text-sm font-medium text-zinc-300">
          {value}
        </p>

      </div>

    </div>
  )
}

function MetricBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">

      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-zinc-200">
        {value}
      </p>

    </div>
  )
}

function FuelBadge({
  fuelType,
}: {
  fuelType: string
}) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
      {fuelType ||
        'Não informado'}
    </span>
  )
}

// =====================================================
// FORMATADORES
// =====================================================

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(value)
}

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      maximumFractionDigits: 2,
    }
  ).format(value)
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
    return 'Data não informada'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  ).format(date)
}