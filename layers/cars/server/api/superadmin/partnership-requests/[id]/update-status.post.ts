import type { H3Event } from 'h3'
import { z } from 'zod'
import { PartnershipRequestService } from '../../../../services/partnership/partnership-request.service'
import { getLogger } from '../../../../utils/logger'
import { validateBody } from '../../../../utils/validate'
import { requireSuperadminAuth } from '../../../../utils/auth.utils'

const updateStatusSchema = z.object({
  is_partnership: z.boolean(),
})

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

  log.info('Updating partnership status', { partnershipId })

  try {
    const rawBody = await readBody(event)
    const body = validateBody(updateStatusSchema, rawBody)
    const service = new PartnershipRequestService(supabase)
    const result = await service.updatePartnershipStatus(
      partnershipId,
      body.is_partnership,
    )
    log.info('Partnership status updated', {
      partnershipId,
      is_partnership: body.is_partnership,
    })
    return result
  } catch (error) {
    log.error('Failed to update partnership status', error as Error, {
      partnershipId,
    })
    throw error
  }
})
