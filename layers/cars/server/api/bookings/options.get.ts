import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { BookingService } from '../../services/bookings/booking.service'
import { getLogger } from '../../utils/logger'
import { validateQuery } from '../../utils/validate'
import { bookingOptionsQuerySchema } from '../../schemas/bookings/options.schema'

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)

  const { tenant_id: tenantId } = validateQuery(
    bookingOptionsQuerySchema,
    query,
  )

  log.info('Fetching booking options', { tenantId })

  try {
    const bookingService = new BookingService(client)
    const options = await bookingService.getOptions(tenantId)
    log.info('Booking options fetched successfully', { tenantId })
    return options
  } catch (error) {
    log.error('Failed to fetch booking options', error as Error, { tenantId })
    throw error
  }
})
