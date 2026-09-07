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
  Building2,
  Fuel,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'

import { AdminFuelRecordCard } from '@/components/fuel/AdminFuelRecordCard'
import { AdminFuelSummary } from '@/components/fuel/AdminFuelSummary'
import type { FuelRecord, BranchRow } from '@/components/fuel/admin-types'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type AdminProfile = {
  id: string
  role: string
  active: boolean
}

// =====================================================
// AUXILIARES
// =====================================================

function calculateDistance(
  previousKm: number | null,
  currentKm: number | null
) {
  if (
    previousKm == null ||
    currentKm == null ||
    currentKm < previousKm
  ) {
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
// PÁGINA ADMIN GLOBAL
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

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      // ===============================================
      // USUÁRIO LOGADO
      // ===============================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Usuário não autenticado.'
        )
      }

      // ===============================================
      // PERFIL ADMIN
      // ===============================================

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          active
        `)
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profileData) {
        throw new Error(
          'Perfil administrativo não encontrado.'
        )
      }

      const profile =
        profileData as AdminProfile

      if (!profile.active) {
        throw new Error(
          'Este usuário está inativo.'
        )
      }

      // ===============================================
      // ADMIN GLOBAL / FLEET MANAGER
      // ===============================================

      const isGlobalManager =
        profile.role === 'admin' ||
        profile.role === 'fleet_manager'

      if (!isGlobalManager) {
        throw new Error(
          'Esta página é exclusiva para a administração global.'
        )
      }

      // ===============================================
      // ADMIN NÃO FILTRA POR BRANCH_ID
      // ===============================================

      const [
        fuelResponse,
        branchesResponse,
      ] = await Promise.all([
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
            created_at,
            updated_at
          `)
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('branches')
          .select(`
            id,
            name,
            code,
            city,
            active
          `)
          .order('name', {
            ascending: true,
          }),
      ])

      if (fuelResponse.error) {
        throw fuelResponse.error
      }

      if (branchesResponse.error) {
        throw branchesResponse.error
      }

      setRecords(
        (
          fuelResponse.data ?? []
        ) as FuelRecord[]
      )

      setBranches(
        (
          branchesResponse.data ?? []
        ) as BranchRow[]
      )
    } catch (error) {
      console.error(
        'Erro ao carregar abastecimentos globais:',
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
  // MAPA DAS BASES
  // =====================================================

  const branchMap = useMemo(() => {
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
                )
              : null

          const values = [
            record.driver,
            record.driver_email,
            record.vehicle_model,
            record.vehicle_plate,
            record.fuel_type,
            record.fuel_station,
            branch?.name,
            branch?.code,
            branch?.city,
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
      branchMap,
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

  const averagePrice =
    totalLiters > 0
      ? totalAmount / totalLiters
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

  const activeBranches =
    new Set(
      records
        .map(
          (record) =>
            record.branch_id
        )
        .filter(
          (
            branchId
          ): branchId is string =>
            Boolean(branchId)
        )
    ).size

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div className="flex items-start gap-3">

            <Link
              href="/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Voltar ao painel administrativo"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>

              <p className="text-sm font-semibold text-blue-400">
                Administração global
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Abastecimentos
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Acompanhe os abastecimentos de todos os veículos,
                motoristas e bases da operação.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* =================================================
            VISÃO GLOBAL
        ================================================= */}

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

          <div className="flex items-start gap-3">

            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Visão nacional
              </p>

              <p className="mt-1 font-bold text-white">
                Todas as bases
              </p>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                O administrador possui acesso global aos registros de
                abastecimento de todas as unidades.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            INDICADORES
        ================================================= */}

        <AdminFuelSummary
          recordCount={records.length}
          activeBranches={activeBranches}
          totalAmount={totalAmount}
          totalLiters={totalLiters}
          averagePrice={averagePrice}
          totalDistance={totalDistance}
        />

        {/* =================================================
            BUSCA
        ================================================= */}

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
            placeholder="Buscar motorista, placa, veículo, base, cidade, combustível ou posto..."
            className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

        </section>

        {/* =================================================
            ERRO
        ================================================= */}

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

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        {loading ? (

          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">

            <div className="text-center">

              <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-400" />

              <p className="mt-3 text-sm text-zinc-500">
                Carregando abastecimentos de todas as bases...
              </p>

            </div>

          </div>

        ) : filteredRecords.length === 0 ? (

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">

            <Fuel className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-4 font-semibold text-zinc-300">
              Nenhum abastecimento encontrado
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Ainda não existem abastecimentos registrados
              ou nenhum registro corresponde à busca.
            </p>

          </div>

        ) : (

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">

            {filteredRecords.map(
              (record) => {

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

                const branch =
                  record.branch_id
                    ? branchMap.get(
                        record.branch_id
                      )
                    : null

                return (
                  <AdminFuelRecordCard key={record.id} record={record} branch={branch} consumption={consumption} />
                )
              }
            )}

          </section>

        )}

      </div>
    </AppShell>
  )
}
