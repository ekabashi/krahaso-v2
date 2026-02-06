/**
 * Consent Management Composable
 *
 * Manages user consent for analytics and marketing tracking.
 * Critical for GDPR/privacy compliance, especially in EU.
 *
 * - Store consent in localStorage (krahaso_consent) with timestamp
 * - Update GTM consent mode when consent changes
 * - useAnalytics checks this before sending dataLayer events
 */

export interface ConsentState {
  analytics: boolean
  marketing: boolean
  timestamp: number
}

const CONSENT_KEY = 'krahaso_consent'

export function useConsent() {
  const consentState = useState<ConsentState | null>('consent', () => {
    if (import.meta.server) return null

    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (!stored) return null
      return JSON.parse(stored) as ConsentState
    } catch {
      return null
    }
  })

  const hasConsent = computed(() => !!consentState.value)
  const hasAnalyticsConsent = computed(() => consentState.value?.analytics ?? false)
  const hasMarketingConsent = computed(() => consentState.value?.marketing ?? false)

  function setConsent(analytics: boolean, marketing: boolean) {
    const consent: ConsentState = {
      analytics,
      marketing,
      timestamp: Date.now(),
    }

    consentState.value = consent

    if (import.meta.client) {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
      updateGtmConsent(consent)
    }
  }

  function acceptAll() {
    setConsent(true, true)
  }

  function rejectAll() {
    setConsent(false, false)
  }

  function clearConsent() {
    consentState.value = null

    if (import.meta.client) {
      try {
        localStorage.removeItem(CONSENT_KEY)
      } catch {
        // ignore
      }

      const w = globalThis as unknown as { gtag?: (...args: unknown[]) => void }
      if (w.gtag) {
        w.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        })
      }
    }
  }

  function updateGtmConsent(consent: ConsentState) {
    if (!import.meta.client) return

    const w = globalThis as unknown as { gtag?: (...args: unknown[]) => void }
    if (!w.gtag) return

    w.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
    })
  }

  return {
    consentState: readonly(consentState),
    hasConsent,
    hasAnalyticsConsent,
    hasMarketingConsent,
    setConsent,
    acceptAll,
    rejectAll,
    clearConsent,
  }
}
