import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { BookingService } from '../../services/bookings/booking.service'
import { getLogger } from '../../utils/logger'
import { validateParams } from '../../utils/validate'
import { bookingByNumberParamsSchema } from '../../schemas/bookings/by-number.schema'

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)

  const { bookingNumber } = validateParams(bookingByNumberParamsSchema, {
    bookingNumber: getRouterParam(event, 'bookingNumber'),
  })

  log.info('Fetching booking by number', { bookingNumber })

  try {
    const bookingService = new BookingService(client)
    const booking = await bookingService.getBookingByNumber(bookingNumber)

    if (!booking) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { bookingNumber },
      })
    }

    log.info('Booking found successfully', {
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
    })
    return booking
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    log.error('Failed to fetch booking', error as Error, { bookingNumber })
    throw error
  }
})
