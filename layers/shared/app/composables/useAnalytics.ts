/**
 * Analytics composable using dataLayer-first approach (GTM / GA4 / Meta Pixel)
 *
 * Migrated from krahaso.co v1. Production-ready:
 * - Typed event names (prevents typos)
 * - Dedupe/throttle (prevents spam)
 * - PII stripping (auto-removes email, phone, name)
 * - Event IDs (for downstream dedupe)
 * - Consent check (krahaso_consent in localStorage)
 *
 * CRITICAL: Do NOT send PII (email, phone, name). Automatically stripped.
 */

type OfferType = 'car' | 'flight'
type AnalyticsProps = Record<string, unknown>

type AnalyticsEvent =
  | 'search_submitted'
  | 'filters_applied'
  | 'lead_started'
  | 'lead_submitted'
  | 'results_viewed'

const lastSent = new Map<string, number>()

const PII_KEYS = ['email', 'phone', 'name', 'firstName', 'lastName', 'address', 'ssn', 'password']
const PII_PATTERNS = [
  'email', 'phone', 'tel', 'mobile', 'name', 'address', 'ssn', 'password', 'credit', 'card',
]

function canSend(key: string, windowMs: number): boolean {
  const now = Date.now()
  const last = lastSent.get(key) || 0
  if (now - last < windowMs) return false
  lastSent.set(key, now)
  return true
}

function stripPII(obj: AnalyticsProps): AnalyticsProps {
  const cleaned: AnalyticsProps = {}
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase()
    const isExactMatch = PII_KEYS.includes(key)
    const containsPattern = PII_PATTERNS.some((p) => keyLower.includes(p))
    if (isExactMatch || containsPattern) {
      if (import.meta.dev) {
        console.warn(
          `[analytics] PII key "${key}" stripped from event props (${isExactMatch ? 'exact' : 'pattern'} match)`
        )
      }
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}

function pushEvent(
  event: AnalyticsEvent,
  props: AnalyticsProps = {},
  dedupeKey?: string,
  windowMs = 0,
  requiredConsent: 'analytics' | 'marketing' | 'none' = 'analytics'
) {
  if (!import.meta.client) return

  if (requiredConsent !== 'none') {
    try {
      const stored = localStorage.getItem('krahaso_consent')
      if (stored) {
        const consent = JSON.parse(stored) as { analytics?: boolean; marketing?: boolean }
        if (requiredConsent === 'analytics' && !consent.analytics) {
          if (import.meta.dev) console.log(`[analytics] Event "${event}" blocked: analytics consent not granted`)
          return
        }
        if (requiredConsent === 'marketing' && !consent.marketing) {
          if (import.meta.dev) console.log(`[analytics] Event "${event}" blocked: marketing consent not granted`)
          return
        }
      } else {
        if (import.meta.dev) console.log(`[analytics] Event "${event}" blocked: no consent stored`)
        return
      }
    } catch {
      if (import.meta.dev) console.log(`[analytics] Event "${event}" blocked: consent check failed`)
      return
    }
  }

  if (dedupeKey && windowMs > 0 && !canSend(dedupeKey, windowMs)) {
    if (import.meta.dev) console.log(`[analytics] Dedupe: ${event} (${dedupeKey}) skipped`)
    return
  }

  const w = globalThis as unknown as { dataLayer?: Array<Record<string, unknown>> }
  w.dataLayer = w.dataLayer || []

  const safeProps = stripPII({ ...props })
  const externalEventId = typeof safeProps.event_id === 'string' && safeProps.event_id.length > 0
    ? safeProps.event_id
    : null
  if (externalEventId) {
    delete safeProps.event_id
  }
  const cryptoObj = crypto as { randomUUID?: () => string }
  const eventId = externalEventId || cryptoObj?.randomUUID?.() || `${Date.now()}-${Math.random()}`

  w.dataLayer.push({
    event,
    event_id: eventId,
    ...safeProps,
  })

  if (import.meta.dev) console.log('[analytics]', event, safeProps)
}

export function useAnalytics() {
  return {
    trackSearchSubmitted: (type: OfferType, params: AnalyticsProps) =>
      pushEvent('search_submitted', { type, ...params }, `search_submitted:${type}`, 1200),

    trackFiltersApplied: (type: OfferType, filters: AnalyticsProps) =>
      pushEvent('filters_applied', { type, ...filters }),

    trackLeadStarted: (offerId: string, offerType: OfferType, params: AnalyticsProps = {}) =>
      pushEvent('lead_started', { offerId, offerType, ...params }, `lead_started:${offerId}`, 1500),

    trackLeadSubmitted: (offerId: string, offerType: OfferType, params: AnalyticsProps = {}) =>
      pushEvent('lead_submitted', { offerId, offerType, ...params }, `lead_submitted:${offerId}`, 2500, 'marketing'),

    trackResultsViewed: (type: OfferType, resultsCount: number, params: AnalyticsProps = {}) =>
      pushEvent('results_viewed', { type, resultsCount, ...params }, `results_viewed:${type}`, 1200),
  }
}
