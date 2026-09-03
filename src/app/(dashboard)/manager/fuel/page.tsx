'use client'

import Link from 'next/link'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react'

import {
  Activity,
  ArrowLeft,
  Building2,
  Car,
  Droplets,
  Fuel,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
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

  driver: string
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

  distance_km: number | null
  km_per_liter: number | null
  cost_per_km: number | null

  created_at: string
  updated_at: string
}

type ManagerProfile = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type StateData = {
  name: string
  uf: string
}

type BranchData = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
  states: StateData | StateData[] | null
}

type VehicleFuelStat = {
  key: string

  vehicleId: string | null
  vehicleModel: string
  vehiclePlate: string

  fuelType: string

  records: number

  averageKmPerLiter: number
  averageCostPerKm: number
  averagePricePerLiter: number

  totalDistance: number
  totalLiters: number
  totalAmount: number

  lastFuelAt: string | null

  latestKmPerLiter: number
  differencePercent: number | null
}

type IconType = ComponentType<{
  className?: string
}>

// =====================================================
// AUXILIARES
// =====================================================

function getState(
  branch: BranchData | null
): StateData | null {
  if (!branch?.states) {
    return null
  }

  if (Array.isArray(branch.states)) {
    return branch.states[0] ?? null
  }

  return branch.states
}

function calculateDistance(
  record: FuelRecord
) {
  if (
    record.distance_km != null &&
    Number(record.distance_km) > 0
  ) {
    return Number(record.distance_km)
  }

  if (
    record.previous_km == null ||
    record.current_km == null
  ) {
    return 0
  }

  const distance =
    Number(record.current_km) -
    Number(record.previous_km)

  return distance > 0
    ? distance
    : 0
}

function calculateConsumption(
  record: FuelRecord
) {
  if (
    record.km_per_liter != null &&
    Number(record.km_per_liter) > 0
  ) {
    return Number(record.km_per_liter)
  }

  const distance =
    calculateDistance(record)

  const liters =
    Number(record.liters ?? 0)

  if (
    distance <= 0 ||
    liters <= 0
  ) {
    return 0
  }

  return distance / liters
}

function calculateCostPerKm(
  record: FuelRecord
) {
  if (
    record.cost_per_km != null &&
    Number(record.cost_per_km) > 0
  ) {
    return Number(record.cost_per_km)
  }

  const distance =
    calculateDistance(record)

  const amount =
    Number(record.total_amount ?? 0)

  if (
    distance <= 0 ||
    amount <= 0
  ) {
    return 0
  }

  return amount / distance
}

function getRecordDate(
  record: FuelRecord
) {
  return (
    record.submitted_at ??
    record.created_at
  )
}

function getRecordTimestamp(
  record: FuelRecord
) {
  const value =
    getRecordDate(record)

  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? 0
    : timestamp
}

// =====================================================
// PÁGINA
// =====================================================

export default function ManagerFuelPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [profile, setProfile] =
    useState<ManagerProfile | null>(
      null
    )

  const [branch, setBranch] =
    useState<BranchData | null>(
      null
    )

  const [records, setRecords] =
    useState<FuelRecord[]>([])

  const [search, setSearch] =
    useState('')

  const [fuelFilter, setFuelFilter] =
    useState('Todos')

  const [
    selectedVehicleKey,
    setSelectedVehicleKey,
  ] = useState<string | null>(
    null
  )

  const [loading, setLoading] =
    useState(true)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  const loadData =
    useCallback(async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          throw new Error(
            'Usuário não autenticado.'
          )
        }

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
          .eq('id', user.id)
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

        const [
          branchResponse,
          fuelResponse,
        ] = await Promise.all([
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
            .eq(
              'id',
              branchId
            )
            .maybeSingle(),

          supabase
            .from('fuel_records')
            .select(`
              id,
              driver,
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
              distance_km,
              km_per_liter,
              cost_per_km,
              created_at,
              updated_at
            `)
            .eq(
              'branch_id',
              branchId
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            ),
        ])

        if (
          branchResponse.error
        ) {
          throw branchResponse.error
        }

        if (
          !branchResponse.data
        ) {
          throw new Error(
            'Base do gestor não encontrada.'
          )
        }

        if (
          fuelResponse.error
        ) {
          throw fuelResponse.error
        }

        setBranch(
          branchResponse.data as BranchData
        )

        setRecords(
          (
            fuelResponse.data ??
            []
          ) as FuelRecord[]
        )
      } catch (error) {
        console.error(
          'Erro ao carregar abastecimentos da base:',
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
  // ESTADO
  // =====================================================

  const state = useMemo(
    () => getState(branch),
    [branch]
  )

  // =====================================================
  // TIPOS DE COMBUSTÍVEL
  // =====================================================

  const fuelTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          records
            .map(
              (record) =>
                record.fuel_type
            )
            .filter(Boolean)
        )
      ).sort()
    }, [records])

  // =====================================================
  // FILTROS
  // =====================================================

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return records.filter(
        (record) => {
          const matchesFuel =
            fuelFilter ===
              'Todos' ||
            record.fuel_type ===
              fuelFilter

          if (!matchesFuel) {
            return false
          }

          if (!query) {
            return true
          }

          const values = [
            record.driver,
            record.driver_email,
            record.vehicle_model,
            record.vehicle_plate,
            record.fuel_type,
            record.fuel_station,
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
      records,
      search,
      fuelFilter,
    ])

  // =====================================================
  // INDICADORES
  // =====================================================

  const totalLiters =
    records.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.liters ??
            0
        ),
      0
    )

  const totalAmount =
    records.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.total_amount ??
            0
        ),
      0
    )

  const totalDistance =
    records.reduce(
      (
        total,
        record
      ) =>
        total +
        calculateDistance(
          record
        ),
      0
    )

  const averagePrice =
    totalLiters > 0
      ? totalAmount /
        totalLiters
      : 0

  const validConsumptionRecords =
    records.filter(
      (record) =>
        calculateConsumption(
          record
        ) > 0
    )

  const averageConsumption =
    validConsumptionRecords.length >
    0
      ? validConsumptionRecords.reduce(
          (
            total,
            record
          ) =>
            total +
            calculateConsumption(
              record
            ),
          0
        ) /
        validConsumptionRecords.length
      : 0

  const uniqueVehicles =
    new Set(
      records
        .map(
          (record) =>
            record.vehicle_id ??
            record.vehicle_plate
        )
        .filter(Boolean)
    ).size

  // =====================================================
  // MÉDIA POR VEÍCULO + COMBUSTÍVEL
  // =====================================================

  const vehicleFuelStats =
    useMemo(() => {
      const grouped =
        new Map<
          string,
          FuelRecord[]
        >()

      for (
        const record of records
      ) {
        const vehicleKey =
          record.vehicle_id ??
          record.vehicle_plate

        if (!vehicleKey) {
          continue
        }

        const key =
          `${vehicleKey}::${record.fuel_type}`

        const current =
          grouped.get(key) ??
          []

        current.push(record)

        grouped.set(
          key,
          current
        )
      }

      const result:
        VehicleFuelStat[] = []

      for (
        const [
          key,
          groupRecords,
        ] of grouped.entries()
      ) {
        const sorted =
          [...groupRecords].sort(
            (a, b) =>
              getRecordTimestamp(
                b
              ) -
              getRecordTimestamp(
                a
              )
          )

        const first =
          sorted[0]

        if (!first) {
          continue
        }

        const validRecords =
          sorted.filter(
            (record) =>
              calculateConsumption(
                record
              ) > 0
          )

        const totalGroupLiters =
          validRecords.reduce(
            (
              total,
              record
            ) =>
              total +
              Number(
                record.liters ??
                  0
              ),
            0
          )

        const totalGroupAmount =
          validRecords.reduce(
            (
              total,
              record
            ) =>
              total +
              Number(
                record.total_amount ??
                  0
              ),
            0
          )

        const totalGroupDistance =
          validRecords.reduce(
            (
              total,
              record
            ) =>
              total +
              calculateDistance(
                record
              ),
            0
          )

        const averageKmPerLiter =
          validRecords.length >
          0
            ? validRecords.reduce(
                (
                  total,
                  record
                ) =>
                  total +
                  calculateConsumption(
                    record
                  ),
                0
              ) /
              validRecords.length
            : 0

        const costRecords =
          validRecords.filter(
            (record) =>
              calculateCostPerKm(
                record
              ) > 0
          )

        const averageCostPerKm =
          costRecords.length >
          0
            ? costRecords.reduce(
                (
                  total,
                  record
                ) =>
                  total +
                  calculateCostPerKm(
                    record
                  ),
                0
              ) /
              costRecords.length
            : 0

        const averagePricePerLiter =
          totalGroupLiters > 0
            ? totalGroupAmount /
              totalGroupLiters
            : 0

        const latestConsumption =
          validRecords.length >
          0
            ? calculateConsumption(
                validRecords[0]
              )
            : 0

        let historicalWithoutLatest =
          0

        if (
          validRecords.length >
          1
        ) {
          const previous =
            validRecords.slice(1)

          historicalWithoutLatest =
            previous.reduce(
              (
                total,
                record
              ) =>
                total +
                calculateConsumption(
                  record
                ),
              0
            ) /
            previous.length
        }

        const differencePercent =
          latestConsumption >
            0 &&
          historicalWithoutLatest >
            0
            ? ((
                latestConsumption -
                historicalWithoutLatest
              ) /
                historicalWithoutLatest) *
              100
            : null

        result.push({
          key,

          vehicleId:
            first.vehicle_id,

          vehicleModel:
            first.vehicle_model,

          vehiclePlate:
            first.vehicle_plate,

          fuelType:
            first.fuel_type,

          records:
            validRecords.length,

          averageKmPerLiter,

          averageCostPerKm,

          averagePricePerLiter,

          totalDistance:
            totalGroupDistance,

          totalLiters:
            totalGroupLiters,

          totalAmount:
            totalGroupAmount,

          lastFuelAt:
            getRecordDate(
              first
            ),

          latestKmPerLiter:
            latestConsumption,

          differencePercent,
        })
      }

      return result.sort(
        (a, b) => {
          const aTime =
            a.lastFuelAt
              ? new Date(
                  a.lastFuelAt
                ).getTime()
              : 0

          const bTime =
            b.lastFuelAt
              ? new Date(
                  b.lastFuelAt
                ).getTime()
              : 0

          return (
            bTime -
            aTime
          )
        }
      )
    }, [records])

  const filteredVehicleStats =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return vehicleFuelStats.filter(
        (stat) => {
          const matchesFuel =
            fuelFilter ===
              'Todos' ||
            stat.fuelType ===
              fuelFilter

          if (!matchesFuel) {
            return false
          }

          if (!query) {
            return true
          }

          return [
            stat.vehicleModel,
            stat.vehiclePlate,
            stat.fuelType,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query)
          )
        }
      )
    }, [
      vehicleFuelStats,
      search,
      fuelFilter,
    ])

  const selectedVehicle =
    useMemo(() => {
      if (
        !selectedVehicleKey
      ) {
        return null
      }

      return (
        vehicleFuelStats.find(
          (item) =>
            item.key ===
            selectedVehicleKey
        ) ?? null
      )
    }, [
      vehicleFuelStats,
      selectedVehicleKey,
    ])

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
              Carregando abastecimentos da base...
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

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">

            <h1 className="text-lg font-bold text-white">
              Não foi possível carregar os abastecimentos
            </h1>

            <p className="mt-2 text-sm text-red-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <RefreshCw className="h-4 w-4" />

              Tentar novamente
            </button>

          </div>

        </div>
      </AppShell>
    )
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div className="flex items-start gap-3">

            <Link
              href="/manager"
              aria-label="Voltar ao painel"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>

              <p className="text-sm font-semibold text-blue-400">
                Gestão da base
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Abastecimentos
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Acompanhe consumo, custos e a média histórica individual de cada veículo por combustível.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" />

            Atualizar
          </button>

        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">

          <div className="flex items-start gap-4">

            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Base responsável
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                {branch?.name ??
                  'Base não identificada'}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {branch?.city}

                {state?.uf
                  ? ` - ${state.uf}`
                  : ''}
              </p>

              {branch?.code && (
                <p className="mt-1 text-xs text-zinc-600">
                  Código da base:{' '}
                  {branch.code}
                </p>
              )}

              {profile && (
                <p className="mt-2 text-xs text-zinc-600">
                  Gestor:{' '}

                  <span className="text-zinc-400">
                    {profile.full_name}
                  </span>
                </p>
              )}

            </div>

          </div>

        </section>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">

          <StatCard
            label="Veículos"
            value={String(
              uniqueVehicles
            )}
            icon={Car}
          />

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
              totalLiters,
              2
            )} L`}
            icon={Droplets}
          />

          <StatCard
            label="Preço médio"
            value={
              averagePrice > 0
                ? `${formatCurrency(
                    averagePrice
                  )}/L`
                : '--'
            }
            icon={Fuel}
          />

          <StatCard
            label="Média geral"
            value={
              averageConsumption > 0
                ? `${averageConsumption.toFixed(
                    2
                  )} km/L`
                : '--'
            }
            icon={Gauge}
          />

        </section>

        <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

          <div className="flex items-start gap-3">

            <Activity className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

            <div>

              <p className="text-sm font-semibold text-blue-300">
                Média individual por veículo
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-400">
                O FrotaPro não mistura gasolina, etanol ou diesel. Cada veículo possui um histórico independente para cada combustível utilizado.
              </p>

            </div>

          </div>

        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">

            <div className="relative">

              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar veículo, placa, motorista, combustível ou posto..."
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

            </div>

            <select
              value={fuelFilter}
              onChange={(event) =>
                setFuelFilter(
                  event.target.value
                )
              }
              className="h-11 min-w-48 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Todos">
                Todos os combustíveis
              </option>

              {fuelTypes.map(
                (fuelType) => (
                  <option
                    key={fuelType}
                    value={fuelType}
                  >
                    {fuelType}
                  </option>
                )
              )}
            </select>

          </div>

        </section>

        <section className="space-y-4">

          <div className="flex items-center gap-3">

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-400">
              <History className="h-5 w-5" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Média histórica por veículo
              </h2>

              <p className="text-xs text-zinc-500">
                Cada combustível possui sua própria média.
              </p>

            </div>

          </div>

          {filteredVehicleStats.length ===
          0 ? (
            <EmptyState
              message="Nenhuma média histórica encontrada."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">

              {filteredVehicleStats.map(
                (stat) => (
                  <VehicleAverageCard
                    key={stat.key}
                    stat={stat}
                    onDetails={() =>
                      setSelectedVehicleKey(
                        stat.key
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </section>

        <section className="space-y-4">

          <div>

            <h2 className="text-lg font-bold text-white">
              Histórico de abastecimentos
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {filteredRecords.length}{' '}
              registro
              {filteredRecords.length ===
              1
                ? ''
                : 's'}
            </p>

          </div>

          {filteredRecords.length ===
          0 ? (
            <EmptyState
              message="Nenhum abastecimento encontrado."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="border-b border-zinc-800 bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500">

                    <tr>

                      <th className="px-5 py-4">
                        Data
                      </th>

                      <th className="px-5 py-4">
                        Motorista
                      </th>

                      <th className="px-5 py-4">
                        Veículo
                      </th>

                      <th className="px-5 py-4">
                        Combustível
                      </th>

                      <th className="px-5 py-4 text-right">
                        Distância
                      </th>

                      <th className="px-5 py-4 text-right">
                        Litros
                      </th>

                      <th className="px-5 py-4 text-right">
                        km/L
                      </th>

                      <th className="px-5 py-4 text-right">
                        Custo/km
                      </th>

                      <th className="px-5 py-4 text-right">
                        Total
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-zinc-800">

                    {filteredRecords.map(
                      (record) => {
                        const distance =
                          calculateDistance(
                            record
                          )

                        const consumption =
                          calculateConsumption(
                            record
                          )

                        const costPerKm =
                          calculateCostPerKm(
                            record
                          )

                        return (
                          <tr
                            key={record.id}
                            className="transition hover:bg-zinc-800/30"
                          >

                            <td className="whitespace-nowrap px-5 py-4 text-zinc-400">
                              {formatDate(
                                getRecordDate(
                                  record
                                )
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2">

                                <UserRound className="h-4 w-4 text-zinc-600" />

                                <div>

                                  <p className="font-medium text-zinc-200">
                                    {record.driver}
                                  </p>

                                  {record.driver_email && (
                                    <p className="mt-0.5 text-xs text-zinc-600">
                                      {
                                        record.driver_email
                                      }
                                    </p>
                                  )}

                                </div>

                              </div>

                            </td>

                            <td className="px-5 py-4">

                              <p className="font-medium text-zinc-200">
                                {
                                  record.vehicle_model
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-zinc-500">
                                {
                                  record.vehicle_plate
                                }
                              </p>

                            </td>

                            <td className="px-5 py-4">

                              <span className="inline-flex rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300">
                                {
                                  record.fuel_type
                                }
                              </span>

                            </td>

                            <td className="px-5 py-4 text-right text-zinc-300">
                              {distance > 0
                                ? `${formatNumber(
                                    distance,
                                    0
                                  )} km`
                                : '--'}
                            </td>

                            <td className="px-5 py-4 text-right text-zinc-300">
                              {record.liters !=
                              null
                                ? `${formatNumber(
                                    Number(
                                      record.liters
                                    ),
                                    2
                                  )} L`
                                : '--'}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-zinc-200">
                              {consumption >
                              0
                                ? `${consumption.toFixed(
                                    2
                                  )}`
                                : '--'}
                            </td>

                            <td className="px-5 py-4 text-right text-zinc-300">
                              {costPerKm >
                              0
                                ? formatCurrency(
                                    costPerKm
                                  )
                                : '--'}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-zinc-200">
                              {record.total_amount !=
                              null
                                ? formatCurrency(
                                    Number(
                                      record.total_amount
                                    )
                                  )
                                : '--'}
                            </td>

                          </tr>
                        )
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        </section>

      </div>

      {selectedVehicle && (
        <VehicleDetailsModal
          stat={selectedVehicle}
          onClose={() =>
            setSelectedVehicleKey(
              null
            )
          }
        />
      )}

    </AppShell>
  )
}

// =====================================================
// CARD DE MÉDIA
// =====================================================

function VehicleAverageCard({
  stat,
  onDetails,
}: {
  stat: VehicleFuelStat
  onDetails: () => void
}) {
  const difference =
    stat.differencePercent

  const isBetter =
    difference != null &&
    difference >= 0

  const isWorse =
    difference != null &&
    difference < 0

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <Car className="h-5 w-5" />
          </div>

          <div>

            <h3 className="font-semibold text-white">
              {stat.vehicleModel}
            </h3>

            <p className="mt-0.5 text-xs text-zinc-500">
              {stat.vehiclePlate}
            </p>

          </div>

        </div>

        <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300">
          {stat.fuelType}
        </span>

      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <Metric
          label="Média"
          value={
            stat.averageKmPerLiter >
            0
              ? `${stat.averageKmPerLiter.toFixed(
                  2
                )} km/L`
              : '--'
          }
        />

        <Metric
          label="Custo médio/km"
          value={
            stat.averageCostPerKm >
            0
              ? formatCurrency(
                  stat.averageCostPerKm
                )
              : '--'
          }
        />

        <Metric
          label="Litros"
          value={`${formatNumber(
            stat.totalLiters,
            2
          )} L`}
        />

        <Metric
          label="Total gasto"
          value={formatCurrency(
            stat.totalAmount
          )}
        />

      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">

        <div className="flex items-center justify-between gap-3">

          <div>

            <p className="text-xs text-zinc-500">
              Último consumo
            </p>

            <p className="mt-1 font-semibold text-zinc-200">
              {stat.latestKmPerLiter >
              0
                ? `${stat.latestKmPerLiter.toFixed(
                    2
                  )} km/L`
                : '--'}
            </p>

          </div>

          {difference != null && (
            <div
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                isBetter
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/10 text-amber-300'
              }`}
            >
              {isBetter ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}

              {isBetter
                ? '+'
                : '-'}
              {Math.abs(
                difference
              ).toFixed(1)}
              %
            </div>
          )}

        </div>

        {isWorse && (
          <p className="mt-3 text-xs leading-5 text-amber-300/80">
            O último abastecimento ficou abaixo do histórico anterior deste veículo com {stat.fuelType}.
          </p>
        )}

      </div>

      <div className="mt-4 flex items-center justify-between gap-3">

        <p className="text-xs text-zinc-600">
          {stat.records}{' '}
          abastecimento
          {stat.records === 1
            ? ''
            : 's'}{' '}
          válido
          {stat.records === 1
            ? ''
            : 's'}
        </p>

        <button
          type="button"
          onClick={onDetails}
          className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
        >
          Ver detalhes
        </button>

      </div>

    </article>
  )
}

// =====================================================
// MODAL
// =====================================================

function VehicleDetailsModal({
  stat,
  onClose,
}: {
  stat: VehicleFuelStat
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >

      <div
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-6"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-sm font-semibold text-blue-400">
              Histórico do veículo
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              {stat.vehicleModel}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {stat.vehiclePlate}{' '}
              •{' '}
              {stat.fuelType}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            Fechar
          </button>

        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">

          <Metric
            label="Média km/L"
            value={
              stat.averageKmPerLiter >
              0
                ? `${stat.averageKmPerLiter.toFixed(
                    2
                  )} km/L`
                : '--'
            }
          />

          <Metric
            label="Custo/km"
            value={
              stat.averageCostPerKm >
              0
                ? formatCurrency(
                    stat.averageCostPerKm
                  )
                : '--'
            }
          />

          <Metric
            label="Preço médio/L"
            value={
              stat.averagePricePerLiter >
              0
                ? formatCurrency(
                    stat.averagePricePerLiter
                  )
                : '--'
            }
          />

          <Metric
            label="Registros"
            value={String(
              stat.records
            )}
          />

          <Metric
            label="Distância"
            value={`${formatNumber(
              stat.totalDistance,
              0
            )} km`}
          />

          <Metric
            label="Litros"
            value={`${formatNumber(
              stat.totalLiters,
              2
            )} L`}
          />

          <Metric
            label="Total gasto"
            value={formatCurrency(
              stat.totalAmount
            )}
          />

          <Metric
            label="Último abastecimento"
            value={
              stat.lastFuelAt
                ? formatDate(
                    stat.lastFuelAt
                  )
                : '--'
            }
          />

        </div>

      </div>

    </div>
  )
}

// =====================================================
// COMPONENTES
// =====================================================

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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">

      <div className="flex items-center gap-2 text-zinc-500">

        <Icon className="h-4 w-4" />

        <p className="text-xs">
          {label}
        </p>

      </div>

      <p className="mt-3 text-lg font-bold text-white sm:text-xl">
        {value}
      </p>

    </div>
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

function EmptyState({
  message,
}: {
  message: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-5 py-10 text-center">

      <Fuel className="mx-auto h-8 w-8 text-zinc-700" />

      <p className="mt-3 text-sm font-medium text-zinc-400">
        {message}
      </p>

    </div>
  )
}

// =====================================================
// FORMATAÇÃO
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