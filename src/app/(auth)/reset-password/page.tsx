'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    // Captura a sessão mesmo se demorar alguns milissegundos para carregar do cookie
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true)
      } else if (event === 'SIGNED_OUT') {
        router.push('/login?error=session-required')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, supabase.auth])

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
      setTimeout(() => {
        router.push('/login')
      }, 2000)
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

