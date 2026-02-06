/**
 * Consent Management Composable
 *
 * Manages user consent for analytics and marketing tracking.
 * Critical for GDPR/privacy compliance, especially in EU.
 *
 * - Store consent in cookie (krahaso_consent) so it works in SSR (no flash on load)
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
  // Use cookie instead of localStorage so it works in SSR and avoids flash
  const consentCookie = useCookie<ConsentState | null>(CONSENT_KEY, {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    path: '/',
  })

  // Initialize state from cookie (works in server + client, no flash)
  const consentState = useState<ConsentState | null>('consent', () => consentCookie.value)

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
    consentCookie.value = consent

    if (import.meta.client) {
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
    consentCookie.value = null

    if (import.meta.client) {
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
