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

    // Criação do motorista (sem variável não usada)
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.driver_email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: formData.driver_name,
        role: 'driver',
      },
    })

    if (authError && !authError.message.includes('already been registered')) {
      throw new Error(`Erro ao criar motorista: ${authError.message}`)
    }

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
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message }
    }
    return { success: false, error: 'Erro desconhecido ao cadastrar.' }
  }
}