'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardHeader } from './DashboardHeader'
import { MobileSidebar } from './MobileSidebar'
import { Sidebar } from './Sidebar'

import { normalizeRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/frotapro'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({
  children,
}: AppShellProps) {
  const router = useRouter()
  const supabase = createClient()

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const [role, setRole] =
    useState<UserRole | null>(null)

  const [loadingProfile, setLoadingProfile] =
    useState(true)

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          router.replace('/login')
          return
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('role, branch_id, active')
          .eq('id', user.id)
          .maybeSingle()

        if (
          profileError ||
          !profile ||
          profile.active === false
        ) {
          await supabase.auth.signOut()

          router.replace(
            '/login?error=invalid_profile'
          )

          return
        }

        const normalizedRole =
          normalizeRole(profile.role)

        if (
          normalizedRole === 'branch_manager' &&
          !profile.branch_id
        ) {
          await supabase.auth.signOut()

          router.replace(
            '/login?error=branch_required'
          )

          return
        }

        if (mounted) {
          setRole(normalizedRole)
        }
      } catch (error) {
        console.error(
          'Erro ao carregar perfil:',
          error
        )

        router.replace('/login')
      } finally {
        if (mounted) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [router, supabase])

  if (loadingProfile || !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />

          <p className="text-sm text-zinc-500">
            Carregando FrotaPro...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <Sidebar role={role} />

      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() =>
          setMobileMenuOpen(false)
        }
        role={role}
      />

      <div className="lg:pl-72">
        <DashboardHeader
          onMenuClick={() =>
            setMobileMenuOpen(true)
          }
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}