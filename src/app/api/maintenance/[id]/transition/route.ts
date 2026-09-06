import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createServerClientWithCookies } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

type RpcResult = {
  success?: boolean
  message?: string
  status?: string
  vehicle_released?: boolean
}

const routeParamsSchema = z.object({
  id: z.string().uuid(),
})

const transitionSchema = z.object({
  action: z.enum(['start', 'complete_and_release']),
})

function getStatusFromRpcError(code?: string) {
  if (code === '42501') {
    return 403
  }

  if (code === 'P0002') {
    return 404
  }

  if (
    code === '23505' ||
    code === '23514'
  ) {
    return 409
  }

  if (code === '22023') {
    return 400
  }

  return 500
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const params = routeParamsSchema.safeParse(
      await context.params
    )

    if (!params.success) {
      return NextResponse.json(
        { error: 'ID de manutenção inválido.' },
        { status: 400 }
      )
    }

    const parsed = transitionSchema.safeParse(
      await request.json()
    )

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Dados inválidos.',
        },
        { status: 400 }
      )
    }

    const supabase =
      await createServerClientWithCookies()

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

    const { data, error } =
      await supabase.rpc(
        'transition_maintenance_record',
        {
          p_maintenance_id:
            params.data.id,
          p_action:
            parsed.data.action,
        }
      )

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message ||
            'Não foi possível alterar a manutenção.',
        },
        {
          status: getStatusFromRpcError(
            error.code
          ),
        }
      )
    }

    return NextResponse.json(
      (data ?? {
        success: true,
        message:
          'Manutenção atualizada com sucesso.',
      }) as RpcResult
    )
  } catch (error) {
    console.error(
      'Erro inesperado na transição de manutenção:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Erro interno ao alterar manutenção.',
      },
      { status: 500 }
    )
  }
}
