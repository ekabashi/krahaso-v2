<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()

const scrollToSearchForm = () => {
  if (import.meta.client) {
    const element = document.getElementById('search-form')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }
}

const routeSlug = computed(() => route.params.route as string)

const routeMap: Record<string, { origin: string, originCode: string, destination: string, destinationCode: string, duration: string, direct: boolean, avgPrice?: number }> = {
  'prishtine-dusseldorf': {
    origin: 'Prishtinë',
    originCode: 'PRN',
    destination: 'Düsseldorf',
    destinationCode: 'DUS',
    duration: '2h 15min',
    direct: true,
    avgPrice: 89
  },
  'dusseldorf-prishtine': {
    origin: 'Düsseldorf',
    originCode: 'DUS',
    destination: 'Prishtinë',
    destinationCode: 'PRN',
    duration: '2h 15min',
    direct: true,
    avgPrice: 89
  },
  'prishtine-frankfurt': {
    origin: 'Prishtinë',
    originCode: 'PRN',
    destination: 'Frankfurt',
    destinationCode: 'FRA',
    duration: '2h 30min',
    direct: true,
    avgPrice: 99
  },
  'frankfurt-prishtine': {
    origin: 'Frankfurt',
    originCode: 'FRA',
    destination: 'Prishtinë',
    destinationCode: 'PRN',
    duration: '2h 30min',
    direct: true,
    avgPrice: 99
  },
  'prishtine-munich': {
    origin: 'Prishtinë',
    originCode: 'PRN',
    destination: 'Munich',
    destinationCode: 'MUC',
    duration: '2h 20min',
    direct: true,
    avgPrice: 109
  },
  'munich-prishtine': {
    origin: 'Munich',
    originCode: 'MUC',
    destination: 'Prishtinë',
    destinationCode: 'PRN',
    duration: '2h 20min',
    direct: true,
    avgPrice: 109
  },
  'prishtine-zurich': {
    origin: 'Prishtinë',
    originCode: 'PRN',
    destination: 'Zürich',
    destinationCode: 'ZRH',
    duration: '2h 10min',
    direct: true,
    avgPrice: 119
  },
  'zurich-prishtine': {
    origin: 'Zürich',
    originCode: 'ZRH',
    destination: 'Prishtinë',
    destinationCode: 'PRN',
    duration: '2h 10min',
    direct: true,
    avgPrice: 119
  },
  'prishtine-vienna': {
    origin: 'Prishtinë',
    originCode: 'PRN',
    destination: 'Vienna',
    destinationCode: 'VIE',
    duration: '1h 45min',
    direct: true,
    avgPrice: 95
  },
  'vienna-prishtine': {
    origin: 'Vienna',
    originCode: 'VIE',
    destination: 'Prishtinë',
    destinationCode: 'PRN',
    duration: '1h 45min',
    direct: true,
    avgPrice: 95
  }
}

const routeData = computed(() => {
  const parts = routeSlug.value.split('-')
  if (parts.length < 2) return null

  return routeMap[routeSlug.value] || null
})

const pageTitle = computed(() => {
  if (!routeData.value) return t('flights.title')
  return `${t('flights.title')} ${routeData.value.origin} → ${routeData.value.destination} | Krahaso.co`
})

const pageDescription = computed(() => {
  if (!routeData.value) return t('flights.description')
  return `${t('flights.title')} ${routeData.value.origin} → ${routeData.value.destination}. ${t('flights.routeDescription')} ${routeData.value.duration}. ${t('flights.comparePrices')}`
})

const config = useRuntimeConfig()
const siteUrl = (config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'

useSeoPage({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  canonical: localePath(`/fluturime/${routeSlug.value}`),
  ogImage: () => `${siteUrl}/img/airplane-aviopika_1280.jpg`,
})

const { searchState, navigateToFlightsSearch } = useFlightSearch()
const { getAirportByCode } = useAirports()

onMounted(async () => {
  if (routeData.value) {
    const [origin, destination] = await Promise.all([
      getAirportByCode(routeData.value.originCode),
      getAirportByCode(routeData.value.destinationCode)
    ])
    if (origin) searchState.value.origin = origin
    if (destination) searchState.value.destination = destination
  }
})

const tips = [
  {
    icon: 'i-lucide-calendar',
    title: t('flights.tips.flexible.title'),
    description: t('flights.tips.flexible.description')
  },
  {
    icon: 'i-lucide-clock',
    title: t('flights.tips.weekdays.title'),
    description: t('flights.tips.weekdays.description')
  },
  {
    icon: 'i-lucide-calendar-clock',
    title: t('flights.tips.advance.title'),
    description: t('flights.tips.advance.description')
  }
]

const highlights = [
  {
    icon: 'i-lucide-clock',
    label: t('flights.duration'),
    value: routeData.value?.duration || ''
  },
  {
    icon: 'i-lucide-plane',
    label: t('flights.flightType'),
    value: routeData.value?.direct ? t('flights.direct') : t('flights.withStop')
  },
  {
    icon: 'i-lucide-map-pin',
    label: t('flights.airports'),
    value: `${routeData.value?.originCode || ''} → ${routeData.value?.destinationCode || ''}`
  },
  {
    icon: 'i-lucide-tag',
    label: t('flights.avgPrice'),
    value: routeData.value?.avgPrice ? t('flights.avgPriceLabel', { price: routeData.value.avgPrice }) : ''
  }
]

const directLabel = computed(() => (
  routeData.value?.direct ? t('flights.direct') : t('flights.withStop')
))

const faqs = computed(() => [
  {
    label: t('flights.faq.question1'),
    content: t('flights.faq.answer1')
  },
  {
    label: t('flights.faq.question2'),
    content: t('flights.faq.answer2')
  },
  {
    label: t('flights.faq.question3'),
    content: t('flights.faq.answer3')
  },
  {
    label: t('flights.faq.question4'),
    content: t('flights.faq.answer4')
  },
  {
    label: t('flights.faq.question5'),
    content: t('flights.faq.answer5')
  },
  {
    label: t('flights.faq.question6'),
    content: t('flights.faq.answer6')
  }
])

const relatedRoutes = computed(() => {
  if (!routeData.value) return []
  const relatedSlugs: string[] = []
  if (routeData.value.originCode === 'PRN') {
    relatedSlugs.push('prishtine-dusseldorf', 'prishtine-frankfurt', 'prishtine-munich', 'prishtine-zurich', 'prishtine-vienna')
  } else if (routeData.value.destinationCode === 'PRN') {
    relatedSlugs.push('dusseldorf-prishtine', 'frankfurt-prishtine', 'munich-prishtine', 'zurich-prishtine', 'vienna-prishtine')
  }

  return relatedSlugs
    .filter(slug => slug !== routeSlug.value)
    .slice(0, 5)
    .map((slug) => {
      const data = routeMap[slug]
      if (!data) return null
      return {
        slug,
        from: data.origin,
        to: data.destination,
        code: `${data.originCode}-${data.destinationCode}`,
        originCode: data.originCode,
        destinationCode: data.destinationCode,
        duration: data.duration,
        direct: data.direct,
        avgPrice: data.avgPrice
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
})

useHead(() => {
  const scripts: Array<{ type: string, children: string }> = []

  if (routeData.value) {
    scripts.push({
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqs.value.map(faq => ({
          '@type': 'Question',
          'name': faq.label,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.content
          }
        }))
      })
    })

    scripts.push({
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': t('shared.nav.home'),
            'item': 'https://krahaso.co'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': t('shared.nav.flights'),
            'item': 'https://krahaso.co/fluturime'
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': `${routeData.value.origin} → ${routeData.value.destination}`,
            'item': `https://krahaso.co/fluturime/${routeSlug.value}`
          }
        ]
      })
    })
  }

  return { script: scripts }
})
</script>

<template>
  <div>
    <UContainer class="py-8">
      <UBreadcrumb
        :items="[
          { label: $t('shared.nav.home'), to: localePath('/') },
          { label: $t('shared.nav.flights'), to: localePath('/fluturime') },
          { label: routeData ? `${routeData.origin} → ${routeData.destination}` : '' }
        ]"
        class="mb-6"
      />

      <!-- Hero Section -->
      <div class="mb-8 sm:mb-12 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6">
          <UIcon
            name="i-lucide-plane"
            class="w-4 h-4 text-primary"
          />
          <span class="text-sm font-medium text-primary">{{ routeData?.origin || '' }} → {{ routeData?.destination || '' }}</span>
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ routeData ? `${t('flights.title')} ${routeData.origin} → ${routeData.destination}` : t('flights.title') }}
        </h1>
        <p class="text-lg sm:text-xl text-muted max-w-3xl mx-auto mb-6">
          {{ routeData ? `${t('flights.routeDescription')} ${routeData.duration}. ${t('flights.comparePrices')}` : t('flights.description') }}
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-4">
          <UButton
            color="primary"
            size="lg"
            icon="i-lucide-search"
            @click="scrollToSearchForm"
          >
            {{ t('flights.searchNow') }}
          </UButton>
          <UButton
            :to="localePath('/makina/aeroporti-prishtines')"
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-car"
          >
            {{ t('cars.title') }}
          </UButton>
        </div>
      </div>

      <!-- Search Form -->
      <UPageSection id="search-form">
        <FlightSearchForm @search="navigateToFlightsSearch" />
      </UPageSection>

      <!-- Highlights Section -->
      <UPageSection v-if="routeData">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <UCard
            v-for="highlight in highlights"
            :key="highlight.label"
            :ui="{ body: 'p-6' }"
            class="text-center hover:shadow-md transition-shadow"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <UIcon
                  :name="highlight.icon"
                  class="h-6 w-6 text-primary"
                />
              </div>
              <p class="text-xs text-muted mb-1">
                {{ highlight.label }}
              </p>
              <p class="text-lg font-semibold">
                {{ highlight.value }}
              </p>
            </div>
          </UCard>
        </div>
      </UPageSection>

      <!-- Tips Section -->
      <UPageSection
        :title="t('flights.tips.title')"
        :description="t('flights.tips.description')"
        class="mb-12 bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/20 dark:to-primary-900/20 rounded-2xl p-8"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="tip in tips"
            :key="tip.title"
            class="flex gap-4"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UIcon
                :name="tip.icon"
                class="h-6 w-6 text-primary"
              />
            </div>
            <div>
              <h4 class="font-semibold mb-1">
                {{ tip.title }}
              </h4>
              <p class="text-sm text-muted">
                {{ tip.description }}
              </p>
            </div>
          </div>
        </div>
      </UPageSection>
    </UContainer>

    <!-- Premium Dark Hero Section with Glassmorphic Stats - Full Width -->
    <section class="relative overflow-hidden bg-linear-to-br from-primary-800 via-slate-800 to-primary-700 py-20 sm:py-28">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <UIcon
                name="i-lucide-plane"
                class="w-4 h-4 text-primary"
              />
              <span class="text-sm font-medium text-primary">{{ routeData?.origin || '' }} → {{ routeData?.destination || '' }}</span>
            </div>

            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {{ t('seo.content.route.title', { origin: routeData?.origin || '', destination: routeData?.destination || '' }) }}
            </h1>

            <p class="text-lg text-slate-300 mb-8 leading-relaxed">
              {{ t('seo.content.route.intro', { origin: routeData?.origin || '', destination: routeData?.destination || '' }) }}
            </p>

            <div class="space-y-4">
              <div
                v-for="(highlight, index) in [
                  { text: t('seo.content.route.highlight1', { duration: routeData?.duration || '' }), icon: 'i-lucide-clock' },
                  { text: t('seo.content.route.highlight2', { direct: directLabel }), icon: 'i-lucide-plane' },
                  { text: t('seo.content.route.highlight3', { origin: routeData?.origin || '', destination: routeData?.destination || '' }), icon: 'i-lucide-map-pin' },
                  { text: t('seo.content.route.highlight4'), icon: 'i-lucide-tag' }
                ]"
                :key="index"
                class="flex items-start gap-4"
              >
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shrink-0 mt-0.5">
                  <UIcon
                    :name="highlight.icon"
                    class="w-5 h-5 text-primary"
                  />
                </div>
                <p class="text-base text-slate-200 leading-relaxed pt-2">
                  {{ highlight.text }}
                </p>
              </div>
            </div>
          </div>

          <div class="relative">
            <div class="absolute inset-0 bg-linear-to-br from-primary/30 to-primary/30 rounded-3xl blur-2xl" />

            <div class="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">
                    {{ routeData?.avgPrice || '89' }}€
                  </div>
                  <div class="text-sm font-bold text-primary-200">
                    {{ t('flights.avgPrice') }}
                  </div>
                </div>

                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">
                    {{ routeData?.duration || '2h' }}
                  </div>
                  <div class="text-sm font-bold text-primary-200">
                    {{ t('flights.duration') }}
                  </div>
                </div>

                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">
                    {{ routeData?.direct ? t('flights.direct') : t('flights.withStop') }}
                  </div>
                  <div class="text-sm font-bold text-primary-200">
                    {{ t('flights.flightType') }}
                  </div>
                </div>

                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">
                    24/7
                  </div>
                  <div class="text-sm font-bold text-primary-200">
                    Mbështetje
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trust Section - Clean White Cards -->
    <UPageSection>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold text-default mb-4">
            {{ t('seo.content.trust.title') }}
          </h2>
          <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
            {{ t('seo.content.trust.description') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div class="shrink-0">
                <div class="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <UIcon
                    name="i-lucide-shield-check"
                    class="w-7 h-7 text-primary"
                  />
                </div>
              </div>
              <div class="flex-1 text-center sm:text-left">
                <h4 class="text-xl font-bold text-default mb-3">
                  {{ t('seo.content.trust.verified.title') }}
                </h4>
                <p class="text-base text-muted-foreground leading-relaxed">
                  {{ t('seo.content.trust.verified.description') }}
                </p>

                <div class="flex items-center justify-center sm:justify-start gap-1 mt-4">
                  <UIcon
                    v-for="i in 5"
                    :key="i"
                    name="i-heroicons-solid-star"
                    class="w-6 h-6 text-orange-400 fill-orange-400"
                  />
                  <span class="text-sm text-muted-foreground ml-2">+50 partnerë</span>
                </div>
              </div>
            </div>
          </div>

          <div class="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div class="shrink-0">
                <div class="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <UIcon
                    name="i-lucide-tag"
                    class="w-7 h-7 text-primary"
                  />
                </div>
              </div>
              <div class="flex-1 text-center sm:text-left">
                <h4 class="text-xl font-bold text-default mb-3">
                  {{ t('seo.content.trust.transparent.title') }}
                </h4>
                <p class="text-base text-muted-foreground leading-relaxed">
                  {{ t('seo.content.trust.transparent.description') }}
                </p>

                <div class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary-200 dark:border-primary-800">
                  <UIcon
                    name="i-lucide-check-circle"
                    class="w-4 h-4 text-primary-600 dark:text-primary-400"
                  />
                  <span class="text-sm font-medium text-gray-700 dark:text-primary-400">{{ t('trustBadges.noFees') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UPageSection>

    <UContainer class="py-8">
      <!-- FAQ Section -->
      <UPageSection
        :title="t('faq.title')"
        :description="t('faq.description')"
      >
        <div class="w-full lg:w-3xl mx-auto px-4 sm:px-6">
          <UAccordion :items="faqs" />
        </div>
      </UPageSection>

      <!-- Related Routes Section -->
      <UPageSection
        v-if="relatedRoutes.length > 0"
        :title="t('routes.related')"
        :description="t('routes.relatedDescription')"
        class="mb-12"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
          <NuxtLink
            v-for="relatedRoute in relatedRoutes"
            :key="relatedRoute.slug"
            :to="localePath(`/fluturime/${relatedRoute.slug}`)"
            class="group relative block"
          >
            <div class="relative overflow-hidden rounded-2xl bg-white border border-primary/10 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
              <!-- Top Decoration Line -->
              <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/20 via-primary/70 to-primary/20" />

              <div class="p-5 sm:p-6">
                <!-- Route Visualization -->
                <div class="flex items-center justify-between mb-6 relative">
                  <!-- Origin -->
                  <div class="text-center z-10">
                    <span class="block text-2xl font-bold text-gray-900 mb-1">{{ relatedRoute.originCode }}</span>
                    <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Origin</span>
                  </div>

                  <!-- Flight Path Graphic -->
                  <div class="flex-1 px-4 flex flex-col items-center relative">
                    <div class="w-full h-[2px] bg-gray-100 relative overflow-hidden">
                      <div class="absolute inset-0 bg-primary/30 w-full -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                      <!-- Dots -->
                      <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200" />
                      <div class="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200" />
                    </div>
                    <UIcon
                      name="i-lucide-plane"
                      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary rotate-90"
                    />
                  </div>

                  <!-- Destination -->
                  <div class="text-center z-10">
                    <span class="block text-2xl font-bold text-gray-900 mb-1">{{ relatedRoute.destinationCode }}</span>
                    <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Destinacion</span>
                  </div>
                </div>

                <!-- Route Details -->
                <div class="flex items-center justify-between pt-4 border-t border-dashed border-gray-100">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-primary">
                      {{ relatedRoute.from }} → {{ relatedRoute.to }}
                    </span>
                    <span class="text-xs text-gray-400 mt-0.5">{{ t('routes.compare') }}</span>
                  </div>

                  <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <UIcon
                      name="i-lucide-arrow-right"
                      class="h-4 w-4 text-primary"
                    />
                  </div>
                </div>
              </div>

              <!-- Side Cutouts (Ticket Style) -->
              <div class="absolute top-[88px] -left-1.5 w-3 h-3 rounded-full bg-gray-50 border border-t-transparent border-l-transparent border-gray-100 rotate-45" />
              <div class="absolute top-[88px] -right-1.5 w-3 h-3 rounded-full bg-gray-50 border border-t-transparent border-r-transparent border-gray-100 -rotate-45" />
            </div>
          </NuxtLink>
        </div>
      </UPageSection>

      <!-- CTA Section -->
      <UPageSection class="bg-linear-to-br from-primary-600 to-primary-700 text-white rounded-2xl p-8">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-2xl font-bold mb-4">
            {{ t('seo.content.route.cta') }}
          </h2>
          <p class="mb-6 text-primary-100">
            {{ t('seo.content.route.ctaDescription') }}
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <UButton
              :to="localePath('/makina/aeroporti-prishtines')"
              size="lg"
              color="neutral"
              variant="solid"
              trailing-icon="i-lucide-arrow-right"
              class="bg-white text-primary-700 hover:bg-primary-50"
            >
              {{ t('seo.content.route.rentCar') }}
            </UButton>
            <UButton
              size="lg"
              color="primary"
              variant="outline"
              trailing-icon="i-lucide-arrow-right"
              class="border-white hover:bg-white/10 text-white"
              @click="scrollToSearchForm"
            >
              {{ t('flights.searchNow') }}
            </UButton>
          </div>
        </div>
      </UPageSection>
    </UContainer>
  </div>
</template>
