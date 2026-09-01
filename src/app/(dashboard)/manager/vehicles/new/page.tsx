'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
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
  const supabase = useMemo(() => createClient(), [])

  const [manager, setManager] = useState<ManagerProfile | null>(null)
  const [branch, setBranch] = useState<BranchRow | null>(null)

  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('0')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadManager() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error('Usuário não autenticado.')

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, role, branch_id, active')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (!profile.active) throw new Error('Gestor inativo.')

        if (profile.role !== 'branch_manager') {
          throw new Error('Apenas gestores podem cadastrar veículos.')
        }

        if (!profile.branch_id) {
          throw new Error('Gestor sem base vinculada.')
        }

        setManager(profile)

        const { data: branchData } = await supabase
          .from('branches')
          .select('id,name,code,city')
          .eq('id', profile.branch_id)
          .single()

        setBranch(branchData)
      } catch (error: any) {
        setErrorMessage(error.message)
      } finally {
        setLoading(false)
      }
    }

    void loadManager()
  }, [supabase])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!manager?.branch_id) return

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const cleanPlate = plate.toUpperCase().trim()

      const { data: existing } = await supabase
        .from('vehicles')
        .select('id')
        .eq('plate', cleanPlate)
        .maybeSingle()

      if (existing) {
        throw new Error('Esta placa já está cadastrada.')
      }

      const now = new Date().toISOString()

      const { error } = await supabase.from('vehicles').insert({
        id: crypto.randomUUID(),
        model: model.trim(),
        plate: cleanPlate,
        year,
        mileage: Number(mileage),
        status: 'Ativo',
        fuel_level: 0,
        driver_id: null,
        current_branch_id: manager.branch_id,
        created_at: now,
        updated_at: now,
      })

      if (error) throw error

      setSuccessMessage('Veículo cadastrado com sucesso.')

      setTimeout(() => {
        router.push('/manager/vehicles')
        router.refresh()
      }, 1200)
    } catch (error: any) {
      setErrorMessage(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <p className="text-sm font-semibold text-blue-400">
              Gestão da unidade
            </p>

            <h1 className="mt-1 text-3xl font-bold text-white">
              Novo veículo
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              O veículo será cadastrado automaticamente na sua base.
            </p>
          </div>
        </section>

        {branch && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

            <div className="flex gap-3">

              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-blue-400">
                  Base do gestor
                </p>

                <p className="font-bold text-white">
                  {branch.name}
                </p>

                <p className="text-sm text-zinc-500">
                  {branch.city} • Código {branch.code}
                </p>
              </div>

            </div>

          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60"
        >

          <div className="border-b border-zinc-800 p-6">

            <div className="flex gap-3">

              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Car className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-white">
                  Dados do veículo
                </h2>

                <p className="text-xs text-zinc-500">
                  O motorista será atribuído depois.
                </p>
              </div>

            </div>

          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Modelo
              </label>

              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex.: Fiat Fiorino"
                className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-white outline-none focus:border-blue-500"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Placa
              </label>

              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC1D23"
                className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 font-mono text-white outline-none focus:border-blue-500"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Ano
              </label>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025"
                className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-white outline-none focus:border-blue-500"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                KM inicial
              </label>

              <div className="relative">

                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                <input
                  type="number"
                  min="0"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 text-white outline-none focus:border-blue-500"
                />

              </div>

            </div>

          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 p-6 sm:flex-row sm:justify-end">

            <Link
              href="/manager/vehicles"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-800 px-5 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {submitting ? 'Cadastrando...' : 'Cadastrar veículo'}
            </button>

          </div>

        </form>

      </div>
    </AppShell>
  )
}