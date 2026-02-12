import { baseURL, requestMultipart } from './http'
import { BOOKING_TENANT_ID } from './constants'

const CUSTOMER_NAME_MARKER = 'SMOKE_TEST_TENANT46'

export type CreateBookingPayload = {
  vehicle_id: number
  tenant_id: number
  pickupPoint: string
  returnPoint: string
  startDateTime: string
  endDateTime: string
  options: Record<string, boolean>
  customer: {
    name: string
    surname: string
    email: string
    phone: string
    address: { street: string; city: string }
  }
}

export type CreateBookingResponse = {
  id: number
  booking_number: string
  status: string
  total_price: number
  message?: string
}

/**
 * Create a booking for tenant 46. Always sets customer name marker for cleanup.
 * Returns booking_number.
 */
export async function createBookingForTenant46(params: {
  vehicle_id: number
  pickupPoint?: string
  returnPoint?: string
  startDateTime?: string
  endDateTime?: string
}): Promise<string> {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() + 4)
  const end = new Date(start)
  end.setDate(end.getDate() + 4)

  const startDateTime = params.startDateTime ?? start.toISOString()
  const endDateTime = params.endDateTime ?? end.toISOString()
  const pickupPoint = params.pickupPoint ?? 'Test Pickup'
  const returnPoint = params.returnPoint ?? 'Test Return'

  const payload: CreateBookingPayload = {
    vehicle_id: params.vehicle_id,
    tenant_id: BOOKING_TENANT_ID,
    pickupPoint,
    returnPoint,
    startDateTime,
    endDateTime,
    options: {
      secondDriver: false,
      gps: false,
      maksikos: false,
      greenCard: false,
      europeanCard: false,
      roadAssistance: false,
      outOfKosovo: false,
    },
    customer: {
      name: CUSTOMER_NAME_MARKER,
      surname: 'E2E',
      email: 'test+tenant46@krahaso.co',
      phone: '+38300000000',
      address: { street: 'Test Street', city: 'Prishtina' },
    },
  }

  const formData = new FormData()
  formData.append('payload', JSON.stringify(payload))

  const { status, data } = await requestMultipart<CreateBookingResponse>(
    '/api/bookings/create',
    formData,
  )

  if (status !== 200 || !(data && typeof (data as CreateBookingResponse).booking_number === 'string')) {
    throw new Error(`Create booking failed: ${status} ${JSON.stringify(data)}`)
  }

  return (data as CreateBookingResponse).booking_number
}
