export type VehicleFuelStat = {
  key: string

  vehicleId: string | null
  vehicleModel: string
  vehiclePlate: string

  fuelType: string

  records: number

  averageKmPerLiter: number
  averageCostPerKm: number
  averagePricePerLiter: number

  totalDistance: number
  totalLiters: number
  totalAmount: number

  lastFuelAt: string | null

  latestKmPerLiter: number
  differencePercent: number | null
}

