import { describe, it, expect } from 'vitest'
import { searchCars, getFirstPickupCity } from '../../helpers/search'
import { pickCarForTenant46 } from '../../helpers/tenant46'
import { createBookingForTenant46 } from '../../helpers/booking'
import { requestJson } from '../../helpers/http'
import { BOOKING_TENANT_ID } from '../../helpers/constants'

describe('Booking Create and Fetch (tenant 46 only)', () => {
  it('search -> pick car tenant 46 -> create booking -> fetch by booking_number', async () => {
    const start = new Date()
    start.setDate(start.getDate() + 4)
    const end = new Date(start)
    end.setDate(end.getDate() + 4)
    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)
    const startTime = '09:00'
    const endTime = '18:00'
    const startDateTime = `${startDate}T${startTime}:00.000Z`
    const endDateTime = `${endDate}T${endTime}:00.000Z`

    const location = await getFirstPickupCity()

    const { cars } = await searchCars({
      startDate,
      endDate,
      startTime,
      endTime,
      ...(location && { location, dropoffLocation: location }),
      page: 1,
      limit: 50,
    })

    const car46 = pickCarForTenant46(cars)

    const bookingNumber = await createBookingForTenant46({
      vehicle_id: car46.vehicle_id,
      startDateTime,
      endDateTime,
      ...(location && { pickupPoint: location, returnPoint: location }),
    })

    expect(bookingNumber).toBeTruthy()
    expect(typeof bookingNumber).toBe('string')
    expect(bookingNumber.length).toBeGreaterThan(0)
    if (bookingNumber.includes('-')) {
      const prefix = bookingNumber.split('-')[0]
      expect(prefix).toBe(String(BOOKING_TENANT_ID))
    }

    const { status, data } = await requestJson<{ booking_number: string; tenant_id?: number }>(
      'GET',
      `/api/bookings/${encodeURIComponent(bookingNumber)}`,
    )

    expect(status).toBe(200)
    expect(data).toBeDefined()
    expect((data as { booking_number: string }).booking_number).toBe(bookingNumber)
    expect((data as { tenant_id?: number }).tenant_id).toBe(BOOKING_TENANT_ID)
  }, 20000)
})
