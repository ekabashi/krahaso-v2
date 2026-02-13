/**
 * POST /api/analytics/track
 *
 * Track analytics events from frontend and bot integrations.
 */

import { analytics } from '../../services/analytics'
import { checkRateLimit, getClientIP, isAllowedOrigin } from '../../utils/rate-limit'
import type { Flight } from '../../types/provider'

interface TrackRequestBody {
  event:
    | 'flight_clicked'
    | 'provider_redirect'
    | 'bot_message_received'
    | 'bot_response_sent'
    | 'flight_search'
    | 'deeplink_opened'
    | 'provider_contact_requested'
    | 'rental_car_interest'
    | 'route_no_availability'
  sessionId: string
  searchId?: string
  language?: string

  // For flight_clicked and provider_redirect
  flight?: Flight
  resultPosition?: number
  totalResults?: number
  clickTarget?: string

  // For provider_redirect
  timeFromSearch?: number
  timeOnResults?: number
  clicksBeforeRedirect?: number

  // For bot events
  whatsappNumber?: string
  messageId?: string
  messageType?: string
  messageLength?: number
  detectedIntent?: string
  confidence?: number
  processingTime?: number
  responseType?: string
  flightCount?: number
  providerCount?: number
  totalTime?: number
  includedDeepLinks?: boolean

  // For flight_search
  origin?: string
  destination?: string
  departureDate?: string
  returnDate?: string
  passengers?: { adults: number, children: number, infants: number }

  // For deeplink_opened
  deeplinkId?: string
  linkType?: string
  searchParams?: {
    from?: string
    to?: string
    date?: string
    returnDate?: string
    passengers?: { adults: number, children: number, infants: number }
  }
  utmCampaign?: string

  // For provider_contact_requested
  providerId?: string
  providerFound?: boolean

  // For rental_car_interest
  interested?: boolean

  // For route_no_availability
  totalFlightsReturned?: number
  soldOutFlights?: number
  bookableFlights?: number
}

export default defineEventHandler(async (event) => {
  // Origin check
  if (!isAllowedOrigin(event)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden'
    })
  }

  // Rate limiting - max 30 requests per minute per IP
  const clientIP = getClientIP(event)
  if (!checkRateLimit(`track:${clientIP}`, 30, 60 * 1000)) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests'
    })
  }

  const body = await readBody<TrackRequestBody>(event)

  if (!body.event || !body.sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: event, sessionId'
    })
  }

  const isBotEvent = body.event === 'bot_message_received' || body.event === 'bot_response_sent' || !!body.whatsappNumber
  const channel: 'web' | 'whatsapp' = isBotEvent ? 'whatsapp' : 'web'

  const context = {
    sessionId: body.sessionId,
    channel,
    language: body.language,
    userAgent: getHeader(event, 'user-agent'),
    searchId: body.searchId,
    clickTarget: body.clickTarget,
    timeFromSearch: body.timeFromSearch,
    timeOnResults: body.timeOnResults,
    clicksBeforeRedirect: body.clicksBeforeRedirect
  }

  switch (body.event) {
    case 'flight_clicked':
      if (!body.flight || body.resultPosition === undefined || body.totalResults === undefined || !body.searchId) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields for flight_clicked'
        })
      }
      await analytics.trackFlightClick(
        body.flight,
        body.searchId,
        body.resultPosition,
        body.totalResults,
        context
      )
      break

    case 'provider_redirect':
      if (!body.flight) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields for provider_redirect'
        })
      }
      await analytics.trackProviderRedirect(body.flight, body.searchId ?? '', context)
      break

    case 'bot_message_received':
      if (!body.whatsappNumber || !body.detectedIntent) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields for bot_message_received'
        })
      }
      await analytics.trackBotMessageReceived(
        body.sessionId,
        {
          whatsappNumber: body.whatsappNumber,
          messageId: body.messageId ?? '',
          messageType: body.messageType ?? 'text',
          messageLength: body.messageLength,
          detectedIntent: body.detectedIntent,
          confidence: body.confidence,
          processingTime: body.processingTime ?? 0
        },
        body.language
      )
      break

    case 'bot_response_sent':
      if (!body.messageId || !body.responseType) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields for bot_response_sent'
        })
      }
      await analytics.trackBotResponseSent(
        body.sessionId,
        {
          messageId: body.messageId,
          responseType: body.responseType,
          flightCount: body.flightCount,
          providerCount: body.providerCount,
          totalTime: body.totalTime ?? 0,
          includedDeepLinks: body.includedDeepLinks ?? false
        },
        body.language
      )
      break

    case 'flight_search':
      if (!body.origin || !body.destination || !body.departureDate) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields for flight_search'
        })
      }
      await analytics.trackSearch(
        {
          origin: body.origin,
          destination: body.destination,
          departureDate: body.departureDate,
          returnDate: body.returnDate,
          adults: body.passengers?.adults,
          children: body.passengers?.children,
          infants: body.passengers?.infants
        },
        context
      )
      break

    case 'deeplink_opened':
      await analytics.trackDeeplinkOpened(
        body.sessionId,
        {
          deeplinkId: body.deeplinkId,
          linkType: body.linkType ?? 'search_results',
          origin: 'whatsapp',
          searchParams: body.searchParams,
          utmCampaign: body.utmCampaign
        }
      )
      break

    case 'provider_contact_requested':
      if (!body.providerId) {
        throw createError({
          statusCode: 400,
          message: 'Missing required field: providerId'
        })
      }
      await analytics.trackProviderContactRequested(
        body.sessionId,
        {
          providerId: body.providerId,
          providerFound: body.providerFound ?? false
        },
        body.language
      )
      break

    case 'rental_car_interest':
      await analytics.trackRentalCarInterest(
        body.sessionId,
        {
          interested: body.interested ?? false,
          whatsappNumber: body.whatsappNumber
        },
        body.language
      )
      break

    case 'route_no_availability':
      if (!body.origin || !body.destination || !body.departureDate) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields for route_no_availability'
        })
      }
      await analytics.trackRouteNoAvailability(
        body.sessionId,
        {
          origin: body.origin,
          destination: body.destination,
          departureDate: body.departureDate,
          totalFlightsReturned: body.totalFlightsReturned ?? 0,
          soldOutFlights: body.soldOutFlights ?? 0,
          bookableFlights: body.bookableFlights ?? 0,
          whatsappNumber: body.whatsappNumber
        },
        body.language
      )
      break

    default:
      throw createError({
        statusCode: 400,
        message: `Unknown event type: ${body.event}`
      })
  }

  return { success: true }
})
