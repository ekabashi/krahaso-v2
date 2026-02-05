import type { H3Event } from 'h3'
import { TenantService } from '../../../services/tenants/tenant.service'
import { getLogger } from '../../../utils/logger'
import { requireSuperadminAuth } from '../../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const config = useRuntimeConfig(event)
  const createdBy = (config as { superadminCreatedBy?: string }).superadminCreatedBy ?? 'krahaso'
  const log = getLogger(event)

  log.info('Fetching monthly revenue data')

  try {
    const tenantService = new TenantService(supabase)
    const monthlyRevenue = await tenantService.getMonthlyRevenue(createdBy)

    log.info('Monthly revenue data fetched successfully', {
      dataPoints: monthlyRevenue.length,
    })

    return monthlyRevenue
  } catch (error) {
    log.error('Failed to fetch monthly revenue data', error as Error)
    throw error
  }
})
