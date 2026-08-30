'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function checkSession() {
      setCheckingSession(true)
      setErrorMessage('')

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          setErrorMessage(
            'O convite não é válido, expirou ou ainda não foi confirmado. Abra novamente o link recebido por e-mail.'
          )
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, active')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!profile) {
          setErrorMessage(
            'Seu cadastro ainda não foi localizado no FrotaPro.'
          )
          return
        }

        if (profile.active === false) {
          setErrorMessage(
            'Este usuário está desativado. Entre em contato com o gestor da sua base.'
          )
          return
        }

        if (profile.role !== 'driver') {
          setErrorMessage(
            'Este convite não pertence a um motorista.'
          )
        }
      } catch (error: unknown) {
        console.error(
          'Erro ao validar convite do motorista:',
          error
        )

        setErrorMessage(
          'Não foi possível validar o convite. Tente abrir novamente o link recebido por e-mail.'
        )
      } finally {
        setCheckingSession(false)
      }
    }

    void checkSession()
  }, [supabase])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (password.length < 8) {
      setErrorMessage(
        'A senha deve ter pelo menos 8 caracteres.'
      )
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        'As senhas informadas não são iguais.'
      )
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          'Sua sessão de convite expirou. Abra novamente o link recebido por e-mail.'
        )
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        })

      if (updateError) {
        throw updateError
      }

      setSuccessMessage(
        'Senha criada com sucesso. Você já pode acessar o FrotaPro.'
      )

      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        router.replace('/driver')
        router.refresh()
      }, 1500)
    } catch (error: unknown) {
      console.error(
        'Erro ao definir senha do motorista:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar sua senha.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />

          <p className="text-sm text-zinc-400">
            Validando seu convite...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            <KeyRound className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Criar sua senha
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Defina uma senha para acessar sua conta de motorista
            no FrotaPro.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl sm:p-6">
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-400">
              {errorMessage}
            </div>
          )}

          {successMessage ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <div>
                  <p className="font-semibold text-emerald-300">
                    Conta ativada
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-400/80">
                    {successMessage}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    Redirecionando para o painel...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Nova senha
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    placeholder="Mínimo de 8 caracteres"
                    disabled={loading || !!errorMessage}
                    className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                    aria-label={
                      showPassword
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Confirmar senha
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    placeholder="Digite a senha novamente"
                    disabled={loading || !!errorMessage}
                    className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                    aria-label={
                      showConfirmPassword
                        ? 'Ocultar confirmação'
                        : 'Mostrar confirmação'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                <p className="text-xs leading-5 text-zinc-500">
                  Sua senha deve ter pelo menos 8 caracteres.
                  O gestor da base não terá acesso a ela.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !!errorMessage ||
                  !password ||
                  !confirmPassword
                }
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando senha...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Criar senha e acessar
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
          FrotaPro • Acesso seguro do motorista
        </p>
      </div>
    </main>
  )
}