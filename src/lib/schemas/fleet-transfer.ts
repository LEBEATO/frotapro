import { z } from 'zod'

export const fleetTransferSchema = z.object({
  entityType: z.enum(['driver', 'vehicle']),
  entityId: z.string().trim().min(1),
  targetBranchId: z.string().uuid(),
  expectedBranchId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
})

export type FleetTransferInput = z.infer<typeof fleetTransferSchema>
