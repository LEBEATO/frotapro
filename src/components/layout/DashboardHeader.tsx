'use client'

import {
  Bell,
  Menu,
  Search,
  UserRound,
} from 'lucide-react'

type DashboardHeaderProps = {
  onMenuClick: () => void
}

export function DashboardHeader({
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* MENU MOBILE */}

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
        >
          <Menu
            aria-hidden="true"
            className="h-5 w-5"
          />
        </button>

        {/* BUSCA */}

        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          />

          <input
            type="search"
            placeholder="Buscar veículo, motorista, placa ou base..."
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* ESPAÇO NO MOBILE */}

        <div className="flex-1 md:hidden" />

        {/* AÇÕES */}

        <div className="flex items-center gap-2">

          <button
            type="button"
            aria-label="Notificações"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

          {/* PERFIL */}

          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
              <UserRound
                aria-hidden="true"
                className="h-4 w-4"
              />
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-32 truncate text-xs font-semibold text-zinc-200">
                Gestor
              </p>

              <p className="text-[11px] text-zinc-500">
                FrotaPro
              </p>
            </div>
          </button>

        </div>
      </div>
    </header>
  )
}