'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2 } from 'lucide-react'

// Componente interno com a lógica da página e os hooks de navegação
function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    async function handleSession() {
      // 1. Verifica se já existe uma sessão
      const { data: sessionData } = await supabase.auth.getSession()

      if (sessionData.session) {
        setIsProcessing(false)
        return
      }

      // 2. Tenta extrair o token da URL (corrigido os operadores ||)
      const token =
        searchParams.get('token') ||
        searchParams.get('code') ||
        searchParams.get('access_token')

      if (token) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(token)
        if (exchangeError) {
          console.error('Erro ao trocar token:', exchangeError)
          router.push('/login?error=invalid-token')
          return
        }
        setIsProcessing(false)
        return
      }

      // 3. Se não tem token e não tem sessão → redireciona
      router.push('/login?error=session-required')
    }

    handleSession()
  }, [router, searchParams, supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao atualizar a senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Tela de carregamento enquanto processa o token
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Verificando seu convite...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Senha definida com sucesso!</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Agora você pode fazer login com sua nova senha.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white text-center">Definir sua senha</h2>
        <p className="text-sm text-zinc-400 text-center mt-2">Crie uma senha para acessar o sistema Frota Pro.
        </p>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400">Confirmar senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Exportação padrão envelopada por Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-zinc-400">Carregando página...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}