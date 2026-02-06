/**
 * Analytics Service
 *
 * Tracks user events for conversion optimization and revenue attribution
 */

import { db } from '../database/client'
import { analyticsEvents } from '../database/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { Flight } from '../types/provider'

// =============================================================================
// Types
// =============================================================================

export type Channel = 'web' | 'whatsapp'
export type EventType
  = | 'flight_search'
    | 'search_results_loaded'
    | 'flight_clicked'
    | 'provider_redirect'
    | 'bot_message_received'
    | 'bot_response_sent'
    | 'deeplink_opened'
    | 'provider_contact_requested'
    | 'provider_contact_clicked'
    | 'rental_car_interest'
    | 'route_no_availability'

export interface SearchContext {
  sessionId: string
  channel: Channel
  userId?: string
  language?: string
  userAgent?: string
  referrer?: string
  searchId?: string
  cacheHit?: boolean
  clickTarget?: string
  timeFromSearch?: number
  timeOnResults?: number
  clicksBeforeRedirect?: number
  affiliateId?: string
}

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  adults?: number
  children?: number
  infants?: number
}

export interface ProviderResult {
  providerId: string
  flights: Flight[]
  loadTime?: number
  error?: string
}

// =============================================================================
// Analytics Service
// =============================================================================

class AnalyticsService {
  /**
   * Track a generic event
   */
  async trackEvent(
    eventType: EventType,
    sessionId: string,
    channel: Channel,
    data: Record<string, unknown>,
    options?: { userId?: string, language?: string }
  ): Promise<string> {
    const id = crypto.randomUUID()
    const timestamp = Date.now()

    try {
      await db.insert(analyticsEvents).values({
        id,
        eventType,
        timestamp: new Date(timestamp),
        sessionId,
        userId: options?.userId ?? null,
        channel,
        language: options?.language ?? null,
        data
      })
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error)
    }

    return id
  }

  /**
   * Track flight search initiation
   */
  async trackSearch(params: FlightSearchParams, context: SearchContext): Promise<string> {
    // Use searchId from context if provided (from frontend), otherwise generate new one
    const searchId = context.searchId || crypto.randomUUID()
    const passengers = (params.adults ?? 1) + (params.children ?? 0) + (params.infants ?? 0)

    await this.trackEvent('flight_search', context.sessionId, context.channel, {
      searchId,
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      passengers: {
        adults: params.adults ?? 1,
        children: params.children ?? 0,
        infants: params.infants ?? 0,
        total: passengers
      },
      userAgent: context.userAgent,
      referrer: context.referrer
    }, {
      userId: context.userId,
      language: context.language
    })

    return searchId
  }

  /**
   * Track search results loaded
   */
  async trackSearchResults(
    searchId: string,
    results: ProviderResult[],
    context: SearchContext
  ): Promise<void> {
    const totalFlights = results.reduce((sum, r) => sum + r.flights.length, 0)
    const totalLoadTime = results.reduce((sum, r) => sum + (r.loadTime ?? 0), 0)

    const providerResults = results.map((r) => {
      const prices = r.flights.map(f => f.totalPrice).filter(p => p > 0)
      return {
        providerId: r.providerId,
        flightCount: r.flights.length,
        cheapestPrice: prices.length > 0 ? Math.min(...prices) : null,
        avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
        loadTime: r.loadTime,
        error: r.error
      }
    })

    await this.trackEvent('search_results_loaded', context.sessionId, context.channel, {
      searchId,
      totalFlights,
      providerResults,
      totalLoadTime,
      cacheHit: context.cacheHit ?? false
    }, {
      userId: context.userId,
      language: context.language
    })
  }

  /**
   * Track flight card click
   */
  async trackFlightClick(
    flight: Flight,
    searchId: string,
    resultPosition: number,
    totalResults: number,
    context: SearchContext
  ): Promise<void> {
    await this.trackEvent('flight_clicked', context.sessionId, context.channel, {
      searchId,
      flightId: flight.id,
      providerId: flight.providerId,
      flightNumber: flight.flightNumber,
      origin: flight.origin.code,
      destination: flight.destination.code,
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      totalPrice: flight.totalPrice,
      basePrice: flight.basePrice,
      taxPrice: flight.taxPrice,
      currency: flight.currency,
      resultPosition,
      totalResults,
      clickTarget: context.clickTarget ?? 'card'
    }, {
      userId: context.userId,
      language: context.language
    })
  }

  /**
   * Track redirect to provider booking page (CONVERSION!)
   */
  async trackProviderRedirect(
    flight: Flight,
    searchId: string,
    context: SearchContext
  ): Promise<void> {
    await this.trackEvent('provider_redirect', context.sessionId, context.channel, {
      searchId,
      flightId: flight.id,
      providerId: flight.providerId,
      providerUrl: flight.bookingUrl,
      affiliateId: context.affiliateId,
      flightNumber: flight.flightNumber,
      totalPrice: flight.totalPrice,
      currency: flight.currency,
      timeFromSearch: context.timeFromSearch,
      timeOnResults: context.timeOnResults,
      clicksBeforeRedirect: context.clicksBeforeRedirect ?? 0
    }, {
      userId: context.userId,
      language: context.language
    })
  }

  /**
   * Track WhatsApp bot message received
   */
  async trackBotMessageReceived(
    sessionId: string,
    data: {
      whatsappNumber: string
      messageId: string
      messageType: string
      messageLength?: number
      detectedIntent: string
      confidence?: number
      processingTime: number
    },
    language?: string
  ): Promise<void> {
    await this.trackEvent('bot_message_received', sessionId, 'whatsapp', data, { language })
  }

  /**
   * Track WhatsApp bot response sent
   */
  async trackBotResponseSent(
    sessionId: string,
    data: {
      messageId: string
      responseType: string
      flightCount?: number
      providerCount?: number
      totalTime: number
      includedDeepLinks: boolean
    },
    language?: string
  ): Promise<void> {
    await this.trackEvent('bot_response_sent', sessionId, 'whatsapp', data, { language })
  }

  /**
   * Track deeplink opened (WhatsApp → Web transition)
   */
  async trackDeeplinkOpened(
    sessionId: string,
    data: {
      deeplinkId?: string
      linkType: string
      origin: string
      searchParams?: {
        from?: string
        to?: string
        date?: string
        returnDate?: string
        passengers?: { adults: number, children: number, infants: number }
      }
      utmCampaign?: string
    }
  ): Promise<void> {
    await this.trackEvent('deeplink_opened', sessionId, 'web', data)
  }

  /**
   * Track provider contact request (WhatsApp Bot)
   */
  async trackProviderContactRequested(
    sessionId: string,
    data: {
      providerId: string
      providerFound: boolean
    },
    language?: string
  ): Promise<void> {
    await this.trackEvent('provider_contact_requested', sessionId, 'whatsapp', data, { language })
  }

  /**
   * Track provider contact link clicked (redirect tracking)
   */
  async trackProviderContactClicked(
    sessionId: string,
    data: {
      providerId: string
      contactType: 'web' | 'phone'
      destination: string
    }
  ): Promise<void> {
    await this.trackEvent('provider_contact_clicked', sessionId, 'whatsapp', data)
  }

  /**
   * Track rental car interest (WhatsApp Bot post-search)
   */
  async trackRentalCarInterest(
    sessionId: string,
    data: {
      interested: boolean
      whatsappNumber?: string
    },
    language?: string
  ): Promise<void> {
    await this.trackEvent('rental_car_interest', sessionId, 'whatsapp', data, { language })
  }

  /**
   * Track route with no availability (high demand but sold out)
   */
  async trackRouteNoAvailability(
    sessionId: string,
    data: {
      origin: string
      destination: string
      departureDate: string
      totalFlightsReturned: number
      soldOutFlights: number
      bookableFlights: number
      whatsappNumber?: string
    },
    language?: string
  ): Promise<void> {
    await this.trackEvent('route_no_availability', sessionId, 'whatsapp', data, { language })
  }

  // ===========================================================================
  // Aggregation Methods (for daily reports)
  // ===========================================================================

  /**
   * Get daily stats for a specific date
   */
  async getDailyStats(date: string): Promise<{
    searches: { total: number, web: number, whatsapp: number }
    results: { total: number, avgPerSearch: number, avgLoadTime: number }
    clicks: { total: number, perSearch: number }
    redirects: { total: number, conversionRate: number }
  }> {
    // Use UTC for consistent day boundaries across all servers
    const startOfDay = new Date(`${date}T00:00:00Z`).getTime()
    const endOfDay = new Date(`${date}T23:59:59.999Z`).getTime()

    // Get all events for the day
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          sql`${analyticsEvents.timestamp} >= ${startOfDay}`,
          sql`${analyticsEvents.timestamp} <= ${endOfDay}`
        )
      )

    const searches = events.filter(e => e.eventType === 'flight_search')
    const results = events.filter(e => e.eventType === 'search_results_loaded')
    const clicks = events.filter(e => e.eventType === 'flight_clicked')
    const redirects = events.filter(e => e.eventType === 'provider_redirect')

    const webSearches = searches.filter(e => e.channel === 'web').length
    const whatsappSearches = searches.filter(e => e.channel === 'whatsapp').length

    const totalFlights = results.reduce((sum, e) => {
      const data = e.data as { totalFlights?: number }
      return sum + (data.totalFlights ?? 0)
    }, 0)

    const totalLoadTime = results.reduce((sum, e) => {
      const data = e.data as { totalLoadTime?: number }
      return sum + (data.totalLoadTime ?? 0)
    }, 0)

    return {
      searches: {
        total: searches.length,
        web: webSearches,
        whatsapp: whatsappSearches
      },
      results: {
        total: results.length,
        avgPerSearch: searches.length > 0 ? totalFlights / searches.length : 0,
        avgLoadTime: results.length > 0 ? totalLoadTime / results.length : 0
      },
      clicks: {
        total: clicks.length,
        perSearch: searches.length > 0 ? clicks.length / searches.length : 0
      },
      redirects: {
        total: redirects.length,
        conversionRate: searches.length > 0 ? redirects.length / searches.length : 0
      }
    }
  }

  /**
   * Get top routes by search count
   */
  async getTopRoutes(days: number = 7, limit: number = 10): Promise<Array<{
    origin: string
    destination: string
    searchCount: number
    redirectCount: number
    conversionRate: number
  }>> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'flight_search'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    // Group by route
    const routeMap = new Map<string, { searches: number, redirects: number }>()

    for (const event of events) {
      const data = event.data as { origin?: string, destination?: string }
      if (!data.origin || !data.destination) continue

      const key = `${data.origin}-${data.destination}`
      const existing = routeMap.get(key) ?? { searches: 0, redirects: 0 }
      existing.searches++
      routeMap.set(key, existing)
    }

    // Get redirects
    const redirectEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'provider_redirect'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    // Build a map of searchId -> route from search events
    const searchIdToRoute = new Map<string, string>()
    for (const event of events) {
      const data = event.data as { searchId?: string, origin?: string, destination?: string }
      if (data.searchId && data.origin && data.destination) {
        searchIdToRoute.set(data.searchId, `${data.origin}-${data.destination}`)
      }
    }

    // Count redirects per route using searchId
    for (const event of redirectEvents) {
      const data = event.data as { searchId?: string }
      if (!data.searchId) continue

      const routeKey = searchIdToRoute.get(data.searchId)
      if (routeKey) {
        const existing = routeMap.get(routeKey)
        if (existing) {
          existing.redirects++
        }
      }
    }

    // Sort by search count and return top N
    return Array.from(routeMap.entries())
      .map(([key, stats]) => {
        const [origin, destination] = key.split('-')
        return {
          origin: origin ?? '',
          destination: destination ?? '',
          searchCount: stats.searches,
          redirectCount: stats.redirects,
          conversionRate: stats.searches > 0 ? stats.redirects / stats.searches : 0
        }
      })
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit)
  }

  /**
   * Get provider performance stats
   */
  async getProviderStats(days: number = 7): Promise<Array<{
    providerId: string
    searchCount: number
    resultCount: number
    clickCount: number
    redirectCount: number
    avgPrice: number
    ctr: number
    conversionRate: number
  }>> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

    const resultEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'search_results_loaded'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    const clickEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'flight_clicked'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    const redirectEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'provider_redirect'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    // Aggregate by provider
    const providerMap = new Map<string, {
      searches: number
      results: number
      clicks: number
      redirects: number
      totalPrice: number
      priceCount: number
    }>()

    for (const event of resultEvents) {
      const data = event.data as { providerResults?: Array<{ providerId: string, flightCount: number, avgPrice?: number }> }
      if (!data.providerResults) continue

      for (const pr of data.providerResults) {
        const existing = providerMap.get(pr.providerId) ?? {
          searches: 0, results: 0, clicks: 0, redirects: 0, totalPrice: 0, priceCount: 0
        }
        existing.searches++
        existing.results += pr.flightCount
        if (pr.avgPrice) {
          existing.totalPrice += pr.avgPrice
          existing.priceCount++
        }
        providerMap.set(pr.providerId, existing)
      }
    }

    for (const event of clickEvents) {
      const data = event.data as { providerId?: string }
      if (!data.providerId) continue
      const existing = providerMap.get(data.providerId)
      if (existing) existing.clicks++
    }

    for (const event of redirectEvents) {
      const data = event.data as { providerId?: string }
      if (!data.providerId) continue
      const existing = providerMap.get(data.providerId)
      if (existing) existing.redirects++
    }

    return Array.from(providerMap.entries()).map(([providerId, stats]) => ({
      providerId,
      searchCount: stats.searches,
      resultCount: stats.results,
      clickCount: stats.clicks,
      redirectCount: stats.redirects,
      avgPrice: stats.priceCount > 0 ? stats.totalPrice / stats.priceCount : 0,
      ctr: stats.results > 0 ? stats.clicks / stats.results : 0,
      conversionRate: stats.searches > 0 ? stats.redirects / stats.searches : 0
    }))
  }

  /**
   * Get provider contact request stats with click breakdown
   */
  async getProviderContactStats(days: number = 7): Promise<{
    totalRequests: number
    totalClicks: number
    byProvider: Array<{
      providerId: string
      requests: number
      webClicks: number
      phoneClicks: number
    }>
    topProvider: string | null
  }> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

    // Get contact requests
    const requestEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'provider_contact_requested'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    // Get contact clicks
    const clickEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'provider_contact_clicked'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    // Group by provider
    const providerMap = new Map<string, { requests: number, webClicks: number, phoneClicks: number }>()

    for (const event of requestEvents) {
      const data = event.data as { providerId?: string, providerFound?: boolean }
      if (data.providerId && data.providerFound) {
        const existing = providerMap.get(data.providerId) ?? { requests: 0, webClicks: 0, phoneClicks: 0 }
        existing.requests++
        providerMap.set(data.providerId, existing)
      }
    }

    for (const event of clickEvents) {
      const data = event.data as { providerId?: string, contactType?: 'web' | 'phone' }
      if (data.providerId) {
        const existing = providerMap.get(data.providerId) ?? { requests: 0, webClicks: 0, phoneClicks: 0 }
        if (data.contactType === 'phone') {
          existing.phoneClicks++
        } else {
          existing.webClicks++
        }
        providerMap.set(data.providerId, existing)
      }
    }

    const byProvider = Array.from(providerMap.entries())
      .map(([providerId, stats]) => ({
        providerId,
        requests: stats.requests,
        webClicks: stats.webClicks,
        phoneClicks: stats.phoneClicks
      }))
      .sort((a, b) => (b.webClicks + b.phoneClicks) - (a.webClicks + a.phoneClicks))

    const totalClicks = clickEvents.length

    return {
      totalRequests: requestEvents.filter(e => (e.data as any).providerFound).length,
      totalClicks,
      byProvider,
      topProvider: byProvider[0]?.providerId ?? null
    }
  }

  /**
   * Get channel stats for a period
   */
  async getChannelStats(days: number = 7): Promise<{
    total: number
    web: number
    whatsapp: number
  }> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'flight_search'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    const web = events.filter(e => e.channel === 'web').length
    const whatsapp = events.filter(e => e.channel === 'whatsapp').length

    return {
      total: events.length,
      web,
      whatsapp
    }
  }

  /**
   * Get rental car interest stats
   */
  async getRentalInterestStats(days: number = 7): Promise<{
    totalAsked: number
    interested: number
    notInterested: number
    interestRate: number
  }> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'rental_car_interest'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    const interested = events.filter(e => (e.data as { interested?: boolean }).interested === true).length
    const notInterested = events.filter(e => (e.data as { interested?: boolean }).interested === false).length
    const totalAsked = interested + notInterested

    return {
      totalAsked,
      interested,
      notInterested,
      interestRate: totalAsked > 0 ? interested / totalAsked : 0
    }
  }

  /**
   * Get high-demand routes with no availability (sold out routes)
   */
  async getSoldOutRouteStats(days: number = 7, limit: number = 10): Promise<Array<{
    origin: string
    destination: string
    requestCount: number
    avgSoldOutFlights: number
    lastRequested: string
  }>> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'route_no_availability'),
          sql`${analyticsEvents.timestamp} >= ${cutoff}`
        )
      )

    // Group by route
    const routeMap = new Map<string, {
      requests: number
      totalSoldOut: number
      lastTimestamp: number
    }>()

    for (const event of events) {
      const data = event.data as {
        origin?: string
        destination?: string
        soldOutFlights?: number
      }
      if (!data.origin || !data.destination) continue

      const key = `${data.origin}-${data.destination}`
      const existing = routeMap.get(key) ?? { requests: 0, totalSoldOut: 0, lastTimestamp: 0 }
      existing.requests++
      existing.totalSoldOut += data.soldOutFlights ?? 0
      existing.lastTimestamp = Math.max(existing.lastTimestamp, event.timestamp?.getTime() ?? 0)
      routeMap.set(key, existing)
    }

    // Sort by request count and return top N
    return Array.from(routeMap.entries())
      .map(([key, stats]) => {
        const [origin, destination] = key.split('-')
        return {
          origin: origin ?? '',
          destination: destination ?? '',
          requestCount: stats.requests,
          avgSoldOutFlights: stats.requests > 0 ? stats.totalSoldOut / stats.requests : 0,
          lastRequested: new Date(stats.lastTimestamp).toISOString()
        }
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, limit)
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()
