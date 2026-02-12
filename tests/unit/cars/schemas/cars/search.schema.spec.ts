import { describe, it, expect } from 'vitest'
import {
  carSearchQuerySchema,
  isVehicleIdSearch,
  type CarSearchQuery,
} from '../../../../../layers/cars/server/schemas/cars/search.schema'

describe('cars/server/schemas/cars/search.schema', () => {
  describe('carSearchQuerySchema', () => {
    it('parses vehicle_id flow (vehicleIdSearch)', () => {
      const result = carSearchQuerySchema.parse({
        vehicle_id: 42,
      })
      expect(result).toHaveProperty('vehicle_id', 42)
      expect(isVehicleIdSearch(result)).toBe(true)
    })

    it('parses vehicle_id with optional dates/times', () => {
      const result = carSearchQuerySchema.parse({
        vehicle_id: 1,
        startDate: '2025-06-01',
        endDate: '2025-06-05',
        startTime: '09:00',
        endTime: '18:00',
      })
      expect(result.vehicle_id).toBe(1)
      expect((result as { startDate?: string }).startDate).toBe('2025-06-01')
    })

    it('parses fullSearch flow with dates and filters', () => {
      const result = carSearchQuerySchema.parse({
        startDate: '2025-06-01',
        endDate: '2025-06-05',
        startTime: '09:00',
        endTime: '18:00',
        location: 'Prishtina',
        minPrice: 10,
        maxPrice: 100,
        page: 1,
        limit: 12,
      })
      expect(result).toHaveProperty('startDate', '2025-06-01')
      expect(result).toHaveProperty('endDate', '2025-06-05')
      expect(isVehicleIdSearch(result as CarSearchQuery)).toBe(false)
    })
  })

  describe('isVehicleIdSearch', () => {
    it('returns true when query has vehicle_id number', () => {
      expect(isVehicleIdSearch({ vehicle_id: 1 } as CarSearchQuery)).toBe(true)
      expect(isVehicleIdSearch({ vehicle_id: 99, startDate: '2025-01-01' } as CarSearchQuery)).toBe(true)
    })

    it('returns false when query has no vehicle_id', () => {
      expect(
        isVehicleIdSearch({
          startDate: '2025-06-01',
          endDate: '2025-06-05',
          startTime: '09:00',
          endTime: '18:00',
        } as CarSearchQuery),
      ).toBe(false)
    })
  })
})
