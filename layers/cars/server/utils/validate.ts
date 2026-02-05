import type { ZodSchema } from 'zod'

export function validateQuery<T>(schema: ZodSchema<T>, raw: unknown): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.flatten(),
    })
  }
  return result.data
}

export function validateBody<T>(schema: ZodSchema<T>, raw: unknown): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.flatten(),
    })
  }
  return result.data
}

export function validateParams<T>(schema: ZodSchema<T>, raw: unknown): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.flatten(),
    })
  }
  return result.data
}
