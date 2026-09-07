interface VehicleStatusAppearance {
  label: 'Ativo' | 'Inativo' | 'Manutenção'
  variant: 'success' | 'neutral' | 'warning'
}

// Preserva a apresentação das listagens de veículos, inclusive o fallback
// para valores desconhecidos. Não normaliza nem altera o status persistido.
export function getVehicleStatusAppearance(status: string | null): VehicleStatusAppearance {
  const value = status ?? 'Ativo'

  if (value === 'Manutenção') {
    return { label: 'Manutenção', variant: 'warning' }
  }

  if (value === 'Inativo') {
    return { label: 'Inativo', variant: 'neutral' }
  }

  return { label: 'Ativo', variant: 'success' }
}
