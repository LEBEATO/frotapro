import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/reset-password'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  let error = null

  if (code) {
    // Fluxo OAuth (ex: Google)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    error = exchangeError
  } else if (token_hash && type) {
    // Fluxo de convite / redefinição de senha
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    error = verifyError
  } else {
    // Sem parâmetros válidos
    return NextResponse.redirect(`${origin}/login?error=missing-params`)
  }

  if (error) {
    console.error('Erro no callback:', error)
    return NextResponse.redirect(`${origin}/login?error=auth-failed`)
  }

  // Sucesso: redireciona para a página de destino (geralmente /reset-password)
  return NextResponse.redirect(`${origin}${next}`)
}