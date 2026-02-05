import { z } from 'zod'

export const settlementRequestsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  search: z.string().optional().default(''),
})

export type SettlementRequestsQuery = z.infer<
  typeof settlementRequestsQuerySchema
>

export const tenantSettlementRequestsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(['pending', 'approved', 'rejected', 'completed'])
    .optional(),
})

export type TenantSettlementRequestsQuery = z.infer<
  typeof tenantSettlementRequestsQuerySchema
>
