export interface ChecklistItem {
  name: string
  value?: 'SIM' | 'NÃO'
  ok: boolean
}

export interface Checklist {
  id: string
  created_at: string
  driver: string | null
  driver_email: string | null
  vehicle_plate: string | null
  vehicle_model: string | null
  items: ChecklistItem[] | null
  has_issue: boolean
  observation: string | null
  photos: string[] | null
  branch_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
}
