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

  // PERMITE ACESSO PÚBLICO ÀS ROTAS DE AUTENTICAÇÃO
  if (
    !user &&
    !url.pathname.startsWith('/login') &&
    !url.pathname.startsWith('/reset-password') &&
    !url.pathname.startsWith('/auth/callback')
  ) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'driver'

    //  CORREÇÃO: operadores || em vez de espaço
    const isGestor = role === 'admin' || role === 'gestor' || role === 'manager'
    const isMecanico = role === 'mechanic' || role === 'mecanico'

    let userHome = '/driver'
    if (isGestor) userHome = '/admin'
    if (isMecanico) userHome = '/mechanic'

    if (url.pathname.startsWith('/login')) {
      url.pathname = userHome
      return NextResponse.redirect(url)
    }

    //  CORREÇÃO: operadores ||
    if ((url.pathname.startsWith('/admin') || url.pathname.startsWith('/manager')) && !isGestor) {
      url.pathname = userHome
      return NextResponse.redirect(url)
    }

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
    '/reset-password',
    '/auth/callback',
    '/admin/:path*',
    '/manager/:path*',
    '/driver/:path*',
    '/mechanic/:path*'
  ],
}