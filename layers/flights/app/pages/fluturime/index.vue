<script setup lang="ts">
const { t } = useI18n()
const { buildFlightQueryFromState } = useFlightSearch()

const localePath = useLocalePath()
const config = useRuntimeConfig()

useSeoPage({
  title: () => `${t('flights.title')} | Krahaso.co`,
  description: () => t('flights.description'),
  ogImage: () => `${(config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'}/img/airplane-aviopika_1280.jpg`,
})

const popularRoutes = [
  { from: 'Prishtinë', to: 'Düsseldorf', slug: 'prishtine-dusseldorf', code: 'PRN-DUS', duration: '2h 15min', direct: true },
  { from: 'Prishtinë', to: 'Zürich', slug: 'prishtine-zurich', code: 'PRN-ZRH', duration: '2h 10min', direct: true },
  { from: 'Prishtinë', to: 'Vienna', slug: 'prishtine-vienna', code: 'PRN-VIE', duration: '1h 45min', direct: true },
  { from: 'Prishtinë', to: 'Frankfurt', slug: 'prishtine-frankfurt', code: 'PRN-FRA', duration: '2h 30min', direct: true },
  { from: 'Prishtinë', to: 'Munich', slug: 'prishtine-munich', code: 'PRN-MUC', duration: '2h 20min', direct: true },
  { from: 'Prishtinë', to: 'Amsterdam', slug: 'prishtine-amsterdam', code: 'PRN-AMS', duration: '2h 40min', direct: false }
]

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
  },
  {
    icon: 'i-lucide-bell',
    title: t('flights.tips.alerts.title'),
    description: t('flights.tips.alerts.description')
  }
]

const highlights = [
  {
    icon: 'i-lucide-plane',
    title: t('flights.highlights.direct.title'),
    description: t('flights.highlights.direct.description')
  },
  {
    icon: 'i-lucide-tag',
    title: t('flights.highlights.prices.title'),
    description: t('flights.highlights.prices.description')
  },
  {
    icon: 'i-lucide-shield-check',
    title: t('flights.highlights.verified.title'),
    description: t('flights.highlights.verified.description')
  },
  {
    icon: 'i-lucide-zap',
    title: t('flights.highlights.fast.title'),
    description: t('flights.highlights.fast.description')
  }
]

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

// SEO structured data
useHead(() => ({
  script: [
    {
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
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': t('nav.home'),
            'item': 'https://krahaso.co'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': t('nav.flights'),
            'item': `${(config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'}${localePath('fluturime')}`
          }
        ]
      })
    }
  ]
}))

function onSearch() {
  const query = buildFlightQueryFromState()
  navigateTo({ path: localePath('fluturime-search'), query })
}
</script>

<template>
  <div class="relative">

    <!-- Hero header band -->
    <HeroSection>
      <div class="py-10 sm:py-20">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight lg:leading-tight text-center mb-10 sm:mb-14">
          {{ t('flights.title') }}
        </h1>

        <!-- Search Card with floating Tabs -->
        <div class="relative">
          <ProductTabs
            class="absolute left-6 top-3 -translate-y-1/2 z-10 md:left-8"
          />
          <div class="w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 pt-18 pb-8 px-6 md:pt-20 md:pb-10 md:px-8">
            <FlightSearchForm embedded @search="onSearch" />
          </div>
        </div>
      </div>
    </HeroSection>

    <!-- Popular Routes -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <UPageSection
          :title="t('flights.routes.title')"
          :description="t('flights.routes.description')"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
            <NuxtLink
              v-for="routeItem in popularRoutes"
              :key="routeItem.slug"
              :to="localePath({ name: 'fluturime-route', params: { route: routeItem.slug } })"
              class="group relative block"
            >
              <div class="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-primary/10 dark:border-neutral-800 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                <!-- Top Decoration Line -->
                <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/20 via-primary/70 to-primary/20" />

                <div class="p-5 sm:p-6">
                  <!-- Route Visualization -->
                  <div class="flex items-center justify-between mb-6 relative">
                    <!-- Origin -->
                    <div class="text-center z-10">
                      <span class="block text-2xl font-bold text-gray-900 dark:text-white mb-1">{{ routeItem.code.split('-')[0] }}</span>
                      <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Origin</span>
                    </div>

                    <!-- Flight Path Graphic -->
                    <div class="flex-1 px-4 flex flex-col items-center relative">
                      <div class="w-full h-[2px] bg-gray-100 dark:bg-neutral-700 relative overflow-hidden">
                        <div class="absolute inset-0 bg-primary/30 w-full -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        <!-- Dots -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-neutral-600" />
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-neutral-600" />
                      </div>
                      <UIcon
                        name="i-lucide-plane"
                        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary"
                      />
                    </div>

                    <!-- Destination -->
                    <div class="text-center z-10">
                      <span class="block text-2xl font-bold text-gray-900 dark:text-white mb-1">{{ routeItem.code.split('-')[1] }}</span>
                      <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Destinacion</span>
                    </div>
                  </div>

                  <!-- Route Details -->
                  <div class="flex items-center justify-between pt-4 border-t border-dashed border-gray-100 dark:border-neutral-700">
                    <div class="flex flex-col">
                      <span class="text-sm font-medium text-primary">
                        {{ routeItem.from }} → {{ routeItem.to }}
                      </span>
                      <span class="text-xs text-gray-400 mt-0.5">{{ t('flights.routes.compare') }}</span>
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
                <div class="absolute top-[88px] -left-1.5 w-3 h-3 rounded-full bg-gray-50 dark:bg-neutral-950 border border-t-transparent border-l-transparent border-gray-100 dark:border-neutral-800 rotate-45" />
                <div class="absolute top-[88px] -right-1.5 w-3 h-3 rounded-full bg-gray-50 dark:bg-neutral-950 border border-t-transparent border-r-transparent border-gray-100 dark:border-neutral-800 -rotate-45" />
              </div>
            </NuxtLink>
          </div>
        </UPageSection>
      </UContainer>
    </section>

    <!-- Highlights -->
    <section class="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-900">
      <UContainer>
        <UPageSection
          :title="t('flights.highlights.title')"
          :description="t('flights.highlights.description')"
        >
          <div class="max-w-6xl mx-auto">
            <LandingFeatureGrid :features="highlights" />
          </div>
        </UPageSection>
      </UContainer>
    </section>

    <!-- Tips -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <UPageSection
          :title="t('flights.tips.title')"
          :description="t('flights.tips.description')"
          class="bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/20 dark:to-primary-900/20 rounded-2xl p-4 sm:p-6 lg:p-8"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div
              v-for="tip in tips"
              :key="tip.title"
              class="flex gap-3 sm:gap-4"
            >
              <div class="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <UIcon
                  :name="tip.icon"
                  class="h-5 w-5 sm:h-6 sm:w-6 text-primary"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold mb-1 text-sm sm:text-base">
                  {{ tip.title }}
                </h4>
                <p class="text-xs sm:text-sm text-muted wrap-break-word">
                  {{ tip.description }}
                </p>
              </div>
            </div>
          </div>
        </UPageSection>
      </UContainer>
    </section>

    <!-- FAQ -->
    <section class="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-900">
      <UContainer>
        <LandingFAQSection
          :items="faqs"
          :title="t('flights.faq.title')"
          :description="t('flights.faq.description')"
        />
      </UContainer>
    </section>

    <!-- CTA -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <LandingCTASection
          :title="t('flights.cta.title')"
          :description="t('flights.cta.description')"
        >
          <UButton
            :to="localePath({ name: 'makina-location', params: { location: 'aeroporti-prishtines' } })"
            size="lg"
            color="neutral"
            variant="solid"
            trailing-icon="i-lucide-arrow-right"
            class="bg-white text-primary-700 hover:bg-primary-50 w-full sm:w-auto"
          >
            {{ t('flights.cta.rentCar') }}
          </UButton>
        </LandingCTASection>
      </UContainer>
    </section>
  </div>
</template>
