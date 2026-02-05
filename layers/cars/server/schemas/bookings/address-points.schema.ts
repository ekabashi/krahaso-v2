import { z } from 'zod'
import { tenantIdSchema } from '../common'

export const addressPointsQuerySchema = z.object({
  tenant_id: tenantIdSchema,
})

export type AddressPointsQuery = z.infer<typeof addressPointsQuerySchema>
