export const maintenanceServices = [
  { value: 'engine_oil', label: 'Óleo do motor' },
  { value: 'oil_filter', label: 'Filtro de óleo' },
  { value: 'air_filter', label: 'Filtro de ar' },
  { value: 'transmission_filter', label: 'Filtro do câmbio' },
  { value: 'spark_plugs', label: 'Velas' },
  { value: 'timing_belt', label: 'Correia dentada' },
  { value: 'injector_cleaning', label: 'Limpeza de bicos' },
  { value: 'radiator_additive', label: 'Aditivo do radiador' },
  { value: 'brake_fluid', label: 'Fluido de freio' },
] as const

export type MaintenanceServiceType =
  (typeof maintenanceServices)[number]['value']

export type MaintenanceScheduleStatus =
  'overdue'
  | 'due_soon'
  | 'up_to_date'

export function getMaintenanceServiceLabel(
  serviceType: string
) {
  return maintenanceServices.find(
    (service) => service.value === serviceType
  )?.label ?? serviceType
}

export function getMaintenanceScheduleStatus(
  currentMileage: number,
  nextDueMileage: number
): MaintenanceScheduleStatus {
  if (currentMileage >= nextDueMileage) {
    return 'overdue'
  }

  if (nextDueMileage - currentMileage <= 1000) {
    return 'due_soon'
  }

  return 'up_to_date'
}
