import { NextResponse } from 'next/server'

import { fleetTransferSchema } from '@/lib/schemas/fleet-transfer'
import { createServerClientWithCookies } from '@/lib/supabase/server'

type ProfileRow = {
  id: string
  full_name: string
  role: string
  branch_id: string | null
  active: boolean
}

type VehicleRow = {
  id: string
  model: string
  plate: string
  current_branch_id: string | null
}

type BranchRow = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
}

type TransferRow = {
  id: string
  entity_type: 'driver' | 'vehicle'
  driver_id: string | null
  vehicle_id: string | null
  from_branch_id: string
  to_branch_id: string
  reason: string
  transferred_by: string
  transferred_at: string
}

async function authorizeGlobalManager() {
  const supabase = await createServerClientWithCookies()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Usuário não autenticado.', status: 401 } as const
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { error: 'Não foi possível validar o perfil.', status: 500 } as const
  }

  if (
    !profile ||
    profile.active !== true ||
    !['admin', 'fleet_manager'].includes(profile.role)
  ) {
    return { error: 'Acesso não autorizado.', status: 403 } as const
  }

  return { supabase, user } as const
}

export async function GET() {
  try {
    const authorization = await authorizeGlobalManager()

    if ('error' in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      )
    }

    const { supabase } = authorization
    const [branchesResult, driversResult, vehiclesResult, transfersResult] =
      await Promise.all([
        supabase
          .from('branches')
          .select('id, name, code, city, active')
          .eq('active', true)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, role, branch_id, active')
          .eq('role', 'driver')
          .eq('active', true)
          .order('full_name'),
        supabase
          .from('vehicles')
          .select('id, model, plate, current_branch_id')
          .order('plate'),
        supabase
          .from('fleet_transfers')
          .select(
            'id, entity_type, driver_id, vehicle_id, from_branch_id, to_branch_id, reason, transferred_by, transferred_at'
          )
          .order('transferred_at', { ascending: false })
          .limit(100),
      ])

    const firstError = [
      branchesResult.error,
      driversResult.error,
      vehiclesResult.error,
      transfersResult.error,
    ].find(Boolean)

    if (firstError) {
      return NextResponse.json(
        { error: 'Não foi possível carregar as transferências.' },
        { status: 500 }
      )
    }

    const branches = (branchesResult.data ?? []) as BranchRow[]
    const drivers = (driversResult.data ?? []) as ProfileRow[]
    const vehicles = (vehiclesResult.data ?? []) as VehicleRow[]
    const transfers = (transfersResult.data ?? []) as TransferRow[]

    const profileIds = [
      ...new Set(transfers.map((item) => item.transferred_by)),
    ]
    const { data: actorsData, error: actorsError } = profileIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', profileIds)
      : { data: [], error: null }

    if (actorsError) {
      return NextResponse.json(
        { error: 'Não foi possível identificar os responsáveis.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      branches,
      drivers,
      vehicles,
      transfers,
      actors: actorsData ?? [],
    })
  } catch (error) {
    console.error('Erro ao carregar transferências:', error)
    return NextResponse.json(
      { error: 'Erro interno ao carregar transferências.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeGlobalManager()

    if ('error' in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      )
    }

    const parsed = fleetTransferSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      )
    }

    const { data, error } = await authorization.supabase.rpc(
      'transfer_fleet_entity',
      {
        p_entity_type: parsed.data.entityType,
        p_entity_id: parsed.data.entityId,
        p_target_branch_id: parsed.data.targetBranchId,
        p_expected_branch_id: parsed.data.expectedBranchId,
        p_reason: parsed.data.reason,
      }
    )

    if (error) {
      const status =
        error.code === '42501'
          ? 403
          : error.code === 'P0002'
            ? 404
            : ['22023', '22P02'].includes(error.code)
              ? 400
              : ['40001', '23505', '23514'].includes(error.code)
                ? 409
                : 500

      return NextResponse.json(
        {
          error:
            status === 500
              ? 'Não foi possível concluir a transferência.'
              : error.message,
        },
        { status }
      )
    }

    return NextResponse.json({ success: true, transfer: data })
  } catch (error) {
    console.error('Erro ao transferir entidade da frota:', error)
    return NextResponse.json(
      { error: 'Erro interno ao realizar transferência.' },
      { status: 500 }
    )
  }
}
