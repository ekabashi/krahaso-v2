import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { BookingService } from '../../services/bookings/booking.service'
import { getLogger } from '../../utils/logger'
import { validateQuery } from '../../utils/validate'
import { addressPointsQuerySchema } from '../../schemas/bookings/address-points.schema'

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)

  const { tenant_id: tenantId } = validateQuery(
    addressPointsQuerySchema,
    query,
  )

  log.info('Fetching booking address points', { tenantId })

  try {
    const bookingService = new BookingService(client)
    const addressPoints = await bookingService.getAddressPoints(tenantId)
    log.info('Address points fetched successfully', {
      tenantId,
      count: addressPoints.length,
    })
    return addressPoints
  } catch (error) {
    log.error('Failed to fetch address points', error as Error, { tenantId })
    throw error
  }
})
