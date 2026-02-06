import { z } from 'zod'

export const partnershipRequestsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100).default(10)),
  search: z.string().optional().default(''),
})

export type PartnershipRequestsQuery = z.infer<
  typeof partnershipRequestsQuerySchema
>
