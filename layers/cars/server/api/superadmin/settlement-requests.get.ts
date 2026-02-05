import type { H3Event } from 'h3'
import { SettlementRequestService } from '../../services/settlement/settlement-request.service'
import { requireSuperadminAuth } from '../../utils/auth.utils'
import { getLogger } from '../../utils/logger'
import { validateQuery } from '../../utils/validate'
import { settlementRequestsQuerySchema } from '../../schemas/settlement-requests/query.schema'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase: client } = await requireSuperadminAuth(event)
  const log = getLogger(event)
  const rawQuery = getQuery(event)

  const query = validateQuery(settlementRequestsQuerySchema, rawQuery)

  log.info('Fetching settlement request summaries by tenant', {
    page: query.page,
    limit: query.limit,
    search: query.search,
  })

  try {
    const settlementRequestService = new SettlementRequestService(client)
    const result = await settlementRequestService.getTenantSummaries({
      page: query.page,
      limit: query.limit,
      search: query.search,
    })
    log.info('Settlement request summaries fetched successfully', {
      count: result.data.length,
      total: result.total,
      page: result.page,
    })
    return result
  } catch (error) {
    log.error('Failed to fetch settlement request summaries', error as Error)
    throw error
  }
})
