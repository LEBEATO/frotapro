'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useRouter } from 'next/navigation'

import {
  Bell,
  LogOut,
  Menu,
  Search,
  UserRound,
} from 'lucide-react'

import { normalizeRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/frotapro'

type DashboardHeaderProps = {
  onMenuClick: () => void
}

type HeaderProfile = {
  name: string
  email: string
  role: UserRole
}

function getRoleLabel(
  role: UserRole
): string {
  switch (role) {
    case 'admin':
      return 'Administrador'

    case 'fleet_manager':
      return 'Gestor Geral da Frota'

    case 'branch_manager':
      return 'Gestor de Base'

    case 'driver':
      return 'Motorista'

    default:
      return 'Usuário'
  }
}

export function DashboardHeader({
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter()

  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [profile, setProfile] =
    useState<HeaderProfile | null>(null)

  const [signingOut, setSigningOut] =
    useState(false)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (
          userError ||
          !user ||
          !mounted
        ) {
          return
        }

        const {
          data,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            'full_name, email, role'
          )
          .eq('id', user.id)
          .maybeSingle()

        if (
          profileError ||
          !mounted
        ) {
          return
        }

        setProfile({
          name:
            data?.full_name ||
            user.user_metadata
              ?.full_name ||
            user.email?.split('@')[0] ||
            'Usuário',

          email:
            data?.email ||
            user.email ||
            '',

          role:
            normalizeRole(
              data?.role
            ),
        })
      } catch (error) {
        console.error(
          'Erro ao carregar usuário do cabeçalho:',
          error
        )
      }
    }

    void loadUser()

    return () => {
      mounted = false
    }
  }, [supabase])

  async function handleSignOut() {
    if (signingOut) {
      return
    }

    try {
      setSigningOut(true)

      const {
        error,
      } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error(
        'Erro ao encerrar sessão:',
        error
      )
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
        >
          <Menu
            aria-hidden="true"
            className="h-5 w-5"
          />
        </button>

        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          />

          <input
            type="search"
            aria-label="Buscar no FrotaPro"
            placeholder="Buscar veículo, motorista, placa ou base..."
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-2">

          <button
            type="button"
            aria-label="Notificações"
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <Bell
              aria-hidden="true"
              className="h-5 w-5"
            />

            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"
            />
          </button>

          <div className="hidden min-w-0 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 sm:flex">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
              <UserRound
                aria-hidden="true"
                className="h-4 w-4"
              />
            </div>

            <div className="min-w-0">
              <p className="max-w-40 truncate text-xs font-semibold text-zinc-200">
                {profile?.name ??
                  'Carregando...'}
              </p>

              <p className="max-w-40 truncate text-[11px] text-zinc-500">
                {profile
                  ? getRoleLabel(
                      profile.role
                    )
                  : 'FrotaPro'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sair do sistema"
            title="Sair"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>

        </div>
      </div>
    </header>
  )
}