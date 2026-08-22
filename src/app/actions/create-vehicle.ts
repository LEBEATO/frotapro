'use server'

import { createClient } from '@supabase/supabase-js'
import { vehicleSchema, type VehicleFormData } from '@/lib/schemas'

// Instância do Supabase com privilégios Admin para convidar/gerenciar usuários
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createVehicleAndDriver(formData: VehicleFormData) {
  try {
    // 1. Validação dos dados do formulário
    const parsedData = vehicleSchema.parse(formData)
    const { model, plate, year, driver_name, driver_email } = parsedData

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://frotapro-zeta.vercel.app'}/auth/callback?next=/reset-password`

    let userId: string | null = null

    // 2. Tenta enviar o convite de novo usuário
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      driver_email,
      {
        redirectTo: redirectUrl,
        data: {
          full_name: driver_name,
          role: 'driver',
        },
      }
    )

    if (inviteError) {
      // 3. Se o e-mail já existe no Supabase Auth
      if (inviteError.message.includes('already registered') || inviteError.status === 422) {
        // Busca o ID do usuário existente
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers.users.find((u) => u.email === driver_email)

        if (existingUser) {
          userId = existingUser.id
        }

        // Reenvia o link para redefinição/definição de senha
        await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: driver_email,
          options: { redirectTo: redirectUrl },
        })
      } else {
        throw new Error(`Erro ao enviar convite: ${inviteError.message}`)
      }
    } else {
      userId = inviteData.user.id
    }

    // 4. Garante a criação/atualização do perfil na tabela profiles
    if (userId) {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: driver_name,
        role: 'driver',
      })

      // 5. Cadastra o veículo e vincula ao ID do motorista
      const { error: vehicleError } = await supabaseAdmin.from('vehicles').insert({
        model,
        plate: plate.toUpperCase(),
        year,
        driver_id: userId,
      })

      if (vehicleError) throw new Error(`Erro ao cadastrar veículo: ${vehicleError.message}`)
    }

    return {
      success: true,
      message: 'Veículo vinculado com sucesso! Link de acesso enviado ao e-mail do motorista.',
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro interno no servidor.',
    }
  }
}