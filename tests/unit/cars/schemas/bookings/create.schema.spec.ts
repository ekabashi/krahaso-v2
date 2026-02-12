import { describe, it, expect } from 'vitest'
import {
  createBookingSchema,
  type CreateBookingInput,
} from '../../../../../layers/cars/server/schemas/bookings/create.schema'

const validCustomer = {
  name: 'John',
  surname: 'Doe',
  email: 'john@example.com',
  phone: '1234567890',
  address: { street: 'Main St', city: 'Prishtina' },
}

const validBase = {
  vehicle_id: 1,
  tenant_id: 1,
  pickupPoint: 'Prishtina',
  returnPoint: 'Prishtina',
  startDateTime: '2025-06-01T09:00',
  endDateTime: '2025-06-05T18:00',
  customer: validCustomer,
}

describe('cars/server/schemas/bookings/create.schema', () => {
  describe('createBookingSchema', () => {
    it('requires required fields', () => {
      expect(() => createBookingSchema.parse({})).toThrow()
      expect(() => createBookingSchema.parse({ ...validBase, vehicle_id: undefined })).toThrow()
      expect(() => createBookingSchema.parse({ ...validBase, customer: { ...validCustomer, name: '' } })).toThrow()
    })

    it('rejects vehicle_id min(1) and positive', () => {
      expect(() => createBookingSchema.parse({ ...validBase, vehicle_id: 0 })).toThrow()
      expect(() => createBookingSchema.parse({ ...validBase, vehicle_id: -1 })).toThrow()
    })

    it('lowercases customer email via common emailSchema', () => {
      const result = createBookingSchema.parse({
        ...validBase,
        options: {},
        customer: { ...validCustomer, email: '  John@Example.COM  ' },
      }) as CreateBookingInput
      expect(result.customer.email).toBe('john@example.com')
    })

    it('applies defaults for bookingOptions when omitted', () => {
      const result = createBookingSchema.parse({
        ...validBase,
        options: {},
      }) as CreateBookingInput
      expect(result.options).toBeDefined()
      expect(result.options.secondDriver).toBe(false)
      expect(result.options.gps).toBe(false)
      expect(result.options.maksikos).toBe(false)
      expect(result.options.greenCard).toBe(false)
      expect(result.options.europeanCard).toBe(false)
      expect(result.options.roadAssistance).toBe(false)
      expect(result.options.outOfKosovo).toBe(false)
    })

    it('accepts explicit options', () => {
      const result = createBookingSchema.parse({
        ...validBase,
        options: {
          secondDriver: true,
          gps: true,
          maksikos: false,
          greenCard: false,
          europeanCard: false,
          roadAssistance: false,
          outOfKosovo: false,
        },
      }) as CreateBookingInput
      expect(result.options.secondDriver).toBe(true)
      expect(result.options.gps).toBe(true)
    })
  })
})
