import { test, expect } from '@playwright/test'
import { searchCars, getFirstPickupCity } from '../../helpers/search'
import { pickCarForTenant46 } from '../../helpers/tenant46'
import { createBookingForTenant46 } from '../../helpers/booking'
import { requestJson } from '../../helpers/http'
import { BOOKING_TENANT_ID } from '../../helpers/constants'

test.describe('Booking smoke (tenant 46 only)', () => {
  test('API setup: create booking tenant 46 -> open /booking/:id -> page shows details', async ({
    page,
  }) => {
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

    const { status, data } = await requestJson<{ tenant_id?: number }>(
      'GET',
      `/api/bookings/${encodeURIComponent(bookingNumber)}`,
    )
    expect(status).toBe(200)
    expect((data as { tenant_id?: number }).tenant_id).toBe(BOOKING_TENANT_ID)

    await page.goto(`/sq/booking/${bookingNumber}`)
    await expect(page).toHaveURL(new RegExp(`/sq/booking/${bookingNumber}`))
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')

    try {
      await expect(page.getByText(bookingNumber, { exact: false })).toBeVisible({ timeout: 25000 })
    } catch {
      const errText = await page.getByText(/not found|nuk u gjet|could not find|konnte nicht/i).first().textContent().catch(() => '')
      if (errText) throw new Error(`Booking page showed error/not found (API returned 200): ${errText.trim()}`)
      throw new Error('Booking number did not appear on page (API confirmed booking exists). Check hydration or client fetch.')
    }
  })
})
