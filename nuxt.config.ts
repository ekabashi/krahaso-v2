// https://nuxt.com/docs/api/configuration/nuxt-config
// Nuxt 4 + Nuxt UI 4 compatible; layers: https://nuxt.com/docs/4.x/getting-started/layers
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    brevoApiKey: process.env.BREVO_API_KEY || '',
    supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'customerid',
    superadminCreatedBy: process.env.SUPERADMIN_CREATED_BY || 'autopika',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://krahaso.co',
      gtmId: process.env.NUXT_PUBLIC_GTM_ID || '',
    },
  },
  // CSS loaded from app.vue with relative imports to avoid ~ resolution in virtual:nuxt/css.mjs
  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@pinia/nuxt', '@nuxt/image', '@nuxtjs/supabase', '@nuxtjs/sitemap'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false,
    types: false,
  },
  ui: {
    fonts: false, // avoid Fontshare/API 503 during dev; use system/fallback fonts
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://krahaso.co',
  },
  sitemap: {
    // Auto-discovers routes from i18n; each locale gets its own sitemap
    sitemaps: true,
    excludeAppSources: ['route-rules'],
    exclude: [
      '/superadmin/**',
      '/superadmin',
      '/**/superadmin/**',
      '/**/superadmin',
    ],
  },
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          // Suppress unused export warnings from Supabase SDK internals
          if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.exporter?.includes('@supabase/')) return
          defaultHandler(warning)
        },
      },
    },
  },
  nitro: {
    preset: 'vercel',
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': [
            'default-src \'self\'',
            'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net',
            'img-src \'self\' data: https: http:',
            'style-src \'self\' \'unsafe-inline\'',
            'font-src \'self\' data:',
            'connect-src \'self\' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://www.facebook.com',
            'frame-src \'self\' https://www.googletagmanager.com https://www.google.com https://www.facebook.com',
          ].join('; '),
        },
      },
      '/robots.txt': {
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
      },
      '/sitemap.xml': {
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
      },
      // Static pages: prerender at build time
      '/sq/': { prerender: true },
      '/de/': { prerender: true },
      '/en/': { prerender: true },
      '/sq/kontakt': { prerender: true },
      '/de/kontakt': { prerender: true },
      '/en/contact': { prerender: true },
      '/sq/rreth-nesh': { prerender: true },
      '/de/ueber-uns': { prerender: true },
      '/en/about-us': { prerender: true },
      '/sq/privacy-policy': { prerender: true },
      '/de/privacy-policy': { prerender: true },
      '/en/privacy-policy': { prerender: true },
      '/sq/terms-of-service': { prerender: true },
      '/de/terms-of-service': { prerender: true },
      '/en/terms-of-service': { prerender: true },
      '/sq/cookie-policy': { prerender: true },
      '/de/cookie-policy': { prerender: true },
      '/en/cookie-policy': { prerender: true },
      // Landing pages: ISR with 1h cache (exclude /search which is dynamic)
      '/sq/makina': { isr: 3600 },
      '/de/autos': { isr: 3600 },
      '/en/cars': { isr: 3600 },
      '/sq/fluturime': { isr: 3600 },
      '/de/fluege': { isr: 3600 },
      '/en/flights': { isr: 3600 },
    },
  },
  // optional: vercel: { preferredRegion: 'fra1' },

  i18n: {
    strategy: 'prefix', // all locales with prefix: /sq/, /de/, /en/
    langDir: '../layers/shared/i18n', // module resolves as i18n/<langDir>; this yields layers/shared/i18n
    locales: [
      { code: 'sq', iso: 'sq-AL', file: 'sq.json' },
      { code: 'de', iso: 'de-DE', file: 'de.json' },
      { code: 'en', iso: 'en-GB', file: 'en.json' },
    ],
    defaultLocale: 'sq',
    detectBrowserLanguage: false,
    customRoutes: 'config',
    pages: {
      makina: {
        sq: '/makina',
        en: '/cars',
        de: '/autos',
      },
      'makina-search': {
        sq: '/makina/search',
        en: '/cars/search',
        de: '/autos/search',
      },
      'makina-checkout': {
        sq: '/makina/checkout',
        en: '/cars/checkout',
        de: '/autos/checkout',
      },
      'makina-location': {
        sq: '/makina/[location]',
        en: '/cars/[location]',
        de: '/autos/[location]',
      },
      fluturime: {
        sq: '/fluturime',
        en: '/flights',
        de: '/fluege',
      },
      'fluturime-search': {
        sq: '/fluturime/search',
        en: '/flights/search',
        de: '/fluege/search',
      },
      'fluturime-route': {
        sq: '/fluturime/[route]',
        en: '/flights/[route]',
        de: '/fluege/[route]',
      },
      superadmin: {
        sq: '/superadmin',
        en: '/superadmin',
        de: '/superadmin',
      },
      'superadmin-login': {
        sq: '/superadmin/login',
        en: '/superadmin/login',
        de: '/superadmin/login',
      },
      'rreth-nesh': {
        sq: '/rreth-nesh',
        en: '/about-us',
        de: '/ueber-uns',
      },
      kontakt: {
        sq: '/kontakt',
        en: '/contact',
        de: '/kontakt',
      },
    },
  },
})
