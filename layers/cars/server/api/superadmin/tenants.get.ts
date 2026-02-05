import type { H3Event } from 'h3'
import { TenantService } from '../../services/tenants/tenant.service'
import { getLogger } from '../../utils/logger'
import { requireSuperadminAuth } from '../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const log = getLogger(event)

  log.info('Fetching superadmin tenants')

  try {
    const tenantService = new TenantService(supabase)
    const tenants = await tenantService.getPartnershipTenants()

    log.info('Superadmin tenants fetched successfully', {
      totalTenants: tenants.length,
    })

    return tenants
  } catch (error) {
    log.error('Failed to fetch superadmin tenants', error as Error)
    throw error
  }
})
