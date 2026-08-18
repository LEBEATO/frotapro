import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  // Se NÃO estiver logado e tentar acessar rotas protegidas -> vai para /login
  if (!user && !url.pathname.startsWith('/login')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Se ESTIVER logado
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'driver'

    // CORREÇÃO: substituir espaços por || (OU lógico)
    const isGestor = role === 'admin' || role === 'gestor' || role === 'manager'
    const isMecanico = role === 'mechanic' || role === 'mecanico'

    let userHome = '/driver'
    if (isGestor) userHome = '/admin'
    if (isMecanico) userHome = '/mechanic'

    // Se estiver na tela de login e já autenticado -> manda para o painel
    if (url.pathname.startsWith('/login')) {
      url.pathname = userHome
      return NextResponse.redirect(url)
    }

    // Protege rotas de admin
    if ((url.pathname.startsWith('/admin') || url.pathname.startsWith('/manager')) && !isGestor) {
      url.pathname = userHome
      return NextResponse.redirect(url)
    }

    // Protege rotas de mecânico
    if (url.pathname.startsWith('/mechanic') && !isMecanico && !isGestor) {
      url.pathname = userHome
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/login',
    '/admin/:path*',
    '/manager/:path*',
    '/driver/:path*',
    '/mechanic/:path*'
  ],
}