import type { H3Event } from 'h3'
import { PartnershipRequestService } from '../../services/partnership/partnership-request.service'
import { getLogger } from '../../utils/logger'
import { validateQuery } from '../../utils/validate'
import { partnershipRequestsQuerySchema } from '../../schemas/partnership-requests/query.schema'
import { requireSuperadminAuth } from '../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const log = getLogger(event)
  const rawQuery = getQuery(event)
  const query = validateQuery(partnershipRequestsQuerySchema, rawQuery)

  log.info('Fetching partnership requests', {
    page: query.page,
    limit: query.limit,
    search: query.search,
  })

  try {
    const service = new PartnershipRequestService(supabase)
    const result = await service.getPendingRequests({
      page: query.page,
      limit: query.limit,
      search: query.search,
    })
    log.info('Partnership requests fetched', {
      count: result.data.length,
      total: result.total,
      page: result.page,
    })
    return result
  } catch (error) {
    log.error('Failed to fetch partnership requests', error as Error)
    throw error
  }
})
