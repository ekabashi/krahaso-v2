import { describe, it, expect } from 'vitest'
import { customerByEmailQuerySchema } from '../../../../../layers/cars/server/schemas/customers/by-email.schema'

describe('cars/server/schemas/customers/by-email.schema', () => {
  it('parses valid email and tenant_id', () => {
    const result = customerByEmailQuerySchema.parse({
      email: 'user@example.com',
      tenant_id: 1,
    })
    expect(result.email).toBe('user@example.com')
    expect(result.tenant_id).toBe(1)
  })

  it('coerces tenant_id string to number', () => {
    const result = customerByEmailQuerySchema.parse({
      email: 'a@b.co',
      tenant_id: '2',
    })
    expect(result.tenant_id).toBe(2)
  })

  it('fails for invalid email', () => {
    expect(() =>
      customerByEmailQuerySchema.parse({
        email: 'invalid',
        tenant_id: 1,
      }),
    ).toThrow()
  })

  it('fails for invalid tenant_id (0 or negative)', () => {
    expect(() =>
      customerByEmailQuerySchema.parse({
        email: 'user@example.com',
        tenant_id: 0,
      }),
    ).toThrow()
    expect(() =>
      customerByEmailQuerySchema.parse({
        email: 'user@example.com',
        tenant_id: -1,
      }),
    ).toThrow()
  })
})
