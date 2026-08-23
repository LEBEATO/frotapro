'use server'

import { createClient } from '@supabase/supabase-js'
import { vehicleSchema, type VehicleFormData } from '@/lib/schemas'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function createVehicleAndDriver(formData: VehicleFormData) {
  try {
    // 1. Validação dos dados do formulário
    const parsedData = vehicleSchema.parse(formData)
    const { model, plate, year, driver_name, driver_email } = parsedData

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frotapro-zeta.vercel.app'
    const redirectUrl =`${appUrl}/auth/callback?next=/reset-password`

    let userId: string | null = null

    // 2. Tenta enviar o convite ao motorista
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
      // 3. Tratamento se o e-mail já existir no Auth
      if (
        inviteError.message.includes('already registered') ||
        inviteError.message.includes('Database error') ||
        inviteError.status === 422
      ) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u) => u.email === driver_email)

        if (existingUser) {
          userId = existingUser.id

          // Reenvia link de recuperação de senha
          await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: driver_email,
            options: { redirectTo: redirectUrl },
          })
        } else {
          throw new Error(`Erro no Supabase Auth: ${inviteError.message}`)
        }
      } else {
        throw new Error(`Erro ao enviar convite: ${inviteError.message}`)
      }
    } else if (inviteData?.user) {
      userId = inviteData.user.id
    }

    if (!userId) {
      throw new Error('Não foi possível identificar o usuário motorista.')
    }

    // 4. Garante a criação/atualização do perfil em profiles COM E-MAIL
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        full_name: driver_name,
        email: driver_email,
        role: 'driver',
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('Erro ao atualizar profiles:', profileError.message)
    }

    // 5. Cadastra na tabela vehicles enviando TODOS os campos NOT NULL da DDL
    const { error: vehicleError } = await supabaseAdmin.from('vehicles').insert({
      model,
      plate: plate.toUpperCase(),
      year: String(year),
      driver_name: driver_name,
      driver_email: driver_email,
      driver_id: userId,
      status: 'Ativo',
    })

    if (vehicleError) {
      throw new Error(`Erro ao cadastrar veículo: ${vehicleError.message}`)
    }

    return {
      success: true,
      message: 'Veículo e motorista vinculados com sucesso! E-mail de convite enviado.',
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro interno no servidor.',
    }
  }
}