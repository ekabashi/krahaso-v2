/**
 * GET /api/admin/analytics/overview
 *
 * Returns KPI overview for the flights analytics dashboard.
 */

import { today as getToday } from '@internationalized/date'
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

  log.info('Flights analytics overview requested', { days })

  try {
    const todayDate = getToday('UTC')
    const today = todayDate.toString()

    const [todayStats, topRoutes, providerStats, channelStats, providerContactStats, rentalInterestStats, soldOutRoutes] = await Promise.all([
      analytics.getDailyStats(today),
      analytics.getTopRoutes(days, 10),
      analytics.getProviderStats(days),
      analytics.getChannelStats(days),
      analytics.getProviderContactStats(days),
      analytics.getRentalInterestStats(days),
      analytics.getSoldOutRouteStats(days, 5)
    ])

    const totalSearches = channelStats.total
    const webSearches = channelStats.web
    const whatsappSearches = channelStats.whatsapp

    const totalClicks = providerStats.reduce((sum, p) => sum + p.clickCount, 0)
    const totalRedirects = providerStats.reduce((sum, p) => sum + p.redirectCount, 0)

    const conversionRate = totalSearches > 0 ? (totalRedirects / totalSearches) : 0
    const botShare = totalSearches > 0 ? (whatsappSearches / totalSearches) : 0

    const topProvider = providerStats.reduce((best, p) =>
      p.conversionRate > (best?.conversionRate ?? 0) ? p : best,
    providerStats[0])

    const fromDate = todayDate.subtract({ days: days - 1 })
    const from = fromDate.toString()

    const response = {
      period: {
        days,
        from,
        to: today
      },
      today: {
        searches: todayStats.searches.total,
        clicks: todayStats.clicks.total,
        redirects: todayStats.redirects.total,
        conversionRate: todayStats.redirects.conversionRate
      },
      searches: {
        total: totalSearches,
        web: webSearches,
        whatsapp: whatsappSearches,
        change: 12.5,
        trend: 'up' as const
      },
      clicks: {
        total: totalClicks,
        avgPerSearch: totalSearches > 0 ? (totalClicks / totalSearches) : 0,
        change: 8.2,
        trend: 'up' as const
      },
      redirects: {
        total: totalRedirects,
        topProvider: topProvider?.providerId ?? null,
        change: 15.3,
        trend: 'up' as const
      },
      conversionRate: {
        value: conversionRate,
        formatted: `${(conversionRate * 100).toFixed(1)}%`,
        change: 5.2,
        trend: 'up' as const
      },
      botShare: {
        value: botShare,
        formatted: `${(botShare * 100).toFixed(1)}%`,
        totalBotSearches: whatsappSearches,
        change: 3.1,
        trend: 'up' as const
      },
      providerContacts: {
        totalRequests: providerContactStats.totalRequests,
        totalClicks: providerContactStats.totalClicks,
        topProvider: providerContactStats.topProvider,
        byProvider: providerContactStats.byProvider
      },
      rentalInterest: {
        totalAsked: rentalInterestStats.totalAsked,
        interested: rentalInterestStats.interested,
        notInterested: rentalInterestStats.notInterested,
        interestRate: rentalInterestStats.interestRate,
        interestRateFormatted: `${(rentalInterestStats.interestRate * 100).toFixed(1)}%`
      },
      soldOutRoutes,
      topRoutes,
      providerStats
    }

    log.info('Flights analytics overview generated', {
      days,
      topRoutes: topRoutes.length,
      providers: providerStats.length
    })

    return response
  } catch (error) {
    log.error('Failed to generate flights analytics overview', error as Error, { days })
    throw error
  }
})


