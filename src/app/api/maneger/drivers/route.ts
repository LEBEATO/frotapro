import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClientWithCookies } from '@/lib/supabase/server'

const inviteDriverSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
})

export async function POST(request: Request) {
  try {
    const supabase = await createServerClientWithCookies()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 })
    }

    const { data: managerProfile, error: managerError } = await supabase
      .from('profiles')
      .select('id, role, branch_id, active')
      .eq('id', user.id)
      .maybeSingle()

    if (managerError) {
      return NextResponse.json(
        { error: 'Não foi possível validar o perfil do gestor.' },
        { status: 500 }
      )
    }

    if (
      !managerProfile ||
      managerProfile.active === false ||
      managerProfile.role !== 'branch_manager' ||
      !managerProfile.branch_id
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado para cadastrar motoristas.' },
        { status: 403 }
      )
    }

    const parsed = inviteDriverSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      )
    }

    const { fullName, email } = parsed.data
    const admin = createAdminClient()

    const { data: branch, error: branchError } = await admin
      .from('branches')
      .select('id, active')
      .eq('id', managerProfile.branch_id)
      .maybeSingle()

    if (branchError || !branch || branch.active === false) {
      return NextResponse.json(
        { error: 'A base do gestor não está disponível para novos cadastros.' },
        { status: 400 }
      )
    }

    const { data: existingProfile, error: existingProfileError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfileError) {
      return NextResponse.json(
        { error: 'Não foi possível verificar o e-mail informado.' },
        { status: 500 }
      )
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 409 }
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      new URL(request.url).origin

    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/accept-invite`,
        data: {
          full_name: fullName,
          role: 'driver',
          branch_id: managerProfile.branch_id,
        },
      })

    if (inviteError || !inviteData.user) {
      return NextResponse.json(
        {
          error:
            'Não foi possível enviar o convite por e-mail. Verifique a configuração de e-mail do Supabase.',
        },
        { status: 500 }
      )
    }

    const invitedUserId = inviteData.user.id

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: invitedUserId,
        email,
        full_name: fullName,
        role: 'driver',
        branch_id: managerProfile.branch_id,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      await admin.auth.admin.deleteUser(invitedUserId)

      return NextResponse.json(
        { error: 'Não foi possível concluir o cadastro do motorista.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Convite enviado ao motorista com sucesso.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro inesperado ao convidar motorista:', error)
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar motorista.' },
      { status: 500 }
    )
  }
}