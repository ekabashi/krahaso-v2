import { z } from 'zod'
import { tenantIdSchema, emailSchema } from '../common'

export const customerByEmailQuerySchema = z.object({
  email: emailSchema,
  tenant_id: tenantIdSchema,
})

export type CustomerByEmailQuery = z.infer<typeof customerByEmailQuerySchema>
