type UseSeoOptions = {
  title?: string
  description?: string
  /**
   * Force canonical to be on krahaso.co (per spec)
   * If you want a different hostname in dev, keep it as-is.
   */
  canonicalHost?: string
}

const LOCALES = ['sq', 'de', 'en'] as const

/**
 * Minimal SEO helper:
 * - canonical always uses https://krahaso.co + current path (no query)
 * - hreflang alternates for sq/de/en + x-default
 */
export function useSeo(options: UseSeoOptions = {}) {
  const route = useRoute()
  const localePath = useLocalePath()
  const i18n = useI18n()

  const canonicalHost = options.canonicalHost ?? 'https://krahaso.co'

  // Path without locale prefix so localePath(basePath, code) yields /sq/, /en/, etc. (not /sq/en)
  const pathNoQuery = computed(() => {
    const p = route.path.replace(/^\/(sq|de|en)(\/|$)/i, '$2') || '/'
    return p
  })

  const canonicalUrl = computed(() => `${canonicalHost}${route.path}`)

  const alternates = computed(() => {
    const links = LOCALES.map((code) => {
      const href = `${canonicalHost}${localePath(pathNoQuery.value, code)}`
      return { hreflang: code, href }
    })
    links.push({
      hreflang: 'x-default',
      href: `${canonicalHost}${localePath(pathNoQuery.value, 'sq')}`,
    })
    return links
  })

  useHead(() => ({
    title: options.title,
    meta: [
      ...(options.description
        ? [{ name: 'description', content: options.description }]
        : []),
    ],
    link: [
      { rel: 'canonical', href: canonicalUrl.value },
      ...alternates.value.map((a) => ({
        rel: 'alternate',
        hreflang: a.hreflang,
        href: a.href,
      })),
    ],
  }))

  return {
    canonicalUrl,
    alternates,
    locale: i18n.locale,
  }
}
