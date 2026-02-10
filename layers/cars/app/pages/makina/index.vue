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

const conditions = computed(() => [
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
    icon: 'i-lucide-shield-check',
    title: t('cars.conditions.insurance.title'),
    description: t('cars.conditions.insurance.description'),
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
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <NuxtLink
              v-for="location in popularLocations"
              :key="location.slug"
              :to="localePath({ name: 'makina-location', params: { location: location.slug } })"
              class="group relative block h-64 sm:h-80 lg:h-96 cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl"
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
        </UPageSection>
      </UContainer>
    </section>

    <!-- Conditions -->
    <section class="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-900">
      <UContainer>
        <UPageSection
          :title="t('cars.conditions.title')"
          :description="t('cars.conditions.description')"
        >
          <div class="max-w-6xl mx-auto">
            <LandingFeatureGrid :features="conditions" />
          </div>
        </UPageSection>
      </UContainer>
    </section>

    <!-- FAQ -->
    <section class="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-900">
      <UContainer>
        <LandingFAQSection
          :items="faqs"
          :title="t('cars.faq.title')"
          :description="t('cars.faq.description')"
        />
      </UContainer>
    </section>

    <!-- CTA – minimal, i njëjtë si [location] -->
    <section class="py-16 sm:py-20">
      <UContainer>
        <div class="max-w-7xl mx-4 sm:mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-6 py-20 sm:px-8 sm:py-20">
          <div class="text-center">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {{ t('cars.cta.title') }}
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              {{ t('cars.cta.description') }}
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <UButton
                :to="localePath('makina')"
                size="lg"
                color="primary"
                icon="i-lucide-search"
                trailing-icon="i-lucide-arrow-right"
                class="w-full sm:w-auto"
              >
                {{ t('cars.cta.searchCars') }}
              </UButton>
              <NuxtLink
                :to="localePath('fluturime')"
                class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
              >
                {{ t('cars.cta.searchFlights') }}
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>
