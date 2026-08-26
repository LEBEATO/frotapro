export type UserRole =
  | 'admin'
  | 'fleet_manager'
  | 'branch_manager'
  | 'driver'

export interface State {
  id: string
  name: string
  uf: string
  active: boolean
}

export interface Branch {
  id: string
  state_id: string
  name: string
  code: string
  city: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  branch_id: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  model: string
  plate: string
  year: string
  status: string
  mileage: number
  fuel_level: number
  driver_id: string | null
  current_branch_id: string | null
  created_at: string
  updated_at: string
}