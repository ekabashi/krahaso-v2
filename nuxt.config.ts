// https://nuxt.com/docs/api/configuration/nuxt-config
// Nuxt 4 + Nuxt UI 4 compatible; layers: https://nuxt.com/docs/4.x/getting-started/layers
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
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
  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@pinia/nuxt', '@nuxt/image'],
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
    strategy: 'prefix',
    lazy: true,
    langDir: '../layers/shared/i18n', // module resolves as i18n/<langDir>; this yields layers/shared/i18n
    locales: [
      { code: 'sq', iso: 'sq-AL', file: 'sq.json' },
      { code: 'de', iso: 'de-DE', file: 'de.json' },
      { code: 'en', iso: 'en-GB', file: 'en.json' },
    ],
    defaultLocale: 'sq',
  },
})
