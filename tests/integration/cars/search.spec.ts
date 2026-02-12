import { describe, it, expect } from 'vitest'
import { searchCars } from '../../helpers/search'

describe('Cars Search Integration', () => {
  it('returns 200 and a list of cars (or empty array)', async () => {
    const start = new Date()
    start.setDate(start.getDate() + 4)
    const end = new Date(start)
    end.setDate(end.getDate() + 4)

    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)

    const { cars } = await searchCars({
      startDate,
      endDate,
      startTime: '09:00',
      endTime: '18:00',
      page: 1,
      limit: 5,
    })

    expect(Array.isArray(cars)).toBe(true)
    cars.forEach((item) => {
      expect(item).toHaveProperty('id')
      expect(typeof item.id).toBe('number')
      expect(item).toHaveProperty('tenant_id')
      expect(typeof item.tenant_id).toBe('number')
    })
  })
})
