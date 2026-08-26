'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShieldCheck,
  Truck,
} from 'lucide-react'

import { getDashboardMenu } from '@/lib/navigation/dashboard-menu'
import type { UserRole } from '@/types/frotapro'

type SidebarProps = {
  role: UserRole
}

export function Sidebar({
  role,
}: SidebarProps) {
  const pathname = usePathname()
  const menu = getDashboardMenu(role)

  const homeHref =
    role === 'branch_manager'
      ? '/manager'
      : role === 'driver'
        ? '/driver'
        : '/admin'

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-xl lg:flex lg:flex-col">

      {/* LOGO */}

      <div className="flex h-20 items-center border-b border-zinc-800 px-6">
        <Link
          href={homeHref}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10 text-blue-400">
            <Truck
              aria-hidden="true"
              className="h-6 w-6"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-white">
              FrotaPro
            </p>

            <p className="text-xs text-zinc-500">
              Gestão de Frotas
            </p>
          </div>
        </Link>
      </div>

      {/* MENU */}

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Gestão
        </div>

        <nav
          aria-label="Menu principal"
          className="space-y-1"
        >
          {menu.main.map((item) => {
            const Icon = item.icon

            const isActive =
              item.href === homeHref
                ? pathname === item.href
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                ].join(' ')}
              >
                <Icon
                  aria-hidden="true"
                  className={[
                    'h-5 w-5 shrink-0 transition',
                    isActive
                      ? 'text-white'
                      : 'text-zinc-500 group-hover:text-zinc-300',
                  ].join(' ')}
                />

                <span className="truncate">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {menu.system.length > 0 && (
          <>
            <div className="my-5 border-t border-zinc-800" />

            <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Sistema
            </div>

            <nav
              aria-label="Menu do sistema"
              className="space-y-1"
            >
              {menu.system.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                    ].join(' ')}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0"
                    />

                    <span className="truncate">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </>
        )}
      </div>

      {/* RODAPÉ */}

      <div className="border-t border-zinc-800 p-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
            <ShieldCheck
              aria-hidden="true"
              className="h-4 w-4 text-emerald-400"
            />

            Sistema protegido
          </div>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Supabase Auth, RLS e controle de acesso por perfil.
          </p>
        </div>
      </div>
    </aside>
  )
}