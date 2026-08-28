import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  getHomeByRole,
  normalizeRole,
} from '@/lib/auth/roles'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const redirectUrl = request.nextUrl.clone()

  // Callback e recuperação de senha continuam públicos
  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/reset-password')
  ) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Usuário não autenticado
  if (!user) {
    if (pathname.startsWith('/login')) {
      return response
    }

    redirectUrl.pathname = '/login'
    redirectUrl.search = ''

    return NextResponse.redirect(redirectUrl)
  }

  // Perfil do usuário
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role, branch_id, active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    profile.active === false
  ) {
    await supabase.auth.signOut()

    redirectUrl.pathname = '/login'
    redirectUrl.search = '?error=invalid_profile'

    return NextResponse.redirect(redirectUrl)
  }

  const role = normalizeRole(profile.role)
  const home = getHomeByRole(role)

  const isGlobalManager =
    role === 'admin' ||
    role === 'fleet_manager'

  const isBranchManager =
    role === 'branch_manager'

  const isDriver =
    role === 'driver'

  // Usuário logado não fica no login
  if (pathname.startsWith('/login')) {
    redirectUrl.pathname = home
    redirectUrl.search = ''

    return NextResponse.redirect(redirectUrl)
  }

  // /admin → somente admin e fleet_manager
  if (
    pathname.startsWith('/admin') &&
    !isGlobalManager
  ) {
    redirectUrl.pathname = home
    redirectUrl.search = ''

    return NextResponse.redirect(redirectUrl)
  }

  // /manager → branch_manager ou gestão global
  if (pathname.startsWith('/manager')) {
    if (
      !isBranchManager &&
      !isGlobalManager
    ) {
      redirectUrl.pathname = home
      redirectUrl.search = ''

      return NextResponse.redirect(redirectUrl)
    }

    if (
      isBranchManager &&
      !profile.branch_id
    ) {
      await supabase.auth.signOut()

      redirectUrl.pathname = '/login'
      redirectUrl.search = '?error=branch_required'

      return NextResponse.redirect(redirectUrl)
    }
  }

  // /driver → somente motorista
  if (
    pathname.startsWith('/driver') &&
    !isDriver
  ) {
    redirectUrl.pathname = home
    redirectUrl.search = ''

    return NextResponse.redirect(redirectUrl)
  }

  return response
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