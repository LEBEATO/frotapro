import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  createChecklistPhotoSignedUrls,
  extractChecklistPhotoKeys,
} from '@/lib/checklist-photos'
import { createServerClientWithCookies } from '@/lib/supabase/server'

const requestSchema = z.object({
  checklistId: z.string().uuid(),
})

type ChecklistPhotoRecord = {
  photos: string[] | null
  branch_id: string | null
  driver_id: string | null
}

type Profile = {
  role: string
  branch_id: string | null
  active: boolean
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Checklist inválido.' },
        { status: 400 }
      )
    }

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, branch_id, active')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json(
        { error: 'Não foi possível validar o perfil.' },
        { status: 500 }
      )
    }

    const currentProfile = profile as Profile | null
    const allowedRoles = ['admin', 'fleet_manager', 'branch_manager', 'driver']

    if (
      !currentProfile ||
      !currentProfile.active ||
      !allowedRoles.includes(currentProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado.' },
        { status: 403 }
      )
    }

    const { data: checklist, error: checklistError } = await supabase
      .from('driver_checklists')
      .select('photos, branch_id, driver_id')
      .eq('id', parsed.data.checklistId)
      .maybeSingle()

    if (checklistError) {
      return NextResponse.json(
        { error: 'Não foi possível localizar o checklist.' },
        { status: 500 }
      )
    }

    const currentChecklist = checklist as ChecklistPhotoRecord | null

    if (!currentChecklist) {
      return NextResponse.json(
        { error: 'Checklist não encontrado.' },
        { status: 404 }
      )
    }

    const canRead =
      currentProfile.role === 'admin' ||
      currentProfile.role === 'fleet_manager' ||
      (currentProfile.role === 'branch_manager' &&
        !!currentProfile.branch_id &&
        currentProfile.branch_id === currentChecklist.branch_id) ||
      (currentProfile.role === 'driver' &&
        currentChecklist.driver_id === user.id)

    if (!canRead) {
      return NextResponse.json(
        { error: 'Você não pode acessar as fotos deste checklist.' },
        { status: 403 }
      )
    }

    const keys = extractChecklistPhotoKeys(
      currentChecklist.photos,
      currentChecklist.driver_id ?? undefined
    )
    const urls = await createChecklistPhotoSignedUrls(keys)

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('Erro ao gerar URLs das fotos do checklist:', error)

    return NextResponse.json(
      { error: 'Não foi possível carregar as fotos do checklist.' },
      { status: 500 }
    )
  }
}
