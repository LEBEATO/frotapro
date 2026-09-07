export type FuelRecord = {
  id: string
  driver: string
  driver_email: string | null
  vehicle_model: string
  vehicle_plate: string
  fuel_type: string
  previous_km: number | null
  current_km: number | null
  liters: number | null
  submitted_at: string | null
  user_id: string | null
  branch_id: string | null
  vehicle_id: string | null
  driver_id: string | null
  total_amount: number | null
  price_per_liter: number | null
  fuel_station: string | null
  created_at: string
  updated_at: string
}

export type BranchRow = {
  id: string
  name: string
  code: string
  city: string
  active: boolean
}
