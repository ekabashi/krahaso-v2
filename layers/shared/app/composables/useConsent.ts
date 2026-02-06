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
  const consentState = useState<ConsentState | null>('consent', () => null)

  // After hydration (client): restore consent from localStorage so it persists across refresh
  if (import.meta.client) {
    onMounted(() => {
      try {
        const stored = localStorage.getItem(CONSENT_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as ConsentState
          if (parsed && typeof parsed.analytics === 'boolean' && typeof parsed.marketing === 'boolean') {
            consentState.value = parsed
          }
        }
      } catch {
        // ignore
      }
    })
  }

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
