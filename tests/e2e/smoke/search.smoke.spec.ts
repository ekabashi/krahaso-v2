import { test, expect } from '@playwright/test'
import { searchCars } from '../../helpers/search'

test.describe('Search smoke', () => {
  test('search API returns 200 and list of cars or empty array', async () => {
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
  })
})
