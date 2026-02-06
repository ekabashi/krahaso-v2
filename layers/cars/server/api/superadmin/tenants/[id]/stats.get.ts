import type { H3Event } from 'h3'
import { TenantService } from '../../../../services/tenants/tenant.service'
import { getLogger } from '../../../../utils/logger'
import { requireSuperadminAuth } from '../../../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const log = getLogger(event)
  const tenantId = getRouterParam(event, 'id')

  if (!tenantId || isNaN(Number(tenantId))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid tenant ID',
    })
  }

  log.info('Fetching booking statistics for tenant', { tenantId })

  try {
    const tenantService = new TenantService(supabase)
    const stats = await tenantService.getTenantBookingStats(Number(tenantId))

    log.info('Booking statistics fetched successfully', {
      tenantId,
      totalBookings: stats.totalBookings,
    })

    return stats
  } catch (error) {
    log.error('Failed to fetch booking statistics', error as Error, {
      tenantId,
    })
    throw error
  }
})
