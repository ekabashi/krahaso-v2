/**
 * GET /api/analytics/stats
 *
 * Get analytics statistics for dashboard.
 */

import { today as getToday } from '@internationalized/date'
import { analytics } from '../../services/analytics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days) || 7

  const [topRoutes, providerStats] = await Promise.all([
    analytics.getTopRoutes(days, 10),
    analytics.getProviderStats(days)
  ])

  // UTC for consistent cross-region boundaries
  const todayDate = getToday('UTC')
  const today = todayDate.toString()
  const todayStats = await analytics.getDailyStats(today)

  const fromDate = todayDate.subtract({ days: days - 1 })
  const from = fromDate.toString()

  return {
    period: {
      days,
      from,
      to: today
    },
    today: todayStats,
    topRoutes,
    providerStats
  }
})
