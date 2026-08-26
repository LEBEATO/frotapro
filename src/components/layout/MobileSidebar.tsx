'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Building2,
  Car,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPinned,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react'

type MobileSidebarProps = {
  open: boolean
  onClose: () => void
}

type SidebarItem = {
  label: string
  href: string
  icon: React.ComponentType<{
    className?: string
  }>
}

const mainItems: SidebarItem[] = [
  {
    label: 'Visão geral',
    href: '/admin',
    icon: Gauge,
  },
  {
    label: 'Bases e unidades',
    href: '/admin/branches',
    icon: Building2,
  },
  {
    label: 'Estados',
    href: '/admin/states',
    icon: MapPinned,
  },
  {
    label: 'Veículos',
    href: '/admin/vehicles',
    icon: Car,
  },
  {
    label: 'Motoristas',
    href: '/admin/drivers',
    icon: Users,
  },
  {
    label: 'Checklists',
    href: '/admin/checklists',
    icon: ClipboardCheck,
  },
  {
    label: 'Abastecimentos',
    href: '/admin/fuel',
    icon: Fuel,
  },
  {
    label: 'Manutenções',
    href: '/maintenance',
    icon: Wrench,
  },
  {
    label: 'Relatórios',
    href: '/admin/reports',
    icon: BarChart3,
  },
]

const systemItems: SidebarItem[] = [
  {
    label: 'Auditoria',
    href: '/admin/audit',
    icon: ShieldCheck,
  },
  {
    label: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
  },
]

function MobileSidebarLink({
  item,
  onClose,
}: {
  item: SidebarItem
  onClose: () => void
}) {
  const pathname = usePathname()

  const isActive =
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname.startsWith(item.href)

  const Icon = item.icon

  return (
    <Link
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
}

export function MobileSidebar({
  open,
  onClose,
}: MobileSidebarProps) {
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
            href="/admin"
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

        <div className="flex-1 overflow-y-auto px-4 py-5"><p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Gestão
          </p>

          <nav className="space-y-1">
            {mainItems.map((item) => (
              <MobileSidebarLink
                key={item.href}
                item={item}
                onClose={onClose}
              />
            ))}
          </nav>

          <div className="my-5 border-t border-zinc-800" />

          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Sistema
          </p>

          <nav className="space-y-1">
            {systemItems.map((item) => (
              <MobileSidebarLink
                key={item.href}
                item={item}
                onClose={onClose}
              />
            ))}
          </nav>

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