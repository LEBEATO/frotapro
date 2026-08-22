'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { vehicleSchema, type VehicleFormData } from '@/lib/schemas'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Chaves do Supabase não configuradas no .env.local')
  }
  return createClient(url, serviceKey)
}

export async function createVehicleAndDriver(formData: VehicleFormData) {
  const validation = vehicleSchema.safeParse(formData)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    // 1. ENVIA CONVITE PARA O MOTORISTA VIA SUPABASE AUTH
    //  CORREÇÃO: os parâmetros vão diretamente, sem aninhar em "options"
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      formData.driver_email,
      {
        data: {
          full_name: formData.driver_name,
          role: 'driver',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
      }
    )

    if (inviteError) {
      // Se o erro for "User already registered", ainda podemos vincular o veículo
      if (inviteError.message.includes('already registered')) {
        console.log('Usuário já registrado, vinculando veículo...')
      } else {
        throw new Error(`Erro ao enviar convite: ${inviteError.message}`)
      }
    }

    // 2. Registrar veículo no banco
    const { error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .insert({
        model: formData.model,
        plate: formData.plate.toUpperCase(),
        year: formData.year,
        driver_name: formData.driver_name,
        driver_email: formData.driver_email,
        status: 'Ativo',
        created_at: new Date().toISOString(),
      })

    if (vehicleError) {
      throw new Error(`Erro ao cadastrar veículo: ${vehicleError.message}`)
    }

    revalidatePath('/admin')

    if (!inviteError || !inviteError.message.includes('already registered')) {
      return { success: true, message: 'Convite enviado para o motorista!' }
    }
    return { success: true, message: 'Veículo vinculado ao motorista existente!' }

  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message }
    }
    return { success: false, error: 'Erro desconhecido ao cadastrar.' }
  }
}