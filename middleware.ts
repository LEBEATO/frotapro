import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // 1. ROTAS DE CONVITE E REDEFINIÇÃO DE SENHA (LIBERADAS PARA O FLUXO DO E-MAIL)
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/reset-password')) {
    return supabaseResponse
  }

  // 2. SE NÃO TIVER USUÁRIO LOGADO -> FORÇA O LOGIN OBRIGATÓRIO
  if (!user) {
    if (!pathname.startsWith('/login')) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 3. USUÁRIO LOGADO -> BUSCA A ROLE E ISOLA OS ACESSOS
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'driver'
  const isGestor = role === 'admin' || role === 'gestor' || role === 'manager'

  const homeDoUsuario = isGestor ? '/admin' : '/driver'

  // Se já está logado e tenta abrir a tela de login, manda para a sua Home
  if (pathname.startsWith('/login')) {
    url.pathname = homeDoUsuario
    return NextResponse.redirect(url)
  }

  // --- REGRAS DE BLOQUEIO CRUZADO ---

  // Motorista tentando entrar na área do Gestor (/admin ou /manager)
  if ((pathname.startsWith('/admin') || pathname.startsWith('/manager')) && !isGestor) {
    url.pathname = '/driver'
    return NextResponse.redirect(url)
  }

  // Gestor tentando entrar na área do Motorista (/driver)
  if (pathname.startsWith('/driver') && isGestor) {
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/login',
    '/reset-password',
    '/auth/callback',
    '/admin/:path*',
    '/manager/:path*',
    '/driver/:path*',
  ],
}