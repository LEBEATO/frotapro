import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

export const vehicleSchema = z.object({
  model: z.string().min(2, 'Modelo é obrigatório'),
  plate: z.string().min(7, 'Placa inválida').max(8, 'Placa inválida'),
  year: z.string().min(4, 'Ano inválido'),
  driver_name: z.string().min(2, 'Nome do motorista é obrigatório'),
  driver_email: z.string().email('E-mail do motorista inválido'),
  password: z.string().optional(), //  AGORA OPCIONAL
})

export type VehicleFormData = z.infer<typeof vehicleSchema>