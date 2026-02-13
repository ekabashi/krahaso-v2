<script setup lang="ts">
import { useAvailableLocations, type LocationDef } from '../../composables/useAvailableLocations'
import { useAddressStore } from '../../stores/addressStore'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const addressStore = useAddressStore()
const { availableLocations, getLocationImage } = useAvailableLocations()

const currentLocale = computed(() => locale.value as 'sq' | 'en' | 'de')

useSeoPage({
  title: () => `${t('cars.title')} | Krahaso.co`,
  description: () => t('cars.description'),
  canonical: () => localePath('makina'),
  ogImage: () => `${(config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'}/logoRed.png`,
})

if (import.meta.client) {
  onMounted(async () => {
    if (addressStore.pickupCities.length === 0) {
      await addressStore.fetchAllAddresses()
    }
  })
}

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}

/** Only locations that exist in API (pickupCities) – like krahaso.co, not all popular keys */
const popularLocations = computed(() => {
  const cities = addressStore.pickupCities
  if (cities.length === 0) return []

  const availableSet = new Set<string>()
  for (const c of cities) {
    if (c.label) availableSet.add(normalizeName(c.label))
    if (c.value) availableSet.add(normalizeName(c.value))
    if (c.city) availableSet.add(normalizeName(c.city))
  }

  const filtered = availableLocations.value.filter((loc: LocationDef) => {
    const names = [loc.names.sq, loc.names.en, loc.names.de].filter(Boolean) as string[]
    return names.some((name) => {
      const base = normalizeName(name)
      if (availableSet.has(base)) return true
      const airportVariant = base.replace(/\baeroporti\b/, 'airporti')
      return airportVariant !== base && availableSet.has(airportVariant)
    })
  })

  return filtered.map((loc: LocationDef) => ({
    name: loc.names[currentLocale.value],
    slug: loc.slugs[currentLocale.value],
    icon:
      loc.key === 'prishtina-airport' ? 'i-lucide-building-2' : 'i-lucide-map-pin',
    description: t(
      loc.airport ? 'locations.airport.description' : 'locations.city.description',
    ),
    image: getLocationImage(loc),
  }))
})

const popularLocationsLoop = computed(() => {
  const items = popularLocations.value
  return items.length > 0 ? [...items, ...items] : []
})

const conditions = computed(() => [
  {
    icon: 'i-lucide-shield-check',
    title: t('cars.conditions.insurance.title'),
    description: t('cars.conditions.insurance.description'),
  },
  {
    icon: 'i-lucide-file-text',
    title: t('cars.conditions.documents.title'),
    description: t('cars.conditions.documents.description'),
  },
  {
    icon: 'i-lucide-credit-card',
    title: t('cars.conditions.deposit.title'),
    description: t('cars.conditions.deposit.description'),
  },
  {
    icon: 'i-lucide-calendar-x',
    title: t('cars.conditions.cancellation.title'),
    description: t('cars.conditions.cancellation.description'),
  },
])

const faqs = computed(() => [
  { label: t('cars.faq.question1'), content: t('cars.faq.answer1') },
  { label: t('cars.faq.question2'), content: t('cars.faq.answer2') },
  { label: t('cars.faq.question3'), content: t('cars.faq.answer3') },
  { label: t('cars.faq.question4'), content: t('cars.faq.answer4') },
  { label: t('cars.faq.question5'), content: t('cars.faq.answer5') },
  { label: t('cars.faq.question6'), content: t('cars.faq.answer6') },
])

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.value.map((faq) => ({
          '@type': 'Question',
          name: faq.label,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.content,
          },
        })),
      }),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('nav.home'),
            item: 'https://krahaso.co',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('nav.cars'),
            item: `${config.public.siteUrl}${localePath('makina')}`,
          },
        ],
      }),
    },
  ],
}))
</script>

<template>
  <div>
    <!-- Hero header band -->
    <HeroSection>
      <div class="py-10 sm:py-20">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight lg:leading-tight text-center mb-10 sm:mb-14">
          {{ t('cars.title') }}
        </h1>

        <!-- Search Card with floating Tabs -->
        <div class="relative">
          <ProductTabs
            class="absolute left-6 top-3 -translate-y-1/2 z-10 md:left-8"
          />
          <div class="w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 pt-18 pb-8 px-6 md:pt-20 md:pb-10 md:px-8">
            <CarSearchForm embedded />
          </div>
        </div>
      </div>
    </HeroSection>

    <!-- Popular locations -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <UPageSection
          :title="t('locations.popular.title')"
          :description="t('locations.popular.description')"
        >
          <div class="relative overflow-hidden rounded-2xl popular-slider-mask">
            <div class="popular-slider-track">
              <NuxtLink
                v-for="(location, idx) in popularLocationsLoop"
                :key="`${location.slug}-${idx}`"
                :to="localePath({ name: 'makina-location', params: { location: location.slug } })"
                class="group relative block h-64 sm:h-72 w-70 shrink-0 cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl"
              >
                <img
                  :src="location.image"
                  :alt="location.name"
                  class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                >
                <div
                  class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90"
                />
                <div
                  class="absolute bottom-0 left-0 w-full translate-y-2 p-6 transition-transform duration-300 group-hover:translate-y-0"
                >
                  <h3 class="mb-2 text-2xl font-bold text-white">
                    {{ location.name }}
                  </h3>
                  <div
                    class="flex items-center text-sm text-white/80 transition-colors group-hover:text-white"
                  >
                    <span>{{ t('locations.compare') }}</span>
                    <UIcon
                      name="i-lucide-arrow-right"
                      class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </UPageSection>
      </UContainer>
    </section>

    <!-- Conditions -->
    <section class="relative overflow-hidden py-16 sm:py-20 bg-neutral-20 dark:bg-neutral-900">
      <UContainer>
        <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div class="lg:col-span-4">
            <div class="sticky top-24">
              <h2 class="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {{ t('cars.conditions.title') }}
              </h2>
              <p class="mt-4 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                {{ t('cars.conditions.description') }}
              </p>
            </div>
          </div>

          <div class="lg:col-span-8">
            <div class="relative pl-0 sm:pl-3">
              <div class="space-y-1">
                <div
                  v-for="(condition, index) in conditions"
                  :key="condition.title"
                  class="group flex items-start gap-4 sm:gap-5 rounded-xl px-3 py-5 sm:px-4 sm:py-6 transition-colors duration-200 hover:bg-white/70 dark:hover:bg-neutral-900/60"
                >
                  <div class="relative shrink-0">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                      <UIcon :name="condition.icon" class="h-4 w-4" />
                    </div>
                    <span class="absolute -right-2 -top-2 rounded-full border border-primary/20 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary dark:bg-neutral-900">
                      {{ index + 1 }}
                    </span>
                    <div
                      v-if="index < conditions.length - 1"
                      class="hidden sm:flex absolute left-1/2 top-[calc(100%+4px)] -translate-x-1/2 flex-col items-center text-primary/80"
                    >
                      <div class="h-8 w-px bg-primary/40" />
                      <UIcon name="i-lucide-arrow-down" class="h-4 w-4 -mt-0.5" />
                    </div>
                  </div>
                  <div class="min-w-0 border-b border-neutral-200/70 dark:border-neutral-800 pb-5 sm:pb-6 flex-1">
                    <h3 class="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
                      {{ condition.title }}
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {{ condition.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- FAQ -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <LandingFAQSection
          :items="faqs"
          :title="t('cars.faq.title')"
          :description="t('cars.faq.description')"
        />
      </UContainer>
    </section>

    <!-- CTA -->
    <section class="bg-linear-to-br from-primary-600 to-primary-700 text-white py-4 sm:py-4">
      <div class="max-w-6xl mx-auto px-4 sm:px-4">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div class="lg:col-span-5 text-center lg:text-left">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              {{ t('cars.cta.title') }}
            </h2>
            <p class="text-base sm:text-lg text-primary-100 mb-7 max-w-xl mx-auto lg:mx-0">
              {{ t('cars.cta.description') }}
            </p>
            <div class="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
              <UButton
                :to="localePath('makina')"
                size="lg"
                color="neutral"
                variant="solid"
                trailing-icon="i-lucide-arrow-up"
                class="w-full sm:w-auto bg-white text-primary-700 hover:bg-primary-50"
              >
                {{ t('cars.cta.searchCars') }}
              </UButton>
              <UButton
                :to="localePath('fluturime')"
                size="lg"
                color="neutral"
                variant="solid"
                trailing-icon="i-lucide-arrow-right"
                class="w-full sm:w-auto bg-white/15 text-white hover:bg-white/25"
              >
                {{ t('cars.cta.searchFlights') }}
              </UButton>
            </div>
          </div>

          <div class="lg:col-span-7">
            <div class="relative mx-auto lg:ml-auto lg:mr-0 lg:translate-x-12 w-full max-w-3xl min-h-82.5 sm:min-h-97.5">
              <img
                src="/cars.png"
                alt="Car rental"
                class="relative z-10 w-full h-82.5 sm:h-97.5 object-contain object-right drop-shadow-[0_24px_24px_rgba(0,0,0,0.30)]"
                loading="lazy"
              >
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.popular-slider-mask {
  -webkit-mask-image: none;
  mask-image: none;
}

.popular-slider-track {
  display: flex;
  gap: 1.5rem;
  width: max-content;
  animation: popular-locations-marquee 50s linear infinite;
}

.popular-slider-track:hover {
  animation-play-state: paused;
}

@keyframes popular-locations-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-50% - 0.75rem));
  }
}
</style>
