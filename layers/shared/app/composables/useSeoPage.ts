export function useSeoPage(seo: {
  title: string | (() => string)
  description: string | (() => string)
  canonical?: string | (() => string)
  ogImage?: string
  noindex?: boolean
}) {
  const config = useRuntimeConfig()
  const route = useRoute()

  const siteUrl = (config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'

  useHead(() => {
    const title = typeof seo.title === 'function' ? seo.title() : seo.title
    const description =
      typeof seo.description === 'function' ? seo.description() : seo.description
    const canonical =
      typeof seo.canonical === 'function' ? seo.canonical() : (seo.canonical ?? route.fullPath)
    const canonicalHref = canonical.startsWith('http') ? canonical : `${siteUrl}${canonical}`
    return {
      title,
      meta: [
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonicalHref },
        { property: 'og:type', content: 'website' },
        ...(seo.ogImage ? [{ property: 'og:image', content: seo.ogImage }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(seo.noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
      ],
      link: [{ rel: 'canonical', href: canonicalHref }],
    }
  })
}
