import type { H3Event } from 'h3'
import { z } from 'zod'
import { PartnershipRequestService } from '../../../../services/partnership/partnership-request.service'
import { getLogger } from '../../../../utils/logger'
import { validateBody } from '../../../../utils/validate'
import { requireSuperadminAuth } from '../../../../utils/auth.utils'

const approveRequestSchema = z.object({
  percentage: z.number().min(0).max(100),
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

  log.info('Approving partnership request', { partnershipId })

  try {
    const rawBody = await readBody(event)
    const body = validateBody(approveRequestSchema, rawBody)
    const service = new PartnershipRequestService(supabase)
    const result = await service.approveRequest(partnershipId, body.percentage)
    log.info('Partnership request approved', {
      partnershipId,
      percentage: body.percentage,
    })
    return result
  } catch (error) {
    log.error('Failed to approve partnership request', error as Error, {
      partnershipId,
    })
    throw error
  }
})
