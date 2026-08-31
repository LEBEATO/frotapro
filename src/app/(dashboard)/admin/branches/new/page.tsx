'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Save,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type StateRow = {
  id: string
  name: string
  uf: string
  active: boolean
}

export default function NewBranchPage() {
  const router = useRouter()

  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [states, setStates] = useState<StateRow[]>([])

  const [stateId, setStateId] = useState('')
  const [city, setCity] = useState('')
  const [branchName, setBranchName] = useState('')
  const [code, setCode] = useState('')
  const [active, setActive] = useState(true)

  const [loadingStates, setLoadingStates] = useState(true)
  const [saving, setSaving] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadStates() {
      setLoadingStates(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('states')
        .select(`
          id,
          name,
          uf,
          active
        `)
        .eq('active', true)
        .order('name')

      if (error) {
        console.error(
          'Erro ao carregar estados:',
          error
        )

        setErrorMessage(
          'Não foi possível carregar os estados.'
        )

        setStates([])
        setLoadingStates(false)

        return
      }

      setStates(
        (data as StateRow[] | null) ?? []
      )

      setLoadingStates(false)
    }

    void loadStates()
  }, [supabase])

  const selectedState = states.find(
    (state) => state.id === stateId
  )

  function handleCityChange(value: string) {
    setCity(value)

    if (!branchName.trim()) {
      setBranchName(
        value.trim()
          ? `Base ${value}`
          : ''
      )
    }
  }

  function generateCode() {
    if (!selectedState?.uf || !city.trim()) {
      return
    }

    const normalizedCity = city
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 3)

    setCode(
      `${selectedState.uf.toUpperCase()}-${normalizedCity}`
    )
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    const cleanCity = city.trim()
    const cleanName = branchName.trim()
    const cleanCode = code.trim().toUpperCase()

    if (!stateId) {
      setErrorMessage(
        'Selecione o estado da base.'
      )
      return
    }

    if (!cleanCity) {
      setErrorMessage(
        'Informe a cidade.'
      )
      return
    }

    if (!cleanName) {
      setErrorMessage(
        'Informe o nome da base.'
      )
      return
    }

    if (!cleanCode) {
      setErrorMessage(
        'Informe o código da base.'
      )
      return
    }

    setSaving(true)

    try {
      /*
       * Verifica se já existe uma base
       * utilizando o mesmo código.
       */
      const {
        data: existingBranch,
        error: checkError,
      } = await supabase
        .from('branches')
        .select('id')
        .eq('code', cleanCode)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingBranch) {
        setErrorMessage(
          'Já existe uma base cadastrada com esse código.'
        )
        setSaving(false)
        return
      }

      /*
       * Cria a nova base.
       */
      const {
        error: insertError,
      } = await supabase
        .from('branches')
        .insert({
          state_id: stateId,
          name: cleanName,
          city: cleanCity,
          code: cleanCode,
          active,
        })

      if (insertError) {
        throw insertError
      }

      setSuccessMessage(
        'Base cadastrada com sucesso.'
      )

      /*
       * Pequeno intervalo para o usuário
       * visualizar a confirmação.
       */
      setTimeout(() => {
        router.push('/admin/branches')
        router.refresh()
      }, 800)
    } catch (error) {
      console.error(
        'Erro ao cadastrar base:',
        error
      )

      setErrorMessage(
        'Não foi possível cadastrar a base. Verifique os dados e tente novamente.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* VOLTAR */}

        <Link
          href="/admin/branches"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para bases
        </Link>

        {/* CABEÇALHO */}

        <section>
          <p className="text-sm font-medium text-blue-400">
            Estrutura operacional
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Nova base
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Cadastre uma nova cidade e unidade operacional.
            Depois ela ficará disponível para o cadastro dos gestores.
          </p>
        </section>

        {/* ERRO */}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* SUCESSO */}

        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />

            {successMessage}
          </div>
        )}

        {/* FORMULÁRIO */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-7"
        >
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Dados da unidade
              </h2>

              <p className="text-xs text-zinc-500">
                Estado, cidade e identificação da base.
              </p>
            </div>
          </div>

          {/* ESTADO */}

          <div>
            <label
              htmlFor="state"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Estado
            </label>

            <select
              id="state"
              value={stateId}
              onChange={(event) => {
                setStateId(event.target.value)
                setCode('')
              }}
              disabled={loadingStates || saving}
              required
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {loadingStates
                  ? 'Carregando estados...'
                  : 'Selecione o estado'}
              </option>

              {states.map((state) => (
                <option
                  key={state.id}
                  value={state.id}
                >
                  {state.name} - {state.uf}
                </option>
              ))}
            </select>
          </div>

          {/* CIDADE */}

          <div>
            <label
              htmlFor="city"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Cidade
            </label>

            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <input
                id="city"
                type="text"
                value={city}
                onChange={(event) =>
                  handleCityChange(
                    event.target.value
                  )
                }
                placeholder="Ex.: Poços de Caldas"
                disabled={saving}
                required
                className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* NOME DA BASE */}

          <div>
            <label
              htmlFor="branchName"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Nome da base
            </label>

            <input
              id="branchName"
              type="text"
              value={branchName}
              onChange={(event) =>
                setBranchName(
                  event.target.value
                )
              }
              placeholder="Ex.: Base Poços de Caldas"
              disabled={saving}
              required
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* CÓDIGO */}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="code"
                className="block text-sm font-medium text-zinc-300"
              >
                Código da base
              </label>

              <button
                type="button"
                onClick={generateCode}
                disabled={
                  !stateId ||
                  !city.trim() ||
                  saving
                }
                className="text-xs font-semibold text-blue-400 transition hover:text-blue-300 disabled:cursor-not-allowed disabled:text-zinc-600"
              >
                Gerar código
              </button>
            </div>

            <input
              id="code"
              type="text"
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Ex.: MG-POC"
              disabled={saving}
              required
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm uppercase text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 disabled:opacity-50"
            />

            <p className="mt-2 text-xs text-zinc-500">
              O código identifica a unidade dentro do sistema e deve ser único.
            </p>
          </div>

          {/* STATUS */}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div>
              <p className="text-sm font-medium text-white">
                Base ativa
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Bases ativas poderão receber gestores,
                motoristas e veículos.
              </p>
            </div>

            <input
              type="checkbox"
              checked={active}
              onChange={(event) =>
                setActive(
                  event.target.checked
                )
              }
              disabled={saving}
              className="h-5 w-5 accent-blue-600"
            />
          </label>

          {/* RESUMO */}

          {selectedState && city.trim() && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                Nova unidade
              </p>

              <p className="mt-2 font-semibold text-white">
                {branchName ||
                  `Base ${city}`}
              </p>

              <p className="mt-1 text-sm text-zinc-400">
                {city} - {selectedState.uf}
              </p>

              {code && (
                <p className="mt-1 text-xs text-zinc-500">
                  Código: {code}
                </p>
              )}
            </div>
          )}

          {/* BOTÕES */}

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/admin/branches"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                loadingStates
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Cadastrar base
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}