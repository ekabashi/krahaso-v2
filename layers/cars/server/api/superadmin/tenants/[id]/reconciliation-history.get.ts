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

  log.info('Fetching reconciliation history for tenant', { tenantId })

  try {
    const tenantService = new TenantService(supabase)
    const history = await tenantService.getTenantReconciliationHistory(
      Number(tenantId)
    )

    log.info('Reconciliation history fetched successfully', {
      tenantId,
      historyEntries: history.history.length,
    })

    return history
  } catch (error) {
    log.error('Failed to fetch reconciliation history', error as Error, {
      tenantId,
    })
    throw error
  }
})
