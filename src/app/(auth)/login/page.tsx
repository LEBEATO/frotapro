'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  KeyRound,
  Loader2,
  Mail,
  Shield,
  Truck,
} from 'lucide-react'

import {
  getHomeByRole,
  normalizeRole,
} from '@/lib/auth/roles'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const router = useRouter()

  const supabase = useMemo(
    () => createClient(),
    []
  )

  async function handleSignIn(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (loading) {
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const normalizedEmail = email
        .trim()
        .toLowerCase()

      // ======================================================
      // 1. AUTENTICAÇÃO NO SUPABASE
      // ======================================================

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      // ======================================================
      // MOSTRAR O ERRO REAL DO SUPABASE
      // ======================================================

      if (error) {
        console.error(
          'ERRO REAL DO SUPABASE LOGIN:',
          {
            message: error.message,
            status: error.status,
            code: error.code,
            name: error.name,
          }
        )

        if (
          error.message
            .toLowerCase()
            .includes('invalid login credentials')
        ) {
          throw new Error(
            'O Supabase recusou o login: credenciais inválidas. Verifique a senha desse usuário no Supabase Auth.'
          )
        }

        if (
          error.message
            .toLowerCase()
            .includes('email not confirmed')
        ) {
          throw new Error(
            'Este e-mail ainda não foi confirmado no Supabase.'
          )
        }

        throw new Error(
          `Erro do Supabase: ${error.message}`
        )
      }

      if (!data.user) {
        console.error(
          'LOGIN SEM USUÁRIO:',
          data
        )

        throw new Error(
          'A autenticação não retornou um usuário.'
        )
      }

      console.log(
        'LOGIN SUPABASE OK:',
        {
          id: data.user.id,
          email: data.user.email,
        }
      )

      // ======================================================
      // 2. BUSCAR PERFIL
      // ======================================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, full_name, role, branch_id, active'
        )
        .eq(
          'id',
          data.user.id
        )
        .maybeSingle()

      // ======================================================
      // MOSTRAR ERRO REAL DO PERFIL
      // ======================================================

      if (profileError) {
        console.error(
          'ERRO AO BUSCAR PROFILE:',
          {
            message:
              profileError.message,

            code:
              profileError.code,

            details:
              profileError.details,

            hint:
              profileError.hint,
          }
        )

        await supabase.auth.signOut()

        throw new Error(
          `Erro ao carregar perfil: ${profileError.message}`
        )
      }

      if (!profile) {
        console.error(
          'PROFILE NÃO ENCONTRADO PARA:',
          data.user.id
        )

        await supabase.auth.signOut()

        throw new Error(
          'O login no Supabase funcionou, mas não existe um perfil correspondente na tabela profiles.'
        )
      }

      // ======================================================
      // 3. VALIDAR PERFIL
      // ======================================================

      if (
        profile.active === false
      ) {
        await supabase.auth.signOut()

        throw new Error(
          'Seu acesso está desativado. Entre em contato com o administrador.'
        )
      }

      // ======================================================
      // 4. NORMALIZAR PERMISSÃO
      // ======================================================

      const role =
        normalizeRole(
          profile.role
        )

      console.log(
        'PERFIL DO USUÁRIO:',
        {
          id: profile.id,
          full_name:
            profile.full_name,
          role,
          branch_id:
            profile.branch_id,
          active:
            profile.active,
        }
      )

      // ======================================================
      // 5. GESTOR PRECISA TER BASE
      // ======================================================

      if (
        role ===
          'branch_manager' &&
        !profile.branch_id
      ) {
        await supabase.auth.signOut()

        throw new Error(
          'Seu usuário ainda não está vinculado a uma base.'
        )
      }

      // ======================================================
      // 6. DEFINIR DASHBOARD
      // ======================================================

      const destination =
        getHomeByRole(role)

      console.log(
        'REDIRECIONANDO PARA:',
        destination
      )

      // ======================================================
      // 7. REDIRECIONAR
      // ======================================================

      router.replace(
        destination
      )

      router.refresh()
    } catch (
      error: unknown
    ) {
      console.error(
        'ERRO FINAL NO LOGIN:',
        error
      )

      if (
        error instanceof Error
      ) {
        setErrorMsg(
          error.message
        )
      } else {
        setErrorMsg(
          'Não foi possível realizar o login. Tente novamente.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8 sm:px-6">

      {/* FUNDO DECORATIVO */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl"
      />

      {/* CARD */}

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-xl sm:p-8">

        {/* CABEÇALHO */}

        <header className="mb-8 space-y-2 text-center">

          <div className="mb-2 inline-flex rounded-2xl border border-blue-500/20 bg-blue-600/10 p-3 text-blue-400">

            <Truck
              aria-hidden="true"
              className="h-8 w-8"
            />

          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            FrotaPro
          </h1>

          <p className="text-sm text-zinc-400">
            Gestão inteligente e segura da sua frota
          </p>

        </header>

        {/* ERRO */}

        {errorMsg && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400"
          >
            {errorMsg}
          </div>
        )}

        {/* FORMULÁRIO */}

        <form
          onSubmit={
            handleSignIn
          }
          className="space-y-5"
        >

          {/* EMAIL */}

          <div className="space-y-1.5">

            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
            >
              E-mail
            </label>

            <div className="relative">

              <Mail
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
              />

              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="seu.email@empresa.com"
                disabled={
                  loading
                }
                required
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

            </div>

          </div>

          {/* SENHA */}

          <div className="space-y-1.5">

            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
            >
              Senha
            </label>

            <div className="relative">

              <KeyRound
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
              />

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={
                  password
                }
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="••••••••"
                disabled={
                  loading
                }
                required
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

            </div>

          </div>

          {/* BOTÃO */}

          <button
            type="submit"
            disabled={
              loading
            }
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin"
                />

                <span>
                  Autenticando...
                </span>
              </>
            ) : (
              <span>
                Entrar no sistema
              </span>
            )}

          </button>

        </form>

        {/* SEGURANÇA */}

        <footer className="mt-6 border-t border-zinc-800/80 pt-4 text-center text-xs text-zinc-500">

          <span className="inline-flex items-center gap-1.5">

            <Shield
              aria-hidden="true"
              className="h-3.5 w-3.5 text-zinc-400"
            />

            Acesso protegido com Supabase Auth e RLS

          </span>

        </footer>

      </section>

    </main>
  )
}