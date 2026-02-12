import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

const createErrorMock = vi.fn((opts: { statusCode: number; statusMessage?: string; data?: unknown }) => {
  const err = new Error(opts.statusMessage ?? 'Validation failed') as Error & { statusCode: number; data?: unknown }
  err.statusCode = opts.statusCode
  err.data = opts.data
  throw err
})

vi.mock('h3', () => ({ createError: createErrorMock }))

const schema = z.object({ id: z.number(), name: z.string() })

describe('cars/server/utils/validate', () => {
  beforeEach(() => {
    createErrorMock.mockClear()
  })

  describe('validateQuery', () => {
    it('throws error with statusCode 400 when schema.safeParse fails', async () => {
      const { validateQuery } = await import('../../../../layers/cars/server/utils/validate')
      expect(() => validateQuery(schema, { id: 'not-a-number' })).toThrow()
      expect(createErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: 'Validation failed',
        }),
      )
    })

    it('returns parsed data when schema passes', async () => {
      const { validateQuery } = await import('../../../../layers/cars/server/utils/validate')
      const result = validateQuery(schema, { id: 1, name: 'test' })
      expect(result).toEqual({ id: 1, name: 'test' })
      expect(createErrorMock).not.toHaveBeenCalled()
    })
  })

  describe('validateBody', () => {
    it('throws error with statusCode 400 when schema.safeParse fails', async () => {
      const { validateBody } = await import('../../../../layers/cars/server/utils/validate')
      expect(() => validateBody(schema, null)).toThrow()
      expect(createErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      )
    })

    it('returns parsed data when schema passes', async () => {
      const { validateBody } = await import('../../../../layers/cars/server/utils/validate')
      const result = validateBody(schema, { id: 2, name: 'body' })
      expect(result).toEqual({ id: 2, name: 'body' })
      expect(createErrorMock).not.toHaveBeenCalled()
    })
  })

  describe('validateParams', () => {
    it('throws error with statusCode 400 when schema.safeParse fails', async () => {
      const { validateParams } = await import('../../../../layers/cars/server/utils/validate')
      expect(() => validateParams(schema, { id: -1 })).toThrow()
      expect(createErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      )
    })

    it('returns parsed data when schema passes', async () => {
      const { validateParams } = await import('../../../../layers/cars/server/utils/validate')
      const result = validateParams(schema, { id: 3, name: 'params' })
      expect(result).toEqual({ id: 3, name: 'params' })
      expect(createErrorMock).not.toHaveBeenCalled()
    })
  })
})
