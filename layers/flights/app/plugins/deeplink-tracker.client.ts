/**
 * Deeplink Tracker Plugin
 *
 * Detects when users arrive via WhatsApp bot deep links
 * and tracks the deeplink_opened event for analytics
 *
 * URL params: ref=wa, dl=<id>, s=<session>
 */

export default defineNuxtPlugin(() => {
  const route = useRoute()

  // Only run once on initial page load
  if (import.meta.client) {
    // Check for WhatsApp deeplink: ref=wa
    const ref = route.query.ref as string
    const deeplinkId = route.query.dl as string
    const session = route.query.s as string

    // If this is a WhatsApp bot deeplink
    if (ref === 'wa') {
      // Avoid duplicate tracking
      if (typeof sessionStorage !== 'undefined') {
        const tracked = sessionStorage.getItem('dl_tracked')
        if (tracked === deeplinkId) return
        sessionStorage.setItem('dl_tracked', deeplinkId || 'true')
      }

      // Extract search parameters
      const searchParams = {
        from: route.query.from as string,
        to: route.query.to as string,
        date: route.query.date as string,
        returnDate: route.query.returnDate as string,
        adults: route.query.adults as string,
        children: route.query.children as string,
        infants: route.query.infants as string
      }

      // Track the deeplink opened event
      $fetch('/api/analytics/track', {
        method: 'POST',
        body: {
          event: 'deeplink_opened',
          sessionId: session || 'unknown',
          deeplinkId,
          linkType: 'search_results',
          origin: 'whatsapp',
          searchParams: {
            from: searchParams.from,
            to: searchParams.to,
            date: searchParams.date,
            returnDate: searchParams.returnDate,
            passengers: {
              adults: parseInt(searchParams.adults) || 1,
              children: parseInt(searchParams.children) || 0,
              infants: parseInt(searchParams.infants) || 0
            }
          }
        }
      }).catch((error) => {
        console.warn('[Deeplink] Tracking failed:', error)
      })

      console.log('[Deeplink] Tracked:', { deeplinkId, from: searchParams.from, to: searchParams.to })
    }
  }
})
