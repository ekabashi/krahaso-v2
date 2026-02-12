import { BOOKING_TENANT_ID } from './constants'
import type { CarItem } from './search'

export type PickCarResult = {
  vehicle_id: number
  tenant_id: number
}

/**
 * Pick the first car from search results where car.tenant_id === BOOKING_TENANT_ID (46).
 * Throws if none found (required for booking tests).
 */
export function pickCarForTenant46(cars: CarItem[]): PickCarResult {
  const car = cars.find((c) => Number(c.tenant_id) === BOOKING_TENANT_ID)
  if (!car) {
    throw new Error('No available cars for tenant 46 in this environment')
  }
  return {
    vehicle_id: Number(car.id),
    tenant_id: BOOKING_TENANT_ID,
  }
}
