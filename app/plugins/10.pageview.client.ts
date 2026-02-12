/**
 * SPA Pageview Tracking Plugin
 *
 * Tracks ALL page views (initial + route changes) and pushes to dataLayer.
 * GTM then converts these to GA4 page_view events.
 *
 * Setup in GTM:
 * 1. DISABLE "Send a page view event..." in GA4 Configuration Tag
 * 2. Create Custom Event Trigger: event = "spa_page_view"
 * 3. Create GA4 Event Tag: event_name = "page_view"
 *    - page_path: {{DLV - page_path}}
 *    - page_location: {{DLV - page_location}}
 *    - page_title: {{DLV - page_title}}
 *
 * This prevents double page_view counting with lastPath guard!
 */

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const router = useRouter()
  let lastPath: string | null = null

  const pushPageView = (fullPath: string) => {
    // Guard against duplicate page views
    if (fullPath === lastPath) return
    lastPath = fullPath

    const w = window as { dataLayer?: Array<unknown> }
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({
      event: 'spa_page_view',
      page_path: fullPath,
      page_location: window.location.href,
      page_title: document.title
    })
  }

  // Initial page view (prevents missing first page)
  const initial = window.location.pathname + window.location.search + window.location.hash
  pushPageView(initial)

  // Subsequent page views on route change
  router.afterEach((to) => {
    pushPageView(to.fullPath)
  })
})
