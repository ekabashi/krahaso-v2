import type { H3Event } from 'h3'
import { SettlementRequestService } from '../../../services/settlement/settlement-request.service'
import { requireSuperadminAuth } from '../../../utils/auth.utils'
import { getLogger } from '../../../utils/logger'
import { validateQuery } from '../../../utils/validate'
import { tenantSettlementRequestsQuerySchema } from '../../../schemas/settlement-requests/query.schema'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase: client } = await requireSuperadminAuth(event)
  const log = getLogger(event)
  const rawQuery = getQuery(event)
  const tenantId = getRouterParam(event, 'tenantId')

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  const tenantIdNum = parseInt(tenantId, 10)
  if (isNaN(tenantIdNum)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tenant ID',
    })
  }

  const query = validateQuery(tenantSettlementRequestsQuerySchema, rawQuery)

  log.info('Fetching settlement requests for tenant', {
    tenantId: tenantIdNum,
    page: query.page,
    limit: query.limit,
    status: query.status,
  })

  try {
    const settlementRequestService = new SettlementRequestService(client)
    const result = await settlementRequestService.getRequestsByTenant(
      tenantIdNum,
      {
        page: query.page,
        limit: query.limit,
        status: query.status,
      }
    )
    log.info('Settlement requests for tenant fetched successfully', {
      tenantId: tenantIdNum,
      count: result.data.length,
      total: result.total,
      page: result.page,
    })
    return result
  } catch (error) {
    log.error('Failed to fetch settlement requests for tenant', error as Error)
    throw error
  }
})
