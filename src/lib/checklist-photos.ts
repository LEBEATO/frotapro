import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export const CHECKLIST_PHOTOS_BUCKET = 'checklist-photos'
export const CHECKLIST_PHOTO_SIGNED_URL_TTL = 300

const objectKeyPattern =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([^/]+)$/i

function getExpectedStorageOrigin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
  }

  return new URL(supabaseUrl).origin
}

function validateObjectKey(value: string, expectedOwnerId?: string) {
  const key = value.replace(/^\/+/, '')
  const match = objectKeyPattern.exec(key)

  if (!match || (expectedOwnerId && match[1] !== expectedOwnerId)) {
    return null
  }

  return key
}

export function extractChecklistPhotoKey(
  value: string,
  expectedOwnerId?: string
) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  if (!/^https?:\/\//i.test(trimmedValue)) {
    return validateObjectKey(trimmedValue, expectedOwnerId)
  }

  try {
    const url = new URL(trimmedValue)
    const expectedOrigin = getExpectedStorageOrigin()
    const prefix = `/storage/v1/object/public/${CHECKLIST_PHOTOS_BUCKET}/`

    if (url.origin !== expectedOrigin || !url.pathname.startsWith(prefix)) {
      return null
    }

    const encodedKey = url.pathname.slice(prefix.length)
    return validateObjectKey(decodeURIComponent(encodedKey), expectedOwnerId)
  } catch {
    return null
  }
}

export function extractChecklistPhotoKeys(
  photos: string[] | null | undefined,
  expectedOwnerId?: string
) {
  if (!Array.isArray(photos)) {
    return []
  }

  return photos.reduce<string[]>((keys, photo) => {
    if (typeof photo !== 'string') {
      return keys
    }

    const key = extractChecklistPhotoKey(photo, expectedOwnerId)

    if (key && !keys.includes(key)) {
      keys.push(key)
    }

    return keys
  }, [])
}

export async function createChecklistPhotoSignedUrls(keys: string[]) {
  const admin = createAdminClient()
  const signedUrls: string[] = []

  for (const key of keys) {
    const { data, error } = await admin.storage
      .from(CHECKLIST_PHOTOS_BUCKET)
      .createSignedUrl(key, CHECKLIST_PHOTO_SIGNED_URL_TTL)

    if (error || !data?.signedUrl) {
      throw new Error('Não foi possível gerar o acesso temporário às fotos.')
    }

    signedUrls.push(data.signedUrl)
  }

  return signedUrls
}
