'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  UserPlus,
  UserRound,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type ManagerProfile = {
  id: string
  full_name: string
  email: string
  role: string
  branch_id: string | null
  active: boolean
}

type Branch = {
  id: string
  name: string
  code: string
  city: string
}

export default function NewDriverPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [manager, setManager] = useState<ManagerProfile | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  const [loadingPage, setLoadingPage] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadManagerData() {
      setLoadingPage(true)
      setErrorMessage('')

      try {
        // =====================================================
        // 1. USUÁRIO AUTENTICADO
        // =====================================================
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error('Usuário não autenticado.')
        }

        // =====================================================
        // 2. PERFIL DO GESTOR
        // =====================================================
        const {
          data: managerProfile,
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

        if (!managerProfile) {
          throw new Error('Perfil do gestor não encontrado.')
        }

        if (managerProfile.active === false) {
          throw new Error('Este usuário está desativado.')
        }

        if (managerProfile.role !== 'branch_manager') {
          throw new Error(
            'Apenas gestores de base podem cadastrar motoristas.'
          )
        }

        if (!managerProfile.branch_id) {
          throw new Error(
            'O gestor não está vinculado a uma base.'
          )
        }

        setManager(managerProfile as ManagerProfile)

        // =====================================================
        // 3. CARREGAR BASE DO GESTOR
        // =====================================================
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
          .eq('id', managerProfile.branch_id)
          .maybeSingle()

        if (branchError) {
          throw branchError
        }

        if (!branchData) {
          throw new Error('Base do gestor não encontrada.')
        }

        setBranch(branchData as Branch)
      } catch (error) {
        console.error(
          'Erro ao carregar dados do gestor:',
          error
        )

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados do gestor.'
        )
      } finally {
        setLoadingPage(false)
      }
    }

    void loadManagerData()
  }, [supabase])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    const cleanName = fullName.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanName) {
      setErrorMessage('Informe o nome completo do motorista.')
      return
    }

    if (cleanName.length < 3) {
      setErrorMessage(
        'O nome do motorista deve ter pelo menos 3 caracteres.'
      )
      return
    }

    if (!cleanEmail) {
      setErrorMessage('Informe o e-mail do motorista.')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Informe um e-mail válido.')
      return
    }

    if (!manager?.branch_id) {
      setErrorMessage(
        'O gestor não possui uma base vinculada.'
      )
      return
    }

    setSubmitting(true)

    try {
      // =====================================================
      // 4. CRIAR MOTORISTA / ENVIAR CONVITE
      // =====================================================
      const response = await fetch('/api/manager/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
        }),
      })

      let data: {
        message?: string
        error?: string
      } = {}

      try {
        data = await response.json()
      } catch {
        // resposta sem JSON
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            'Não foi possível cadastrar o motorista.'
        )
      }

      setSuccessMessage(
        data.message ??
          'Motorista cadastrado e convite enviado com sucesso.'
      )

      setFullName('')
      setEmail('')

      // Aguarda um pouco para o gestor visualizar a mensagem
      setTimeout(() => {
        router.push('/manager/drivers')
        router.refresh()
      }, 1800)
    } catch (error) {
      console.error(
        'Erro ao cadastrar motorista:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar o motorista.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingPage) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />

            <p className="text-sm text-zinc-500">
              Carregando dados da base...
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}
        <section className="flex items-start gap-3">
          <Link
            href="/manager"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            aria-label="Voltar para motoristas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <p className="text-sm font-medium text-blue-400">
              Gestão de motoristas
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Novo motorista
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Cadastre um novo motorista na sua unidade.
              O motorista receberá um convite por e-mail para criar
              a própria senha e acessar o FrotaPro.
            </p>
          </div>
        </section>

        {/* =====================================================
            ERRO DE CARREGAMENTO
        ===================================================== */}
        {errorMessage && !manager && (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <p className="text-sm font-medium text-red-400">
              {errorMessage}
            </p>

            <Link
              href="/manager/drivers"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              Voltar
            </Link>
          </section>
        )}

        {manager && branch && (
          <>
            {/* =====================================================
                BASE DO MOTORISTA
            ===================================================== */}
            <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <Building2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Base do motorista
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-white">
                    {branch.name}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    {branch.city} • Código {branch.code}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    O novo motorista será automaticamente
                    vinculado a esta unidade.
                  </p>
                </div>
              </div>
            </section>

            {/* =====================================================
                MENSAGEM DE SUCESSO
            ===================================================== */}
            {successMessage && (
              <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      Cadastro realizado
                    </p>

                    <p className="mt-1 text-sm text-emerald-400">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* =====================================================
                MENSAGEM DE ERRO
            ===================================================== */}
            {errorMessage && (
              <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm font-medium text-red-400">
                  {errorMessage}
                </p>
              </section>
            )}

            {/* =====================================================
                FORMULÁRIO
            ===================================================== */}
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
            >
              <div className="border-b border-zinc-800 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    <UserPlus className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-white">
                      Dados do motorista
                    </h2>

                    <p className="mt-0.5 text-xs text-zinc-500">
                      Informe os dados necessários para enviar o convite.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {/* NOME */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-zinc-300"
                  >
                    Nome completo
                  </label>

                  <div className="relative">
                    <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      placeholder="Ex: João da Silva"
                      autoComplete="name"
                      disabled={submitting}
                      className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-zinc-300"
                  >
                    E-mail
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="motorista@email.com"
                      autoComplete="email"
                      disabled={submitting}
                      className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    O convite para criação da senha será enviado
                    para este endereço.
                  </p>
                </div>

                {/* GESTOR */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Responsável pelo cadastro
                  </p>

                  <p className="mt-2 text-sm font-medium text-zinc-300">
                    {manager.full_name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {manager.email}
                  </p>
                </div>
              </div>

              {/* =====================================================
                  BOTÕES
              ===================================================== */}
              <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-950/30 p-5 sm:flex-row sm:justify-end sm:p-6">
                <Link
                  href="/manager/drivers"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={submitting || Boolean(successMessage)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando convite...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Cadastrar e enviar convite
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* =====================================================
                EXPLICAÇÃO DO FLUXO
            ===================================================== */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
              <h2 className="text-sm font-bold text-zinc-300">
                O que acontece depois?
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <FlowCard
                  number="1"
                  title="Cadastro"
                  description="O motorista é vinculado automaticamente à sua base."
                />

                <FlowCard
                  number="2"
                  title="Convite"
                  description="O FrotaPro envia um convite para o e-mail informado."
                />

                <FlowCard
                  number="3"
                  title="Acesso"
                  description="O motorista cria sua senha e entra no painel dele."
                />
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function FlowCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400">
        {number}
      </div>

      <p className="mt-3 text-sm font-semibold text-zinc-300">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {description}
      </p>
    </div>
  )
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}