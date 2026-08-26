'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react'

import { getDashboardMenu } from '@/lib/navigation/dashboard-menu'
import type { UserRole } from '@/types/frotapro'

type MobileSidebarProps = {
  open: boolean
  onClose: () => void
  role: UserRole
}

export function MobileSidebar({
  open,
  onClose,
  role,
}: MobileSidebarProps) {
  const pathname = usePathname()
  const menu = getDashboardMenu(role)

  const homeHref =
    role === 'branch_manager'
      ? '/manager'
      : role === 'driver'
        ? '/driver'
        : '/admin'

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* FUNDO */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* PAINEL */}
      <aside className="relative flex h-full w-[88%] max-w-sm flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* CABEÇALHO */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
          <Link
            href={homeHref}
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/10 text-blue-400">
              <Truck
                aria-hidden="true"
                className="h-6 w-6"
              />
            </div>

            <div>
              <p className="font-bold text-white">
                FrotaPro
              </p>

              <p className="text-xs text-zinc-500">
                Gestão de Frotas
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Gestão
          </p>

          <nav className="space-y-1">
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
                  onClick={onClose}
                  className={[
                    'flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                  ].join(' ')}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />

                  <span>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {menu.system.length > 0 && (
            <>
              <div className="my-5 border-t border-zinc-800" />

              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Sistema
              </p>

              <nav className="space-y-1">
                {menu.system.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    pathname.startsWith(item.href)
                    return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={[
                        'flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                      ].join(' ')}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0"
                      />

                      <span>
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <ShieldCheck
                aria-hidden="true"
                className="h-4 w-4 text-emerald-400"
              />

              Sistema protegido
            </div>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Acesso controlado por autenticação, perfil e RLS.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}