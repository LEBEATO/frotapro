import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClientWithCookies } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: driverId } = await context.params

    const supabase = await createServerClientWithCookies()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado.' },
        { status: 401 }
      )
    }

    const { data: managerProfile, error: managerError } =
      await supabase
        .from('profiles')
        .select('id, role, branch_id, active')
        .eq('id', user.id)
        .maybeSingle()

    if (managerError || !managerProfile) {
      return NextResponse.json(
        { error: 'Não foi possível validar o gestor.' },
        { status: 500 }
      )
    }

    if (
      managerProfile.active === false ||
      managerProfile.role !== 'branch_manager' ||
      !managerProfile.branch_id
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado.' },
        { status: 403 }
      )
    }

    const { data: driverProfile, error: driverError } =
      await supabase
        .from('profiles')
        .select('id, email, full_name, role, branch_id, active')
        .eq('id', driverId)
        .eq('role', 'driver')
        .eq('branch_id', managerProfile.branch_id)
        .maybeSingle()

    if (driverError || !driverProfile) {
      return NextResponse.json(
        { error: 'Motorista não encontrado nesta base.' },
        { status: 404 }
      )
    }

    const admin = createAdminClient()

    const {
      data: authUserData,
      error: authUserError,
    } = await admin.auth.admin.getUserById(driverId)

    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado no Supabase Auth.' },
        { status: 404 }
      )
    }

    if (authUserData.user.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            'Este motorista já ativou a conta. Use recuperação de senha se necessário.',
        },
        { status: 409 }
      )
    }

    if (!driverProfile.email) {
      return NextResponse.json(
        { error: 'Motorista sem e-mail cadastrado.' },
        { status: 400 }
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      new URL(request.url).origin

    const { error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(
        driverProfile.email,
        {
          redirectTo: `${appUrl}/auth/accept-invite`,
          data: {
            full_name: driverProfile.full_name,
            role: 'driver',
            branch_id: managerProfile.branch_id,
          },
        }
      )

    if (inviteError) {
      return NextResponse.json(
        {
          error:
            inviteError.message ||
            'Não foi possível reenviar o convite.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Novo convite enviado para ${driverProfile.email}.`,
    })
  } catch (error) {
    console.error('Erro inesperado ao reenviar convite:', error)

    return NextResponse.json(
      { error: 'Erro interno ao reenviar convite.' },
      { status: 500 }
    )
  }
}