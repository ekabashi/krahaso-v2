/**
 * Flight-specific analytics (server-side funnel: search → click → redirect)
 * Use shared useAnalytics() for dataLayer/GTM (search_submitted, results_viewed, etc.)
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

export function useFlightAnalytics() {
  const sessionId = useState<string>('analytics-session', () => '')

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

  const searchId = useState<string | null>('analytics-search-id', () => null)
  const searchStartTime = useState<number | null>('analytics-search-start', () => null)
  const clickCount = useState<number>('analytics-click-count', () => 0)

  const { locale } = useI18n()

  async function startSearch(params: SearchParams): Promise<string> {
    const newSearchId = crypto.randomUUID()
    searchId.value = newSearchId
    searchStartTime.value = Date.now()
    clickCount.value = 0

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
            infants: params.infants ?? 0,
          },
        },
      })
    } catch (error) {
      console.warn('[FlightAnalytics] Failed to track search:', error)
    }

    return newSearchId
  }

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
          clickTarget,
        },
      })
    } catch (error) {
      console.warn('[FlightAnalytics] Failed to track click:', error)
    }
  }

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
          timeOnResults: timeFromSearch,
          clicksBeforeRedirect: clickCount.value,
        },
      })
    } catch (error) {
      console.warn('[FlightAnalytics] Failed to track redirect:', error)
    }
  }

  function getSearchId(): string | null {
    return searchId.value
  }

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
    getSessionId,
  }
}
