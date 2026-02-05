<script setup lang="ts">
import type { LocationDef } from '../../utils/locations'
import { useAddressStore } from '../../stores/addressStore'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const addressStore = useAddressStore()
const { availableLocations, getLocationImage } = useAvailableLocations()

const currentLocale = computed(() => locale.value as 'sq' | 'en' | 'de')

useSeoPage({
  title: () => `${t('cars.title')} | Krahaso.co`,
  description: () => t('cars.description'),
  canonical: () => localePath('/makina'),
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

const filters = computed(() => [
  {
    icon: 'i-lucide-tag',
    title: t('cars.filters.price.title'),
    description: t('cars.filters.price.description'),
  },
  {
    icon: 'i-lucide-settings',
    title: t('cars.filters.transmission.title'),
    description: t('cars.filters.transmission.description'),
  },
  {
    icon: 'i-lucide-fuel',
    title: t('cars.filters.fuel.title'),
    description: t('cars.filters.fuel.description'),
  },
  {
    icon: 'i-lucide-users',
    title: t('cars.filters.seats.title'),
    description: t('cars.filters.seats.description'),
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
            item: 'https://krahaso.co/makina',
          },
        ],
      }),
    },
  ],
}))
</script>

<template>
  <div>
    <UContainer class="py-8">
      <UBreadcrumb
        :items="[
          { label: t('nav.home'), to: localePath('/') },
          { label: t('nav.cars') },
        ]"
        class="mb-6"
      />

      <!-- Hero -->
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold">
          {{ t('cars.title') }}
        </h1>
        <p class="text-muted">
          {{ t('cars.description') }}
        </p>
      </div>

      <!-- Search form -->
      <div class="mb-8">
        <CarSearchForm />
      </div>

      <!-- Results are on /makina/search -->

      <!-- Popular locations -->
      <UPageSection
        :title="t('locations.popular.title')"
        :description="t('locations.popular.description')"
        class="mb-6 sm:mb-12"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          <NuxtLink
            v-for="location in popularLocations"
            :key="location.slug"
            :to="localePath(`/makina/${location.slug}`)"
            class="group relative block h-96 cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl"
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

      <!-- Conditions -->
      <UPageSection
        :title="t('cars.conditions.title')"
        :description="t('cars.conditions.description')"
        class="mb-6 sm:mb-12"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          <UCard
            v-for="condition in conditions"
            :key="condition.title"
            class="group text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div class="flex flex-col items-center space-y-2">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20 sm:h-16 sm:w-16"
              >
                <UIcon
                  :name="condition.icon"
                  class="text-2xl text-primary sm:text-3xl"
                />
              </div>
              <h3 class="text-sm font-semibold sm:text-base">
                {{ condition.title }}
              </h3>
              <p class="wrap-break-words text-xs text-muted sm:text-sm">
                {{ condition.description }}
              </p>
            </div>
          </UCard>
        </div>
      </UPageSection>

      <!-- Filters -->
      <UPageSection
        :title="t('cars.filters.title')"
        :description="t('cars.filters.description')"
        class="mx-auto mb-6 max-w-5xl sm:mb-6"
      >
        <div class="flex flex-col gap-4 sm:gap-6">
          <UCard
            v-for="filter in filters"
            :key="filter.title"
            :ui="{ body: 'p-4 sm:p-5' }"
            class="group cursor-pointer transition-all duration-200 hover:shadow-md"
          >
            <div class="flex items-center gap-4 sm:gap-6">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20 sm:h-14 sm:w-14"
              >
                <UIcon
                  :name="filter.icon"
                  class="h-6 w-6 text-primary sm:h-7 sm:w-7"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="mb-1 text-base font-semibold sm:text-lg">
                  {{ filter.title }}
                </h4>
                <p class="text-sm leading-relaxed text-muted sm:text-base">
                  {{ filter.description }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </UPageSection>

      <!-- FAQ (only on landing) -->
      <UPageSection
        :title="t('cars.faq.title')"
        :description="t('cars.faq.description')"
      >
        <div class="w-full lg:w-3xl mx-auto px-4 sm:px-6">
          <UAccordion :items="faqs" />
        </div>
      </UPageSection>

      <!-- CTA -->
      <UPageSection
        class="w-full rounded-2xl bg-linear-to-br from-primary-600 to-primary-700 p-6 text-white sm:p-8"
      >
        <div class="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 class="mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">
            {{ t('cars.cta.title') }}
          </h2>
          <p class="mb-4 text-sm text-primary-100 sm:mb-4 sm:text-base">
            {{ t('cars.cta.description') }}
          </p>
          <UButton
            :to="localePath('/')"
            size="lg"
            color="neutral"
            variant="solid"
            trailing-icon="i-lucide-arrow-right"
            class="w-full bg-white text-primary-700 hover:bg-primary-50 sm:w-auto"
          >
            {{ t('cars.cta.searchFlights') }}
          </UButton>
        </div>
      </UPageSection>
    </UContainer>
  </div>
</template>
