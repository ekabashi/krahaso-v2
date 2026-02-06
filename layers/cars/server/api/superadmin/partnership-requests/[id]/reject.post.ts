import type { H3Event } from 'h3'
import { PartnershipRequestService } from '../../../../services/partnership/partnership-request.service'
import { getLogger } from '../../../../utils/logger'
import { requireSuperadminAuth } from '../../../../utils/auth.utils'

export default defineEventHandler(async (event: H3Event) => {
  const { supabase } = await requireSuperadminAuth(event)
  const log = getLogger(event)
  const partnershipId = getRouterParam(event, 'id')

  if (!partnershipId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Partnership ID is required',
    })
  }

  log.info('Rejecting partnership request', { partnershipId })

  try {
    const service = new PartnershipRequestService(supabase)
    const result = await service.rejectRequest(partnershipId)
    log.info('Partnership request rejected', { partnershipId })
    return result
  } catch (error) {
    log.error('Failed to reject partnership request', error as Error, {
      partnershipId,
    })
    throw error
  }
})
