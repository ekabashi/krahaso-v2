import type { H3Event } from 'h3'
import { SettlementRequestService } from '../../../services/settlement/settlement-request.service'
import { requireSuperadminAuth } from '../../../utils/auth.utils'
import { getLogger } from '../../../utils/logger'
import { validateBody } from '../../../utils/validate'
import { z } from 'zod'

const updateStatusSchema = z.object({
  requestIds: z.array(z.string()).min(1, 'At least one request ID is required'),
  status: z.enum(['pending', 'approved', 'rejected', 'completed']),
})

export default defineEventHandler(async (event: H3Event) => {
  const { supabase: client } = await requireSuperadminAuth(event)
  const log = getLogger(event)

  log.info('Updating settlement request statuses')

  try {
    const rawBody = await readBody(event)
    const body = validateBody(updateStatusSchema, rawBody)

    const settlementRequestService = new SettlementRequestService(client)
    const updatedRequests = await settlementRequestService.updateMultipleRequestStatuses(
      body.requestIds,
      body.status
    )

    log.info('Settlement request statuses updated successfully', {
      requestIds: body.requestIds,
      status: body.status,
      count: updatedRequests.length,
    })

    return {
      data: updatedRequests,
      count: updatedRequests.length,
    }
  } catch (error) {
    log.error('Failed to update settlement request statuses', error as Error)
    throw error
  }
})
