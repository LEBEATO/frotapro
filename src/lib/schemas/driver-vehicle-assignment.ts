import { z } from 'zod'

const driverId = z.string().uuid('Motorista inválido.')
const assignmentId = z.string().uuid('Atribuição inválida.')
// vehicles.id é text no banco; não exigir UUID para veículos legados.
const vehicleId = z.string().min(1, 'Selecione um veículo.').refine(
  (value) => value.trim().length > 0,
  'Selecione um veículo.'
)

export const driverVehicleAssignmentSchema = z.discriminatedUnion('operation', [
  z.object({
    driver_id: driverId,
    operation: z.literal('assign'),
    vehicle_id: vehicleId,
    expected_assignment_id: z.null(),
  }).strict(),
  z.object({
    driver_id: driverId,
    operation: z.literal('replace'),
    vehicle_id: vehicleId,
    expected_assignment_id: assignmentId,
  }).strict(),
  z.object({
    driver_id: driverId,
    operation: z.literal('remove'),
    vehicle_id: z.null(),
    expected_assignment_id: assignmentId,
  }).strict(),
])
