import type { UserRole } from '@/types/frotapro'

export function normalizeRole(role?: string | null): UserRole {
  if (role === 'gestor' || role === 'manager') {
    return 'branch_manager'
  }

  if (role === 'motorista') {
    return 'driver'
  }

  if (
    role === 'admin' ||
    role === 'fleet_manager' ||
    role === 'branch_manager' ||
    role === 'driver'
  ) {
    return role
  }

  return 'driver'
}

export function getHomeByRole(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'fleet_manager':
      return '/admin'

    case 'branch_manager':
      return '/manager'

    case 'driver':
    default:
      return '/driver'
  }
}

export function isGlobalManager(role: UserRole): boolean {
  return role === 'admin' || role === 'fleet_manager'
}

export function isBranchManager(role: UserRole): boolean {
  return role === 'branch_manager'
}

export function isDriver(role: UserRole): boolean {
  return role === 'driver'
}