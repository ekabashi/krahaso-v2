/**
 * GET /api/admin/routes
 *
 * Returns route performance data from analytics events.
 */

import { analytics } from '../../../services/analytics'
import { requireFlightsAdminAuth } from '../../../utils/auth.utils'
import { getFlightsLogger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  await requireFlightsAdminAuth(event)
  const log = getFlightsLogger(event)

  const query = getQuery(event)

  const parsedDays = Number(query.days)
  const days = Number.isFinite(parsedDays) && parsedDays > 0
    ? Math.min(Math.trunc(parsedDays), 365)
    : 7

  const parsedLimit = Number(query.limit)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(Math.trunc(parsedLimit), 500)
    : 100

  log.info('Flights route analytics requested', { days, limit })

  try {
    const routes = await analytics.getTopRoutes(days, limit)

    log.info('Flights route analytics loaded', {
      days,
      limit,
      total: routes.length
    })

    return {
      routes,
      total: routes.length,
      days
    }
  } catch (error) {
    log.error('Failed to load flights route analytics', error as Error, { days, limit })
    throw error
  }
})


