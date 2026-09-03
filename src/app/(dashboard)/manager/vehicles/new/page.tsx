'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  ArrowLeft,
  Building2,
  Car,
  CheckCircle2,
  Gauge,
  Loader2,
  Save,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type ManagerProfile = {
  id: string
  role: string
  branch_id: string | null
  active: boolean
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
}

export default function NewManagerVehiclePage() {
  const router = useRouter()

  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [manager, setManager] =
    useState<ManagerProfile | null>(null)

  const [branch, setBranch] =
    useState<BranchRow | null>(null)

  const [model, setModel] =
    useState('')

  const [plate, setPlate] =
    useState('')

  const [year, setYear] =
    useState('')

  const [mileage, setMileage] =
    useState('0')

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  useEffect(() => {
    async function loadManager() {
      try {
        setErrorMessage('')

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

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            role,
            branch_id,
            active
          `)
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!profile) {
          throw new Error(
            'Perfil do gestor não encontrado.'
          )
        }

        if (!profile.active) {
          throw new Error(
            'Este gestor está inativo.'
          )
        }

        if (
          profile.role !== 'branch_manager'
        ) {
          throw new Error(
            'Apenas gestores de base podem cadastrar veículos.'
          )
        }

        if (!profile.branch_id) {
          throw new Error(
            'Este gestor não possui uma base vinculada.'
          )
        }

        const managerProfile =
          profile as ManagerProfile

        setManager(managerProfile)

        const {
          data: branchData,
          error: branchError,
        } = await supabase
          .from('branches')
          .select(`
            id,
            name,
            code,
            city
          `)
          .eq(
            'id',
            managerProfile.branch_id
          )
          .maybeSingle()

        if (branchError) {
          throw branchError
        }

        if (!branchData) {
          throw new Error(
            'A base vinculada ao gestor não foi encontrada.'
          )
        }

        setBranch(
          branchData as BranchRow
        )
      } catch (error: unknown) {
        console.error(
          'Erro ao carregar cadastro de veículo:',
          error
        )

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados do gestor.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadManager()
  }, [supabase])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      submitting ||
      !manager?.branch_id
    ) {
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const cleanModel =
        model.trim()

      const cleanPlate =
        plate
          .trim()
          .toUpperCase()

      const cleanYear =
        year.trim()

      const numericMileage =
        Number(mileage)

      if (!cleanModel) {
        throw new Error(
          'Informe o modelo do veículo.'
        )
      }

      if (!cleanPlate) {
        throw new Error(
          'Informe a placa do veículo.'
        )
      }

      if (
        cleanPlate.length < 7
      ) {
        throw new Error(
          'Informe uma placa válida.'
        )
      }

      if (!cleanYear) {
        throw new Error(
          'Informe o ano do veículo.'
        )
      }

      if (
        Number(cleanYear) < 1900 ||
        Number(cleanYear) > 2100
      ) {
        throw new Error(
          'Informe um ano válido.'
        )
      }

      if (
        Number.isNaN(numericMileage) ||
        numericMileage < 0
      ) {
        throw new Error(
          'Informe uma quilometragem válida.'
        )
      }

      const {
        data: existingVehicle,
        error: existingVehicleError,
      } = await supabase
        .from('vehicles')
        .select('id')
        .eq(
          'plate',
          cleanPlate
        )
        .maybeSingle()

      if (existingVehicleError) {
        throw existingVehicleError
      }

      if (existingVehicle) {
        throw new Error(
          'Esta placa já está cadastrada.'
        )
      }

      const {
        error: insertError,
      } = await supabase
        .from('vehicles')
        .insert({
          model: cleanModel,
          plate: cleanPlate,
          year: cleanYear,
          mileage: numericMileage,
          current_branch_id:
            manager.branch_id,
          created_by:
            manager.id,
          driver_id: null,
          driver_name: null,
          driver_email: null,
          driver_phone: null,
        })

      if (insertError) {
        throw insertError
      }

      setSuccessMessage(
        'Veículo cadastrado com sucesso.'
      )

      setTimeout(() => {
        router.push(
          '/manager/vehicles'
        )

        router.refresh()
      }, 1000)
    } catch (error: unknown) {
      console.error(
        'Erro ao cadastrar veículo:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar o veículo.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />

            <p className="mt-4 text-sm text-zinc-500">
              Carregando dados da base...
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">

        <section className="flex items-start gap-3">
          <Link
            href="/manager/vehicles"
            aria-label="Voltar para veículos"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <p className="text-sm font-semibold text-blue-400">
              Gestão da unidade
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Novo veículo
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              O veículo será vinculado automaticamente à base do gestor.
            </p>
          </div>
        </section>

        {branch && (
          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Base responsável
                </p>

                <p className="mt-1 font-bold text-white">
                  {branch.name}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {branch.city}
                  {' • '}
                  Código {branch.code}
                </p>
              </div>

            </div>
          </section>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />

            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
        >

          <div className="border-b border-zinc-800 p-6">
            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Car className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-white">
                  Dados do veículo
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  O motorista será atribuído depois, na tela de motoristas.
                </p>
              </div>

            </div>
          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-2">

            <div>
              <label
                htmlFor="model"
                className="mb-2 block text-sm font-semibold text-zinc-300"
              >
                Modelo
              </label>

              <input
                id="model"
                value={model}
                onChange={(event) =>
                  setModel(
                    event.target.value
                  )
                }
                placeholder="Ex.: Fiat Fiorino"
                disabled={submitting}
                required
                className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="plate"
                className="mb-2 block text-sm font-semibold text-zinc-300"
              >
                Placa
              </label>

              <input
                id="plate"
                value={plate}
                onChange={(event) =>
                  setPlate(
                    event.target.value
                      .toUpperCase()
                  )
                }
                placeholder="ABC1D23"
                maxLength={8}
                disabled={submitting}
                required
                className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 font-mono uppercase text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="year"
                className="mb-2 block text-sm font-semibold text-zinc-300"
              >
                Ano
              </label>

              <input
                id="year"
                type="number"
                min="1900"
                max="2100"
                step="1"
                value={year}
                onChange={(event) =>
                  setYear(
                    event.target.value
                  )
                }
                placeholder="2026"
                disabled={submitting}
                required
                className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="mileage"
                className="mb-2 block text-sm font-semibold text-zinc-300"
              >
                KM inicial
              </label>

              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                <input
                  id="mileage"
                  type="number"
                  min="0"
                  step="1"
                  value={mileage}
                  onChange={(event) =>
                    setMileage(
                      event.target.value
                    )
                  }
                  disabled={submitting}
                  required
                  className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 p-6 sm:flex-row sm:justify-end">

            <Link
              href="/manager/vehicles"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {submitting
                ? 'Cadastrando...'
                : 'Cadastrar veículo'}
            </button>

          </div>

        </form>
      </div>
    </AppShell>
  )
}