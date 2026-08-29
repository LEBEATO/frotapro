import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClientWithCookies } from '@/lib/supabase/server'

type CreateManagerBody = {
  fullName?: string
  email?: string
  password?: string
  branchId?: string
}

export async function POST(
  request: Request
) {
  try {
    // =====================================================
    // CLIENTE DO USUÁRIO LOGADO
    // =====================================================

    const supabase =
      await createServerClientWithCookies()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            'Usuário não autenticado.',
        },
        {
          status: 401,
        }
      )
    }

    // =====================================================
    // VERIFICAR SE É ADMIN
    // =====================================================

    const {
      data: currentProfile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        `
          id,
          role,
          active
        `
      )
      .eq(
        'id',
        user.id
      )
      .maybeSingle()

    if (
      profileError ||
      !currentProfile
    ) {
      return NextResponse.json(
        {
          error:
            'Perfil do administrador não encontrado.',
        },
        {
          status: 403,
        }
      )
    }

    if (
      currentProfile.active === false
    ) {
      return NextResponse.json(
        {
          error:
            'Usuário desativado.',
        },
        {
          status: 403,
        }
      )
    }

    if (
      currentProfile.role !==
      'admin'
    ) {
      return NextResponse.json(
        {
          error:
            'Somente o administrador global pode cadastrar gestores.',
        },
        {
          status: 403,
        }
      )
    }

    // =====================================================
    // DADOS DO FORMULÁRIO
    // =====================================================

    const body =
      (await request.json()) as CreateManagerBody

    const fullName =
      body.fullName?.trim()

    const email =
      body.email
        ?.trim()
        .toLowerCase()

    const password =
      body.password ?? ''

    const branchId =
      body.branchId?.trim()

    // =====================================================
    // VALIDAÇÕES
    // =====================================================

    if (
      !fullName ||
      fullName.length < 3
    ) {
      return NextResponse.json(
        {
          error:
            'Informe o nome completo do gestor.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !email ||
      !email.includes('@')
    ) {
      return NextResponse.json(
        {
          error:
            'Informe um e-mail válido.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'A senha inicial deve ter pelo menos 8 caracteres.',
        },
        {
          status: 400,
        }
      )
    }

    if (!branchId) {
      return NextResponse.json(
        {
          error:
            'Selecione a base do gestor.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // VALIDAR A BASE
    // =====================================================

    const {
      data: branch,
      error: branchError,
    } = await supabase
      .from('branches')
      .select(
        `
          id,
          name,
          code,
          active
        `
      )
      .eq(
        'id',
        branchId
      )
      .maybeSingle()

    if (
      branchError ||
      !branch
    ) {
      return NextResponse.json(
        {
          error:
            'Base não encontrada.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      branch.active === false
    ) {
      return NextResponse.json(
        {
          error:
            'A base selecionada está inativa.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // CLIENTE ADMIN SUPABASE
    // =====================================================

    const admin =
      createAdminClient()

    // =====================================================
    // CRIAR USUÁRIO NO AUTH
    // =====================================================

    const {
      data: createdUser,
      error: createUserError,
    } =
      await admin.auth.admin.createUser(
        {
          email,
          password,

          email_confirm: true,

          user_metadata: {
            full_name:
              fullName,

            role:
              'branch_manager',
          },
        }
      )

    if (
      createUserError ||
      !createdUser.user
    ) {
      console.error(
        'Erro ao criar usuário:',
        createUserError
      )

      const message =
        createUserError
          ?.message
          ?.toLowerCase()
          .includes(
            'already'
          )
          ? 'Já existe um usuário com este e-mail.'
          : createUserError?.message ||
            'Não foi possível criar o login do gestor.'

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 400,
        }
      )
    }

    const newUserId =
      createdUser.user.id

    // =====================================================
    // CRIAR / ATUALIZAR PROFILE
    // =====================================================

    const {
      error: saveProfileError,
    } = await admin
      .from('profiles')
      .upsert(
        {
          id:
            newUserId,

          email,

          full_name:
            fullName,

          role:
            'branch_manager',

          branch_id:
            branchId,

          active:
            true,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            'id',
        }
      )

    // =====================================================
    // ROLLBACK
    // =====================================================

    if (
      saveProfileError
    ) {
      console.error(
        'Erro ao criar profile:',
        saveProfileError
      )

      // Se falhar o profile,
      // apagamos o usuário criado no Auth.
      await admin.auth.admin.deleteUser(
        newUserId
      )

      return NextResponse.json(
        {
          error:
            'O usuário foi revertido porque não foi possível salvar o perfil do gestor.',
        },
        {
          status: 500,
        }
      )
    }

    // =====================================================
    // SUCESSO
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        manager: {
          id:
            newUserId,

          fullName,

          email,

          role:
            'branch_manager',

          branchId,

          branch:
            branch.name,

          branchCode:
            branch.code,
        },
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Erro ao cadastrar gestor:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Erro interno ao cadastrar gestor.',
      },
      {
        status: 500,
      }
    )
  }
}