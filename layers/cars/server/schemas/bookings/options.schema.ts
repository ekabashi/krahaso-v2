import { z } from 'zod'
import { tenantIdSchema } from '../common'

export const bookingOptionsQuerySchema = z.object({
  tenant_id: tenantIdSchema,
})

export type BookingOptionsQuery = z.infer<typeof bookingOptionsQuerySchema>
