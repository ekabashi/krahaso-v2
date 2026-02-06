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
    },
  },
  extends: [
    './layers/shared',
    './layers/cars',
    './layers/flights',
  ],
  // CSS loaded from app.vue with relative imports to avoid ~ resolution in virtual:nuxt/css.mjs
  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@pinia/nuxt', '@nuxt/image', '@nuxtjs/supabase'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false,
  },
  ui: {
    fonts: false, // avoid Fontshare/API 503 during dev; use system/fallback fonts
  },
  nitro: {
    preset: 'vercel',
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      },
    },
  },
  // optional: vercel: { preferredRegion: 'fra1' },

  i18n: {
    strategy: 'prefix_except_default', // default locale (sq) has no /sq in URL
    langDir: '../layers/shared/i18n', // module resolves as i18n/<langDir>; this yields layers/shared/i18n
    locales: [
      { code: 'sq', iso: 'sq-AL', file: 'sq.json' },
      { code: 'de', iso: 'de-DE', file: 'de.json' },
      { code: 'en', iso: 'en-GB', file: 'en.json' },
    ],
    defaultLocale: 'sq',
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
    },
  },
})
