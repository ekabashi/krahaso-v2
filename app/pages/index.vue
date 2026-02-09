<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const config = useRuntimeConfig()

useSeoPage({
  title: t('landing.seo.title'),
  description: t('landing.seo.description'),
  canonical: '/',
  ogImage: () => `${config.public.siteUrl}/logoRed.png`,
})

const howItWorksSteps = [
  { key: 'search', icon: 'i-lucide-search' },
  { key: 'compare', icon: 'i-lucide-arrow-left-right' },
  { key: 'book', icon: 'i-lucide-external-link' },
]

const popularRoutes = [
  { from: 'Prishtinë', to: 'Düsseldorf', slug: 'prishtine-dusseldorf', img: '/img/duesseldorf-skyline.jpg' },
  { from: 'Prishtinë', to: 'Zürich', slug: 'prishtine-zurich', img: '/city/prizren.jpg' },
  { from: 'Prishtinë', to: 'Wien', slug: 'prishtine-vienna', img: '/city/prishtina.jpg' },
  { from: 'Prishtinë', to: 'Frankfurt', slug: 'prishtine-frankfurt', img: '/city/gjakova.jpg' },
  { from: 'Prishtinë', to: 'München', slug: 'prishtine-munich', img: '/city/mitrovica.jpg' },
  { from: 'Prishtinë', to: 'Amsterdam', slug: 'prishtine-amsterdam', img: '/city/peja.jpg' },
]

const popularLocations = [
  { label: t('locations.popular.airport'), slug: 'aeroporti-prishtines', img: '/city/prishtina-airport.jpg' },
  { label: t('locations.popular.prishtine'), slug: 'prishtine', img: '/city/prishtina.jpg' },
  { label: t('locations.popular.prizren'), slug: 'prizren', img: '/city/prizren.jpg' },
  { label: t('locations.popular.peje'), slug: 'peje', img: '/city/peja.jpg' },
]

const faqItems = [
  { q: 'landing.faq.items.q1', a: 'landing.faq.items.a1' },
  { q: 'landing.faq.items.q2', a: 'landing.faq.items.a2' },
  { q: 'landing.faq.items.q3', a: 'landing.faq.items.a3' },
  { q: 'landing.faq.items.q4', a: 'landing.faq.items.a4' },
  { q: 'landing.faq.items.q5', a: 'landing.faq.items.a5' },
]

const whatsappNumber = useRuntimeConfig().public.whatsappNumber || ''
const whatsappLink = computed(() =>
  whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}` : '#'
)

function onCarSearch(params: Record<string, string>) {
  if (import.meta.client) {
    const url = router.resolve({ path: localePath('makina-search'), query: params }).href
    void navigateTo(url, { external: true })
    return
  }
  router.push({ path: localePath('makina-search'), query: params })
}

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'Krahaso.co',
        'url': 'https://krahaso.co',
        'description': t('landing.seo.description'),
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': 'https://krahaso.co/flights?from={search_term_string}&to={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'Krahaso.co',
        'url': 'https://krahaso.co',
        'logo': 'https://krahaso.co/logo.png',
        'description': t('landing.seo.description'),
        'sameAs': []
      })
    }
  ]
}))
</script>

<template>
  <div class="relative bg-neutral-50">
    <!-- Hero + Search -->
    <HeroSection>
      <div class="py-12 sm:py-24">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight lg:leading-tight mb-12 sm:mb-18 text-center">
          {{ $t('landing.hero.title') }} {{ $t('landing.hero.titleHighlight') }}<span class="text-primary-600">.</span>
        </h1>

        <!-- Search Card with floating Tabs -->
        <div class="relative">
          <ProductTabs class="absolute left-6 top-3 -translate-y-1/2 z-10 md:left-8" />

          <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 pt-18 pb-8 px-6 md:pt-20 md:pb-10 md:px-8">
            <CarSearchForm
              embedded
              @search="onCarSearch"
            />
          </div>
        </div>
      </div>
    </HeroSection>

    <!-- How It Works -->
    <section class="py-16 sm:py-20 bg-white dark:bg-neutral-900 border-y border-neutral-100 dark:border-neutral-800">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white text-center mb-2">
          {{ t('landing.howItWorks.title') }}
        </h2>
        <p class="text-sm text-neutral-500 text-center mb-12">
          {{ t('landing.howItWorks.description') }}
        </p>

        <div class="relative">
          <!-- Connecting line (desktop) -->
          <div class="hidden md:block absolute top-6 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed border-neutral-200 dark:border-neutral-700" />

          <div class="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            <div
              v-for="(step, i) in howItWorksSteps"
              :key="step.key"
              class="relative text-center"
            >
              <div class="relative z-10 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary-600 text-white shadow-md shadow-primary-200 mb-4">
                <UIcon :name="step.icon" class="text-lg" />
              </div>
              <h3 class="text-base font-semibold text-neutral-900 dark:text-white mb-1">
                {{ t(`landing.howItWorks.steps.${step.key}.title`) }}
              </h3>
              <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[240px] mx-auto">
                {{ t(`landing.howItWorks.steps.${step.key}.description`) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Popular Destinations -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <!-- Flights -->
        <div class="mb-16 text-center">
          <div class="flex items-center justify-center gap-2 mb-8">
            <UIcon name="i-lucide-plane" class="text-primary-500" />
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
              {{ t('landing.routes.title') }}
            </h2>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <NuxtLink
              v-for="route in popularRoutes"
              :key="route.slug"
              :to="localePath({ name: 'fluturime-route', params: { route: route.slug } })"
              class="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div class="aspect-[4/3] overflow-hidden">
                <img
                  :src="route.img"
                  :alt="`${route.from} → ${route.to}`"
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div class="p-3 text-center">
                <span class="block text-xs font-semibold text-neutral-900 dark:text-white">{{ route.to }}</span>
                <span class="text-[11px] text-neutral-400">{{ route.from }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Cars -->
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 mb-8">
            <UIcon name="i-lucide-car" class="text-primary-500" />
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
              {{ t('landing.locations.popular.title') }}
            </h2>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NuxtLink
              v-for="loc in popularLocations"
              :key="loc.slug"
              :to="localePath({ name: 'makina-location', params: { location: loc.slug } })"
              class="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div class="aspect-[4/3] overflow-hidden">
                <img
                  :src="loc.img"
                  :alt="loc.label"
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div class="p-3 text-center">
                <span class="block text-xs font-semibold text-neutral-900 dark:text-white">{{ loc.label }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 sm:py-20 bg-white dark:bg-neutral-900 border-y border-neutral-100 dark:border-neutral-800">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white text-center mb-2">
          {{ t('landing.faq.title') }}
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-10">
          {{ t('landing.faq.description') }}
        </p>

        <UAccordion
          :items="faqItems.map((item, i) => ({
            label: t(item.q),
            content: t(item.a),
            value: String(i),
          }))"
          :ui="{ item: 'border-b border-neutral-100 dark:border-neutral-800' }"
        />
      </div>
    </section>

    <!-- WhatsApp CTA -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#075e54] to-[#064e46] px-6 py-10 sm:px-10 sm:py-14 text-white">
          <!-- Decorative glow -->
          <div class="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#25d366]/10 blur-[80px] pointer-events-none" />
          <div class="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#25d366]/5 blur-[60px] pointer-events-none" />
          <div class="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <!-- Text -->
            <div class="flex-1 text-center lg:text-left">
              <div class="flex items-center justify-center lg:justify-start gap-2 mb-3">
                <UIcon name="i-simple-icons-whatsapp" class="text-2xl text-[#25d366]" />
                <span class="text-xs font-semibold uppercase tracking-wider text-white/70">WhatsApp</span>
              </div>
              <h2 class="text-xl sm:text-2xl font-bold mb-2">
                {{ t('landing.whatsapp.title') }}
              </h2>
              <p class="text-sm text-white/80 mb-6 max-w-md">
                {{ t('landing.whatsapp.description') }}
              </p>
              <div class="flex flex-wrap justify-center lg:justify-start gap-4 mb-6 text-sm">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-zap" class="text-[#25d366]" /> {{ t('landing.whatsapp.features.fast') }}
                </span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-smartphone" class="text-[#25d366]" /> {{ t('landing.whatsapp.features.easy') }}
                </span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-heart" class="text-[#25d366]" /> {{ t('landing.whatsapp.features.free') }}
                </span>
              </div>
              <UButton
                :to="whatsappLink"
                target="_blank"
                rel="noopener"
                size="lg"
                class="bg-[#25d366] hover:bg-[#20bd5a] text-white font-semibold"
                icon="i-simple-icons-whatsapp"
              >
                {{ t('landing.whatsapp.cta') }}
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
  </div>
</template>

