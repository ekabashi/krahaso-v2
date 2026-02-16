<script setup lang="ts">
const { t } = useI18n()
const { buildFlightQueryFromState } = useFlightSearch()

const localePath = useLocalePath()
const config = useRuntimeConfig()

const whatsappNumber = useRuntimeConfig().public.whatsappNumber || ''
const whatsappLink = computed(() =>
  whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(t('landing.whatsapp.chat.userMessage1'))}` : '#'
)

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

    <!-- WhatsApp CTA -->
    <section class="py-16 sm:py-20 bg-linear-to-br from-green-600 to-green-700 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="relative overflow-hidden rounded-2xl px-6 py-10 sm:px-10 sm:py-14">
          <!-- Decorative glow -->
          <div class="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#25d366]/10 blur-[80px] pointer-events-none" />
          <div class="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#25d366]/5 blur-[60px] pointer-events-none" />
          <div class="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <!-- Text -->
            <div class="flex-1 text-center lg:text-left">
              <div class="flex items-center justify-center lg:justify-start gap-2 mb-3">
                <UIcon name="i-simple-icons-whatsapp" class="text-2xl text-white" />
                <span class="text-xs font-semibold uppercase tracking-wider text-white">WhatsApp</span>
              </div>
              <h2 class="text-xl sm:text-2xl font-bold mb-2">
                {{ t('landing.whatsapp.title') }}
              </h2>
              <p class="text-sm text-white/80 mb-6 max-w-md">
                {{ t('landing.whatsapp.description') }}
              </p>
              <div class="flex flex-wrap justify-center lg:justify-start gap-4 mb-6 text-sm">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-zap" /> {{ t('landing.whatsapp.features.fast') }}
                </span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-smartphone" /> {{ t('landing.whatsapp.features.easy') }}
                </span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-heart" /> {{ t('landing.whatsapp.features.free') }}
                </span>
              </div>
              <UButton
                :to="whatsappLink"
                color="neutral"
                variant="outline"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 sm:gap-2 rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-sm font-semibold text-green-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl w-full sm:w-auto justify-center"
              >
                <UIcon
                  name="i-simple-icons-whatsapp"
                  class="h-5 w-5 sm:h-5 sm:w-5 shrink-0"
                />
                <span class="wrap-break-word">{{ t('landing.whatsapp.cta') }}</span>
              </UButton>
            </div>

            <!-- Chat Mockup -->
            <div class="w-full max-w-[280px] shrink-0">
              <div class="rounded-xl bg-[#ece5dd] p-3 shadow-lg text-xs space-y-2">
                <!-- User message -->
                <div class="flex justify-end">
                  <div class="rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-1.5 max-w-[85%] text-neutral-800">
                    {{ t('landing.whatsapp.chat.userMessage1') }}
                  </div>
                </div>
                <!-- Bot greeting (truncated) -->
                <div class="flex justify-start">
                  <div class="rounded-lg rounded-tl-none bg-white px-3 py-1.5 max-w-[85%] text-neutral-800 whitespace-pre-line leading-relaxed">
                    {{ t('landing.whatsapp.chat.botGreeting').slice(0, 80) }}...
                  </div>
                </div>
                <!-- User search -->
                <div class="flex justify-end">
                  <div class="rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-1.5 max-w-[85%] text-neutral-800 font-medium">
                    {{ t('landing.whatsapp.chat.userFlightSearch') }}
                  </div>
                </div>
                <!-- Bot results (truncated) -->
                <div class="flex justify-start">
                  <div class="rounded-lg rounded-tl-none bg-white px-3 py-1.5 max-w-[85%] text-neutral-800 whitespace-pre-line leading-relaxed">
                    {{ t('landing.whatsapp.chat.botFlightResults').slice(0, 120) }}...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- Tips – timeline vertikal, pa karta -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <div class="text-center mb-12">
          <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {{ t('flights.tips.title') }}
          </h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
            {{ t('flights.tips.description') }}
          </p>
        </div>

        <div class="relative max-w-2xl mx-auto">
          <!-- Vija vertikale e ndërprerë -->
          <div
            class="absolute left-5 sm:left-6 top-6 bottom-6 w-px border-l-2 border-dashed border-neutral-200 dark:border-neutral-700"
            aria-hidden="true"
          />

          <ul class="space-y-0">
            <li
              v-for="(tip, i) in tips"
              :key="tip.title"
              class="relative flex gap-4 sm:gap-6 pb-10 last:pb-0"
            >
              <!-- Nyja mbi vijë (rreth + ikonë) -->
              <div
                class="relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 ring-4 ring-white dark:ring-neutral-950"
              >
                <UIcon :name="tip.icon" class="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <!-- Përmbajtja -->
              <div class="flex-1 min-w-0 pt-0.5">
                <h4 class="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base mb-1">
                  {{ tip.title }}
                </h4>
                <p class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed wrap-break-word">
                  {{ tip.description }}
                </p>
              </div>
            </li>
          </ul>
        </div>
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
    <UPageSection
      class="bg-linear-to-br from-primary-600 to-primary-700 text-white"
    >
      <div class="max-w-2xl mx-auto text-center px-4 sm:px-4">
        <h2 class="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
          {{ t('flights.cta.title') }}
        </h2>
        <p class="text-base sm:text-lg mb-6 sm:mb-8 text-primary-100">
          {{ t('flights.cta.description') }}
        </p>
        <div class="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <UButton
            :to="localePath({ name: 'makina-location', params: { location: 'aeroporti-prishtines' } })"
            size="lg"
            color="neutral"
            variant="solid"
            icon="i-lucide-car"
            trailing-icon="i-lucide-arrow-right"
            class="w-full sm:w-auto bg-white text-primary-700 hover:bg-primary-50"
          >
            {{ t('flights.cta.rentCar') }}
          </UButton>
        </div>
      </div>
    </UPageSection>
  </div>
</template>
