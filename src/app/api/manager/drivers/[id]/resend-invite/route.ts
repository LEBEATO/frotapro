import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClientWithCookies } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

type InviteReservation = {
  allowed: boolean
  reason?: 'cooldown' | 'daily_limit'
  reservation_id?: string
  retry_after_seconds: number
  remaining_attempts: number
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

    const { data: reservationData, error: reservationError } =
      await supabase.rpc('reserve_driver_invite_resend', {
        p_driver_id: driverId,
      })

    if (reservationError) {
      const status =
        reservationError.code === '42501'
          ? 403
          : reservationError.code === 'P0002'
            ? 404
            : 500

      return NextResponse.json(
        {
          error:
            status === 500
              ? 'Não foi possível validar o limite de reenvio.'
              : reservationError.message,
        },
        { status }
      )
    }

    const reservation = reservationData as InviteReservation

    if (!reservation.allowed || !reservation.reservation_id) {
      const retryAfter = Math.max(1, reservation.retry_after_seconds)
      const error =
        reservation.reason === 'daily_limit'
          ? 'Limite de 3 reenvios em 24 horas atingido para este motorista.'
          : 'Aguarde antes de reenviar outro convite para este motorista.'

      return NextResponse.json(
        {
          error,
          retryAfterSeconds: retryAfter,
          remainingAttempts: reservation.remaining_attempts,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
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
      await admin
        .from('driver_invite_attempts')
        .update({
          status: 'failed',
          provider_error: inviteError.message.slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq('id', reservation.reservation_id)

      const providerLimited =
        inviteError.status === 429 ||
        /rate limit|too many requests/i.test(inviteError.message)

      return NextResponse.json(
        {
          error:
            providerLimited
              ? 'O serviço de e-mail atingiu o limite temporário. Aguarde antes de tentar novamente.'
              : 'Não foi possível reenviar o convite. Verifique o endereço de e-mail.',
          retryAfterSeconds: reservation.retry_after_seconds,
          remainingAttempts: reservation.remaining_attempts,
        },
        {
          status: providerLimited ? 429 : 502,
          headers: providerLimited
            ? { 'Retry-After': String(reservation.retry_after_seconds) }
            : undefined,
        }
      )
    }

    await admin
      .from('driver_invite_attempts')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
      })
      .eq('id', reservation.reservation_id)

    return NextResponse.json({
      success: true,
      message: `Novo convite enviado para ${driverProfile.email}.`,
      retryAfterSeconds: reservation.retry_after_seconds,
      remainingAttempts: reservation.remaining_attempts,
    })
  } catch (error) {
    console.error('Erro inesperado ao reenviar convite:', error)

    return NextResponse.json(
      { error: 'Erro interno ao reenviar convite.' },
      { status: 500 }
    )
  }
}
