import {
  Building2,
  Car,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPinned,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'

import type { UserRole } from '@/types/frotapro'

export type DashboardMenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{
    className?: string
  }>
}

type DashboardMenu = {
  main: DashboardMenuItem[]
  system: DashboardMenuItem[]
}

// =====================================================
// ADMIN
// =====================================================

const adminMenu: DashboardMenu = {
  main: [
    {
      label: 'Visão geral',
      href: '/admin',
      icon: Gauge,
    },
    {
      label: 'Estados',
      href: '/admin/states',
      icon: MapPinned,
    },
    {
      label: 'Bases e unidades',
      href: '/admin/branches',
      icon: Building2,
    },
    {
      label: 'Gestores',
      href: '/admin/managers',
      icon: UserCog,
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
  ],

  system: [],
}

// =====================================================
// GESTOR DA BASE
// =====================================================

const managerMenu: DashboardMenu = {
  main: [
    {
      label: 'Visão da base',
      href: '/manager',
      icon: Gauge,
    },
    {
      label: 'Veículos',
      href: '/manager/vehicles',
      icon: Car,
    },
    {
      label: 'Motoristas',
      href: '/manager/drivers',
      icon: Users,
    },
    {
      label: 'Checklists',
      href: '/manager/checklists',
      icon: ClipboardCheck,
    },
    {
      label: 'Abastecimentos',
      href: '/manager/fuel',
      icon: Fuel,
    },
    {
      label: 'Manutenções',
      href: '/maintenance',
      icon: Wrench,
    },
  ],

  system: [],
}

// =====================================================
// MOTORISTA
// =====================================================

const driverMenu: DashboardMenu = {
  main: [
    {
      label: 'Meu painel',
      href: '/driver',
      icon: Gauge,
    },
    {
      label: 'Checklist',
      href: '/driver/checklist',
      icon: ClipboardCheck,
    },
    {
      label: 'Abastecimento',
      href: '/driver/fuel',
      icon: Fuel,
    },
  ],

  system: [],
}

// =====================================================
// MENU POR PERFIL
// =====================================================

export function getDashboardMenu(
  role: UserRole
): DashboardMenu {
  if (
    role === 'admin' ||
    role === 'fleet_manager'
  ) {
    return adminMenu
  }

  if (role === 'branch_manager') {
    return managerMenu
  }

  return driverMenu
}