/**
 * Analytics Composable
 *
 * Tracks user events for conversion optimization
 */

import type { Flight } from '~/types/flight'

interface SearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  adults?: number
  children?: number
  infants?: number
}

export function useAnalytics() {
  // Persistent session ID (survives page reloads)
  // Use empty string on server to avoid hydration mismatch
  const sessionId = useState<string>('analytics-session', () => '')

  // Initialize session ID on client only
  onMounted(() => {
    if (!sessionId.value) {
      const stored = sessionStorage.getItem('analytics-session')
      if (stored) {
        sessionId.value = stored
      } else {
        const newId = crypto.randomUUID()
        sessionStorage.setItem('analytics-session', newId)
        sessionId.value = newId
      }
    }
  })

  // Current search context
  const searchId = useState<string | null>('analytics-search-id', () => null)
  const searchStartTime = useState<number | null>('analytics-search-start', () => null)
  const clickCount = useState<number>('analytics-click-count', () => 0)

  const { locale } = useI18n()

  /**
   * Track search initiation (called when search API is triggered)
   * Returns searchId for correlation
   */
  async function startSearch(params: SearchParams): Promise<string> {
    const newSearchId = crypto.randomUUID()
    searchId.value = newSearchId
    searchStartTime.value = Date.now()
    clickCount.value = 0

    // Send search event to server
    try {
      await $fetch('/api/analytics/track', {
        method: 'POST',
        body: {
          event: 'flight_search',
          sessionId: sessionId.value,
          searchId: newSearchId,
          language: locale.value,
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: {
            adults: params.adults ?? 1,
            children: params.children ?? 0,
            infants: params.infants ?? 0
          }
        }
      })
    } catch (error) {
      // Silent fail - don't break UX for analytics
      console.warn('[Analytics] Failed to track search:', error)
    }

    return newSearchId
  }

  /**
   * Track flight card click
   */
  async function trackFlightClick(
    flight: Flight,
    position: number,
    totalResults: number,
    clickTarget: 'card' | 'price_button' | 'details_button' = 'card'
  ): Promise<void> {
    if (!searchId.value) return

    clickCount.value++

    try {
      await $fetch('/api/analytics/track', {
        method: 'POST',
        body: {
          event: 'flight_clicked',
          sessionId: sessionId.value,
          searchId: searchId.value,
          language: locale.value,
          flight,
          resultPosition: position,
          totalResults,
          clickTarget
        }
      })
    } catch (error) {
      // Silent fail - don't break UX for analytics
      console.warn('[Analytics] Failed to track click:', error)
    }
  }

  /**
   * Track provider redirect (CONVERSION!)
   */
  async function trackProviderRedirect(flight: Flight): Promise<void> {
    if (!searchId.value) return

    const timeFromSearch = searchStartTime.value
      ? Math.round((Date.now() - searchStartTime.value) / 1000)
      : undefined

    try {
      await $fetch('/api/analytics/track', {
        method: 'POST',
        body: {
          event: 'provider_redirect',
          sessionId: sessionId.value,
          searchId: searchId.value,
          language: locale.value,
          flight,
          timeFromSearch,
          timeOnResults: timeFromSearch, // Same for now
          clicksBeforeRedirect: clickCount.value
        }
      })
    } catch (error) {
      console.warn('[Analytics] Failed to track redirect:', error)
    }
  }

  /**
   * Get current search ID (for API calls)
   */
  function getSearchId(): string | null {
    return searchId.value
  }

  /**
   * Get session ID
   */
  function getSessionId(): string {
    return sessionId.value
  }

  return {
    sessionId: readonly(sessionId),
    searchId: readonly(searchId),
    startSearch,
    trackFlightClick,
    trackProviderRedirect,
    getSearchId,
    getSessionId
  }
}
