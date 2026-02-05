import type { H3Event } from 'h3'
import { TenantService } from '../../../services/tenants/tenant.service'
import { getLogger } from '../../../utils/logger'
import { requireSuperadminAuth } from '../../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const config = useRuntimeConfig(event)
  const createdBy = (config as { superadminCreatedBy?: string }).superadminCreatedBy ?? 'krahaso'
  const log = getLogger(event)

  log.info('Fetching dashboard statistics')

  try {
    const tenantService = new TenantService(supabase)
    const stats = await tenantService.getDashboardStats(createdBy)

    log.info('Dashboard statistics fetched successfully', {
      totalBookings: stats.totalBookings,
      activeCars: stats.activeCars,
      totalFee: stats.totalFee,
      totalRevenue: stats.totalRevenue,
    })

    return stats
  } catch (error) {
    log.error('Failed to fetch dashboard statistics', error as Error)
    throw error
  }
})
