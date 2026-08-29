'use client'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS
// =====================================================

type StateRow = {
  id: string
  name: string
  uf: string
  active: boolean
}

type BranchRow = {
  id: string
  state_id: string
  name: string
  code: string
  city: string
  active: boolean
}

// =====================================================
// PAGE
// =====================================================

export default function NewManagerPage() {
  const supabase = useMemo(() => createClient(), [])

  const [states, setStates] = useState<StateRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])

  const [selectedStateId, setSelectedStateId] = useState('')
  const [branchId, setBranchId] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)

  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // =====================================================
  // CARREGAR ESTADOS E BASES
  // =====================================================

  useEffect(() => {
    async function loadStructure() {
      setLoadingData(true)
      setErrorMessage('')

      try {
        const [statesResponse, branchesResponse] = await Promise.all([
          supabase
            .from('states')
            .select(`
              id,
              name,
              uf,
              active
            `)
            .eq('active', true)
            .order('name'),

          supabase
            .from('branches')
            .select(`
              id,
              state_id,
              name,
              code,
              city,
              active
            `)
            .eq('active', true)
            .order('city'),
        ])

        if (statesResponse.error) {
          throw statesResponse.error
        }

        if (branchesResponse.error) {
          throw branchesResponse.error
        }

        setStates((statesResponse.data as StateRow[] | null) ?? [])
        setBranches((branchesResponse.data as BranchRow[] | null) ?? [])
      } catch (error) {
        console.error('Erro ao carregar estados e bases:', error)

        setErrorMessage(
          'Não foi possível carregar os estados e as bases cadastradas.'
        )
      } finally {
        setLoadingData(false)
      }
    }

    void loadStructure()
  }, [supabase])

  // =====================================================
  // BASES DO ESTADO SELECIONADO
  // =====================================================

  const filteredBranches = useMemo(() => {
    if (!selectedStateId) {
      return []
    }

    return branches.filter(
      (branch) => branch.state_id === selectedStateId
    )
  }, [branches, selectedStateId])

  const selectedBranch = useMemo(() => {
    return branches.find((branch) => branch.id === branchId) ?? null
  }, [branches, branchId])

  const selectedState = useMemo(() => {
    return states.find((state) => state.id === selectedStateId) ?? null
  }, [states, selectedStateId])

  // =====================================================
  // CADASTRAR GESTOR
  // =====================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    const normalizedName = fullName.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password ||
      !selectedStateId ||
      !branchId
    ) {
      setErrorMessage(
        'Preencha todos os campos obrigatórios.'
      )

      return
    }

    if (normalizedName.length < 3) {
      setErrorMessage(
        'Informe o nome completo do gestor.'
      )

      return
    }

    if (!normalizedEmail.includes('@')) {
      setErrorMessage(
        'Informe um e-mail válido.'
      )

      return
    }

    if (password.length < 8) {
      setErrorMessage(
        'A senha inicial precisa ter pelo menos 8 caracteres.'
      )

      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/admin/managers', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          fullName: normalizedName,
          email: normalizedEmail,
          password,
          branchId,
        }),
      })

      const result = (await response.json()) as {
        success?: boolean
        error?: string

        manager?: {
          id: string
          fullName: string
          email: string
          role: string
          branchId: string
          branch: string
          branchCode: string
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Não foi possível cadastrar o gestor.'
        )
      }

      setSuccessMessage(
        `Gestor ${normalizedName} cadastrado com sucesso na base ${
          selectedBranch?.name ?? ''
        }.`
      )

      // Limpar formulário
      setFullName('')
      setEmail('')
      setPassword('')
      setSelectedStateId('')
      setBranchId('')
      setShowPassword(false)
    } catch (error) {
      console.error('Erro ao cadastrar gestor:', error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar o gestor.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* HEADER */}

        <section>
          <Link
            href="/admin/managers"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            Voltar para gestores
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold text-blue-400">
              Administração global
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Cadastrar novo gestor
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Crie o acesso do gestor e vincule-o à base
              que ficará sob sua responsabilidade.
            </p>
          </div>
        </section>

        {/* MENSAGEM DE ERRO */}

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* MENSAGEM DE SUCESSO */}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Cadastro realizado
              </p>

              <p className="mt-1">
                {successMessage}
              </p>

              <Link
                href="/admin/managers"
                className="mt-3 inline-flex font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
              >
                Ver gestores cadastrados
              </Link>
            </div>
          </div>
        )}

        {/* FORMULÁRIO */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
        >
          {/* DADOS DO GESTOR */}

          <section className="p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-5">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Dados do gestor
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Este usuário será criado com o perfil
                  branch_manager.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Nome completo"
                required
              >
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="Ex.: João da Silva"
                  className={inputClass}
                  autoComplete="name"
                  disabled={submitting}
                />
              </Field>

              <Field
                label="E-mail"
                required
              >
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="gestor@empresa.com.br"
                  className={inputClass}
                  autoComplete="email"
                  disabled={submitting}
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label="Senha inicial"
                required
                description="Mínimo de 8 caracteres."
              >
                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Digite a senha inicial"
                    className={`${inputClass} pr-12`}
                    autoComplete="new-password"
                    disabled={submitting}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    disabled={submitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white disabled:opacity-50"
                    aria-label={
                      showPassword
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </Field>
            </div>
          </section>

          {/* ESTADO E BASE */}

          <section className="border-t border-zinc-800 p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-5">
              <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Estado e base
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Selecione a unidade que o gestor poderá
                  administrar.
                </p>
              </div>
            </div>

            {loadingData ? (
              <div className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />

                Carregando estados e bases...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field
                    label="Estado"
                    required
                  >
                    <select
                      value={selectedStateId}
                      onChange={(event) => {
                        setSelectedStateId(
                          event.target.value
                        )

                        setBranchId('')
                      }}
                      className={inputClass}
                      disabled={submitting}
                    >
                      <option value="">
                        Selecione o estado
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
                  </Field>

                  <Field
                    label="Cidade / Base"
                    required
                  >
                    <select
                      value={branchId}
                      onChange={(event) =>
                        setBranchId(event.target.value)
                      }
                      disabled={
                        !selectedStateId ||
                        submitting
                      }
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">
                        {selectedStateId
                          ? 'Selecione a base'
                          : 'Selecione primeiro o estado'}
                      </option>

                      {filteredBranches.map((branch) => (
                        <option
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.city} • {branch.name} •{' '}
                          {branch.code}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {selectedStateId &&
                  filteredBranches.length === 0 && (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400">
                      Não há bases ativas cadastradas neste
                      estado.
                    </div>
                  )}

                {/* RESUMO DA BASE */}

                {selectedBranch && (
                  <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-400">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                          Base selecionada
                        </p>

                        <h3 className="mt-1 font-semibold text-white">
                          {selectedBranch.name}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-400">
                          {selectedBranch.city}
                          {selectedState
                            ? ` - ${selectedState.uf}`
                            : ''}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Código: {selectedBranch.code}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* SEGURANÇA */}

          <section className="border-t border-zinc-800 p-5 sm:p-7">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    Controle de acesso
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    O gestor será vinculado à base selecionada.
                    O acesso aos dados operacionais deve
                    continuar sendo limitado pelas regras de
                    segurança e RLS do Supabase.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* BOTÕES */}

          <section className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-950/20 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-7">
            <Link
              href="/admin/managers"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />

              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingData
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}

              {submitting
                ? 'Cadastrando...'
                : 'Cadastrar gestor'}
            </button>
          </section>
        </form>
      </div>
    </AppShell>
  )
}

// =====================================================
// INPUT
// =====================================================

const inputClass =
  'min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

// =====================================================
// FIELD
// =====================================================

function Field({
  label,
  children,
  required = false,
  description,
}: {
  label: string
  children: ReactNode
  required?: boolean
  description?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-300">
        {label}

        {required && (
          <span className="ml-1 text-red-400">
            *
          </span>
        )}
      </span>

      {children}

      {description && (
        <span className="mt-1.5 block text-xs text-zinc-600">
          {description}
        </span>
      )}
    </label>
  )
}