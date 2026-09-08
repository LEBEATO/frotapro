import type { EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createServerClientWithCookies } from '@/lib/supabase/server'
import { internalRedirect } from '@/lib/internal-redirect'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  const redirectTo = internalRedirect(next, request.url, '/auth/accept-invite')

  // Preserva parâmetros adicionais do convite, sem sobrescrever os do destino.
  searchParams.forEach((value, key) => {
    if (!redirectTo.searchParams.has(key)) redirectTo.searchParams.set(key, value)
  })

  // Remove dados sensíveis da URL final
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (!tokenHash || !type) {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set(
      'error',
      'Convite inválido ou incompleto.'
    )

    return NextResponse.redirect(redirectTo)
  }

  try {
    const supabase =
      await createServerClientWithCookies()

    const { error } =
      await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      })

    if (error) {
      console.error(
        'Erro ao confirmar convite:',
        error
      )

      redirectTo.pathname = '/login'
      redirectTo.searchParams.set(
        'error',
        'O convite expirou ou não é mais válido.'
      )

      return NextResponse.redirect(redirectTo)
    }

    return NextResponse.redirect(redirectTo)
  } catch (error) {
    console.error(
      'Erro inesperado ao confirmar convite:',
      error
    )

    redirectTo.pathname = '/login'
    redirectTo.searchParams.set(
      'error',
      'Não foi possível confirmar o convite.'
    )

    return NextResponse.redirect(redirectTo)
  }
}
