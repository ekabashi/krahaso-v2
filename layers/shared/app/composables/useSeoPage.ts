import { computed } from 'vue'
import { useRuntimeConfig, useRoute, useHead } from 'nuxt/app'
import { useLocalePath } from '#imports'

const LOCALES = ['sq', 'de', 'en'] as const

export function useSeoPage(seo: {
  title: string | (() => string)
  description: string | (() => string)
  canonical?: string | (() => string)
  ogImage?: string | (() => string)
  noindex?: boolean
}) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const localePath = useLocalePath()

  const siteUrl = (config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'

  // Route name + params for hreflang alternates (resolves translated paths per locale)
  const routeLocation = computed(() => {
    const name = route.name
    const baseName = typeof name === 'string' ? name.replace(/___\w+$/, '') : name
    return { name: baseName, params: route.params }
  })

  const alternates = computed(() => {
    const links = LOCALES.map((code) => {
      const href = `${siteUrl}${localePath(routeLocation.value, code)}`
      return { hreflang: code, href }
    })
    links.push({
      hreflang: 'x-default',
      href: `${siteUrl}${localePath(routeLocation.value, 'sq')}`,
    })
    return links
  })

  useHead(() => {
    const title = typeof seo.title === 'function' ? seo.title() : seo.title
    const description =
      typeof seo.description === 'function' ? seo.description() : seo.description
    const canonical =
      typeof seo.canonical === 'function' ? seo.canonical() : (seo.canonical ?? route.fullPath)
    const canonicalHref = canonical.startsWith('http') ? canonical : `${siteUrl}${canonical}`
    const ogImage = typeof seo.ogImage === 'function' ? seo.ogImage() : seo.ogImage
    return {
      title,
      meta: [
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonicalHref },
        { property: 'og:type', content: 'website' },
        ...(ogImage ? [{ property: 'og:image', content: ogImage }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(ogImage ? [{ name: 'twitter:image', content: ogImage }] : []),
        ...(seo.noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
      ],
      link: [
        { rel: 'canonical', href: canonicalHref },
        ...alternates.value.map((a) => ({
          rel: 'alternate',
          hreflang: a.hreflang,
          href: a.href,
        })),
      ],
    }
  })
}
