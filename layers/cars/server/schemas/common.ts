import { z } from 'zod'

export const tenantIdSchema = z.coerce.number().int().positive({
  message: 'tenant_id must be a positive integer',
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const emailSchema = z
  .string()
  .trim()
  .transform((val) => val.toLowerCase())
  .pipe(z.string().email('Invalid email format'))

export const phoneSchema = z
  .string()
  .min(6, 'Phone number too short')
  .max(20, 'Phone number too long')
  .trim()

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
})

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

export const timeSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')

const commaSeparatedToArray = z
  .string()
  .transform((val) =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string()))

const commaSeparatedToNumberArray = z
  .string()
  .transform((val) =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
  )
  .pipe(z.array(z.number()))

export const optionalCommaSeparatedToArray = commaSeparatedToArray.optional()
export const optionalCommaSeparatedToNumberArray =
  commaSeparatedToNumberArray.optional()
