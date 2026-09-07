export type MaintenanceStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type MaintenanceRecord = {
  id: string
  vehicle_id: string | null
  vehicle_plate: string
  branch_id: string | null
  opened_by: string | null
  mechanic_name: string
  service_description: string
  maintenance_type: string | null
  mileage: number | null
  status: MaintenanceStatus | null
  notes: string | null
  workshop: string | null
  started_at: string
  completed_at: string | null
  created_at: string | null
}

export type MaintenanceView =
  MaintenanceRecord & {
    vehicle_model: string | null
    vehicle_status: string | null
    virtual: boolean
  }
