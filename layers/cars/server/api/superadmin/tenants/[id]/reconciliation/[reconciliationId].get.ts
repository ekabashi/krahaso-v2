import type { H3Event } from 'h3'
import { TenantService } from '../../../../../services/tenants/tenant.service'
import { getLogger } from '../../../../../utils/logger'
import { requireSuperadminAuth } from '../../../../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const log = getLogger(event)
  const reconciliationId = getRouterParam(event, 'reconciliationId')
  const tenantId = getRouterParam(event, 'id')

  if (!reconciliationId || isNaN(Number(reconciliationId))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid reconciliation ID',
    })
  }

  log.info('Fetching reconciliation details', { reconciliationId, tenantId })

  try {
    const tenantService = new TenantService(supabase)
    const details = await tenantService.getReconciliationDetails(
      Number(reconciliationId)
    )

    // Optional: Verify tenant ID matches
    if (tenantId && details.tenant_id !== Number(tenantId)) {
      throw createError({
        statusCode: 403,
        message: 'Reconciliation record does not belong to this tenant',
      })
    }

    log.info('Reconciliation details fetched successfully', {
      reconciliationId,
      bookingsCount: details.bookings.length,
    })

    return details
  } catch (error) {
    log.error('Failed to fetch reconciliation details', error as Error, {
      reconciliationId,
    })
    throw error
  }
})
