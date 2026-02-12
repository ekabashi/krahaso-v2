export default defineNuxtPlugin(() => {
  const { public: { gtmId } } = useRuntimeConfig()

  if (!import.meta.client) return
  if (!gtmId) return
  if (document.querySelector('script[data-gtm="true"]')) return

  const w = window as {
    dataLayer?: Array<unknown>
    gtag?: (...args: unknown[]) => void
  }

  // Initialize dataLayer
  w.dataLayer = w.dataLayer || []

  // gtag stub (canonical form - so consent commands are understood by Google)
  if (!w.gtag) {
    w.gtag = function (...args: unknown[]) {
      w.dataLayer?.push(args)
    }
  }

  // Set default consent to denied (GDPR-compliant, Consent Mode v2)
  w.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  })

  // Apply stored consent if exists
  try {
    const stored = localStorage.getItem('krahaso_consent')
    if (stored) {
      const state = JSON.parse(stored)
      w.gtag('consent', 'update', {
        analytics_storage: state.analytics ? 'granted' : 'denied',
        ad_storage: state.marketing ? 'granted' : 'denied',
        ad_user_data: state.marketing ? 'granted' : 'denied',
        ad_personalization: state.marketing ? 'granted' : 'denied'
      })
    }
  } catch {
    // Ignore consent read errors
  }

  // Inject GTM loader directly to avoid head manager dedupe/ordering issues.
  const inline = document.createElement('script')
  inline.setAttribute('data-gtm', 'true')
  inline.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `
  document.head.appendChild(inline)

  const existingNoScript = document.querySelector(`iframe[src="https://www.googletagmanager.com/ns.html?id=${gtmId}"]`)
  if (!existingNoScript) {
    const noscript = document.createElement('noscript')
    noscript.innerHTML = `
      <iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe>
    `
    document.body.prepend(noscript)
  }
})
