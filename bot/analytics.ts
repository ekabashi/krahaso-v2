/**
 * Analytics Tracker for WhatsApp Bot
 *
 * Sends tracking events to the main Aviopika API
 */

import { config } from './config'

interface TrackEventParams {
  event: 'bot_message_received' | 'bot_response_sent' | 'flight_search' | 'provider_contact_requested' | 'rental_car_interest' | 'route_no_availability'
  sessionId: string
  searchId?: string
  language?: string

  // For bot_message_received
  whatsappNumber?: string
  messageId?: string
  messageType?: string
  messageLength?: number
  detectedIntent?: string
  confidence?: number
  processingTime?: number

  // For bot_response_sent
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

/**
 * Track an analytics event
 * Fails silently to not break bot functionality
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const response = await fetch(`${config.api.url}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      console.warn(`[Analytics] Track failed: ${response.status}`)
    }
  } catch (error) {
    // Silent fail - don't break bot for analytics
    console.warn('[Analytics] Track error:', error instanceof Error ? error.message : error)
  }
}

/**
 * Track incoming message from user
 */
export async function trackMessageReceived(
  phoneNumber: string,
  messageId: string,
  text: string,
  detectedIntent: string,
  processingTime: number,
  language?: string
): Promise<void> {
  await trackEvent({
    event: 'bot_message_received',
    sessionId: phoneNumber,
    whatsappNumber: phoneNumber,
    messageId,
    messageType: 'text',
    messageLength: text.length,
    detectedIntent,
    processingTime,
    language
  })
}

/**
 * Track bot response sent
 */
export async function trackResponseSent(
  phoneNumber: string,
  messageId: string,
  responseType: string,
  totalTime: number,
  language?: string,
  flightCount?: number,
  providerCount?: number,
  includedDeepLinks?: boolean
): Promise<void> {
  await trackEvent({
    event: 'bot_response_sent',
    sessionId: phoneNumber,
    messageId,
    responseType,
    flightCount,
    providerCount,
    totalTime,
    includedDeepLinks: includedDeepLinks ?? false,
    language
  })
}

/**
 * Track flight search initiated
 */
export async function trackSearch(
  phoneNumber: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  passengers?: { adults: number, children: number, infants: number },
  language?: string
): Promise<void> {
  await trackEvent({
    event: 'flight_search',
    sessionId: phoneNumber,
    whatsappNumber: phoneNumber,
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
    language
  })
}

/**
 * Track provider contact request
 */
export async function trackProviderContact(
  phoneNumber: string,
  providerId: string,
  providerFound: boolean,
  language?: string
): Promise<void> {
  await trackEvent({
    event: 'provider_contact_requested',
    sessionId: phoneNumber,
    whatsappNumber: phoneNumber,
    providerId,
    providerFound,
    language
  })
}

/**
 * Track rental car interest
 */
export async function trackRentalInterest(
  phoneNumber: string,
  interested: boolean,
  language?: string
): Promise<void> {
  await trackEvent({
    event: 'rental_car_interest',
    sessionId: phoneNumber,
    whatsappNumber: phoneNumber,
    interested,
    language
  })
}

/**
 * Track route with no availability (high demand, sold out)
 */
export async function trackRouteNoAvailability(
  phoneNumber: string,
  origin: string,
  destination: string,
  departureDate: string,
  stats: {
    totalFlightsReturned: number
    soldOutFlights: number
    bookableFlights: number
  },
  language?: string
): Promise<void> {
  await trackEvent({
    event: 'route_no_availability',
    sessionId: phoneNumber,
    whatsappNumber: phoneNumber,
    origin,
    destination,
    departureDate,
    totalFlightsReturned: stats.totalFlightsReturned,
    soldOutFlights: stats.soldOutFlights,
    bookableFlights: stats.bookableFlights,
    language
  })
}
