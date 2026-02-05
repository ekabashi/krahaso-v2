import type { H3Event } from 'h3'
import { BookingService } from '../../services/bookings/booking.service'
import { getLogger } from '../../utils/logger'
import { requireSuperadminAuth } from '../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const config = useRuntimeConfig(event)
  const createdBy = (config as { superadminCreatedBy?: string }).superadminCreatedBy ?? 'krahaso'
  const log = getLogger(event)

  log.info('Fetching superadmin bookings')

  try {
    const bookingService = new BookingService(supabase)
    const bookings = await bookingService.getSuperadminBookings(createdBy)

    log.info('Superadmin bookings fetched successfully', {
      totalBookings: bookings.length,
    })

    return bookings
  } catch (error) {
    log.error('Failed to fetch superadmin bookings', error as Error)
    throw error
  }
})
