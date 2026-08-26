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
} from 'lucide-react'

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

function SidebarLink({
  item,
}: {
  item: SidebarItem
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
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-xl lg:flex lg:flex-col">

      {/* LOGO */}

      <div className="flex h-20 items-center border-b border-zinc-800 px-6">
        <Link
          href="/admin"
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
          {mainItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
            />
          ))}
        </nav>

        <div className="my-5 border-t border-zinc-800" />

        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Sistema
        </div><nav
          aria-label="Menu do sistema"
          className="space-y-1"
        >
          {systemItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
            />
          ))}
        </nav>

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