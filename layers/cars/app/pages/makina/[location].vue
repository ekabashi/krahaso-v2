<script setup lang="ts">
import { useAvailableLocations, type LocationDef } from '../../composables/useAvailableLocations'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const { availableLocations, getLocationImage, getLocationBySlug } = useAvailableLocations()

const currentLocale = computed(() => locale.value as 'sq' | 'en' | 'de')
const locationSlug = computed(() => String(route.params.location || ''))

const locationDef = computed<LocationDef | null>(() => {
  const slug = locationSlug.value
  if (!slug) return null
  return getLocationBySlug(slug) ?? null
})

watchEffect(() => {
  if (locationSlug.value && !locationDef.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Location not found',
    })
  }
})

const locationData = computed(() => {
  if (!locationDef.value) return null
  const def = locationDef.value
  return {
    name: def.names[currentLocale.value],
    description: def.airport
      ? t('locations.airport.description')
      : t('locations.city.description'),
    pickup: def.pickup,
    airport: def.airport,
    avgPrice: def.avgPrice,
  }
})

const locationBackgroundImage = computed(() =>
  locationDef.value ? getLocationImage(locationDef.value) : null,
)

const pageTitle = computed(() =>
  locationData.value
    ? `${t('cars.title')} ${locationData.value.name} | Krahaso.co`
    : t('cars.title'),
)

const pageDescription = computed(() =>
  locationData.value
    ? `${t('cars.title')} ${locationData.value.name}. ${locationData.value.description} ${t('cars.comparePrices')}`
    : t('cars.description'),
)

const canonical = computed(() => {
  if (!locationDef.value) {
    return `${config.public.siteUrl}${localePath('/makina')}`
  }
  const slug = locationDef.value.slugs[currentLocale.value]
  return `${config.public.siteUrl}${localePath(`/makina/${slug}`)}`
})

useSeoPage({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  canonical: () => canonical.value,
})

function scrollToSearchForm() {
  if (import.meta.client) {
    const el = document.getElementById('search-form')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
}

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

const highlights = computed(() => [
  {
    icon: 'i-lucide-map-pin',
    label: t('locations.pickup'),
    value: locationData.value?.pickup ? t('locations.available') : t('locations.notAvailable'),
  },
  {
    icon: 'i-lucide-building-2',
    label: t('locations.type'),
    value: locationData.value?.name ?? '',
  },
  {
    icon: 'i-lucide-shield-check',
    label: t('locations.verified'),
    value: t('locations.partners'),
  },
  {
    icon: 'i-lucide-tag',
    label: t('cars.avgPrice'),
    value:
      locationData.value?.avgPrice != null
        ? t('cars.avgPriceLabel', { price: locationData.value.avgPrice })
        : '',
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

const relatedLocations = computed(() => {
  const current = locationDef.value
  if (!current) return []
  return availableLocations.value
    .filter((loc: LocationDef) => loc.key !== current.key)
    .slice(0, 8)
    .map((loc: LocationDef) => ({
      key: loc.key,
      name: loc.names[currentLocale.value],
      slug: loc.slugs[currentLocale.value],
      image: getLocationImage(loc),
    }))
})

useHead(() =>
  locationData.value
    ? {
        script: [
          {
            type: 'application/ld+json',
            children: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.value.map((faq) => ({
                '@type': 'Question',
                name: faq.label,
                acceptedAnswer: { '@type': 'Answer', text: faq.content },
              })),
            }),
          },
          {
            type: 'application/ld+json',
            children: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: t('nav.home'), item: `${config.public.siteUrl}${localePath('/')}` },
                { '@type': 'ListItem', position: 2, name: t('nav.cars'), item: `${config.public.siteUrl}${localePath('/makina')}` },
                { '@type': 'ListItem', position: 3, name: locationData.value.name, item: `${config.public.siteUrl}${localePath(`/makina/${locationSlug.value}`)}` },
              ],
            }),
          },
        ],
      }
    : {},
)
</script>

<template>
  <div>
    <UContainer class="py-4 sm:py-6">
      <UBreadcrumb
        :items="[
          { label: t('nav.home'), to: localePath('/') },
          { label: t('nav.cars'), to: localePath('/makina') },
          { label: locationData?.name ?? '' },
        ]"
        class="mb-4 sm:mb-6 max-w-6xl mx-auto"
      />
    </UContainer>

    <!-- Hero with background image -->
    <div
      v-if="locationBackgroundImage"
      class="relative w-full overflow-hidden min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] flex items-center"
    >
      <div
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${locationBackgroundImage})` }"
      >
        <div class="absolute inset-0 bg-linear-to-t from-gray-900/90 via-gray-900/60 to-gray-900/40" />
      </div>
      <div class="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">
          {{ locationData ? `${t('cars.title')} ${locationData.name}` : t('cars.title') }}
        </h1>
        <p class="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto mb-6 sm:mb-8">
          {{ locationData ? locationData.description : t('cars.description') }}
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <UButton
            color="primary"
            size="lg"
            icon="i-lucide-search"
            @click="scrollToSearchForm"
          >
            {{ t('cars.searchNow') }}
          </UButton>
          <UButton
            :to="localePath('/')"
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-plane"
            class="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            {{ t('seo.location.searchFlights') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Fallback hero -->
    <UPageHero
      v-else
      :title="locationData ? `${t('cars.title')} ${locationData.name}` : t('cars.title')"
      :description="locationData ? locationData.description : t('cars.description')"
    >
      <template #default>
        <div class="mt-2 flex flex-wrap justify-center gap-4">
          <UButton color="primary" size="lg" icon="i-lucide-search" @click="scrollToSearchForm">
            {{ t('cars.searchNow') }}
          </UButton>
          <UButton
            :to="localePath('/')"
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-plane"
          >
            {{ t('seo.location.searchFlights') }}
          </UButton>
        </div>
      </template>
    </UPageHero>

    <UContainer class="py-8">
      <UPageSection id="search-form">
        <CarSearchForm :default-location-key="locationDef?.key ?? ''" />
      </UPageSection>

      <UPageSection v-if="locationData" class="mb-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <UCard
            v-for="highlight in highlights"
            :key="highlight.label"
            :ui="{ body: 'p-6' }"
            class="text-center hover:shadow-md transition-shadow"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <UIcon :name="highlight.icon" class="h-6 w-6 text-primary" />
              </div>
              <p class="text-xs text-muted mb-1">{{ highlight.label }}</p>
              <p class="text-lg font-semibold">{{ highlight.value }}</p>
            </div>
          </UCard>
        </div>
      </UPageSection>

      <UPageSection
        :title="t('cars.conditions.title')"
        :description="t('cars.conditions.description')"
        class="mb-12"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UCard
            v-for="condition in conditions"
            :key="condition.title"
            :ui="{ body: 'p-6' }"
            class="text-center hover:shadow-md transition-shadow"
          >
            <div class="flex flex-col items-center space-y-3">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <UIcon :name="condition.icon" class="text-3xl text-primary" />
              </div>
              <h3 class="font-semibold">{{ condition.title }}</h3>
              <p class="text-sm text-muted">{{ condition.description }}</p>
            </div>
          </UCard>
        </div>
      </UPageSection>
    </UContainer>

    <!-- SEO content block -->
    <section class="relative overflow-hidden bg-linear-to-br from-primary-800 via-slate-800 to-primary-700 py-20 sm:py-28">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary" />
              <span class="text-sm font-medium text-primary">{{ locationData?.name ?? '' }}</span>
            </div>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {{ t('seo.location.title', { location: locationData?.name ?? '' }) }}
            </h2>
            <p class="text-lg text-slate-300 mb-8 leading-relaxed">
              {{ t('seo.location.intro', { location: locationData?.name ?? '' }) }}
            </p>
            <div class="space-y-4">
              <div
                v-for="feature in [
                  { key: 'feature1', icon: 'i-lucide-map-pin', location: true },
                  { key: 'feature2', icon: 'i-lucide-zap', location: false },
                  { key: 'feature3', icon: 'i-lucide-shield-check', location: false },
                  { key: 'feature4', icon: 'i-lucide-tag', location: false },
                ]"
                :key="feature.key"
                class="flex items-start gap-4"
              >
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shrink-0 mt-0.5">
                  <UIcon :name="feature.icon" class="w-5 h-5 text-primary" />
                </div>
                <p class="text-base text-slate-200 leading-relaxed pt-2">
                  {{
                    feature.location
                      ? t(`seo.location.${feature.key}`, { location: locationData?.name ?? '' })
                      : t(`seo.location.${feature.key}`)
                  }}
                </p>
              </div>
            </div>
          </div>
          <div class="relative">
            <div class="absolute inset-0 bg-linear-to-br from-primary/30 to-primary/30 rounded-3xl blur-2xl" />
            <div class="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">150+</div>
                  <div class="text-sm font-bold text-primary-200">{{ t('cars.cars') }} {{ t('locations.available').toLowerCase() }}</div>
                </div>
                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">24/7</div>
                  <div class="text-sm font-bold text-primary-200">Support</div>
                </div>
                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">100%</div>
                  <div class="text-sm font-bold text-primary-200">Satisfied clients</div>
                </div>
                <div class="bg-linear-to-br from-primary-600/30 to-primary-600/30 backdrop-blur-sm rounded-2xl p-6 border border-primary-400/30">
                  <div class="text-3xl font-bold text-primary-400 mb-2">25€+</div>
                  <div class="text-sm font-bold text-primary-200">Starting price</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <UPageSection class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-3xl sm:text-4xl font-bold text-default mb-4">
          {{ t('seo.content.trust.title') }}
        </h2>
        <p class="text-lg text-muted max-w-3xl mx-auto">
          {{ t('seo.content.trust.description') }}
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UCard class="group rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700">
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div class="shrink-0 w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <UIcon name="i-lucide-shield-check" class="w-7 h-7 text-primary" />
            </div>
            <div class="flex-1 text-center sm:text-left">
              <h4 class="text-xl font-bold mb-3">{{ t('seo.content.trust.verified.title') }}</h4>
              <p class="text-base text-muted leading-relaxed">
                {{ t('seo.content.trust.verified.description') }}
              </p>
            </div>
          </div>
        </UCard>
        <UCard class="group rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700">
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div class="shrink-0 w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <UIcon name="i-lucide-tag" class="w-7 h-7 text-primary" />
            </div>
            <div class="flex-1 text-center sm:text-left">
              <h4 class="text-xl font-bold mb-3">{{ t('seo.content.trust.transparent.title') }}</h4>
              <p class="text-base text-muted leading-relaxed">
                {{ t('seo.content.trust.transparent.description') }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </UPageSection>

    <div class="py-4">
      <UPageSection :title="t('faq.title')" :description="t('faq.description')">
        <div class="w-full max-w-3xl mx-auto px-4 sm:px-6">
          <UAccordion :items="faqs" />
        </div>
      </UPageSection>

      <UPageSection
        v-if="relatedLocations.length > 0"
        :title="t('locations.related')"
        :description="t('locations.relatedDescription')"
        class="mb-12"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <NuxtLink
            v-for="related in relatedLocations"
            :key="related.key"
            :to="localePath(`/makina/${related.slug}`)"
            class="group relative h-80 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 block"
          >
            <img
              :src="related.image"
              :alt="related.name"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            >
            <div class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
            <div class="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 class="text-2xl font-bold text-white mb-2">{{ related.name }}</h3>
              <div class="flex items-center text-white/80 text-sm group-hover:text-white transition-colors">
                <span>{{ t('locations.compare') }}</span>
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </UPageSection>

      <UPageSection class="rounded-2xl bg-linear-to-br from-primary-600 to-primary-700 text-white p-8">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-2xl font-bold mb-4">{{ t('seo.location.cta') }}</h2>
          <p class="mb-6 text-primary-100">{{ t('seo.location.ctaDescription') }}</p>
          <div class="flex flex-wrap justify-center gap-4">
            <UButton
              :to="localePath('/')"
              size="lg"
              trailing-icon="i-lucide-arrow-right"
              class="bg-white text-primary-700 hover:bg-primary-50"
            >
              {{ t('seo.location.searchFlights') }}
            </UButton>
            <UButton
              size="lg"
              variant="outline"
              trailing-icon="i-lucide-arrow-right"
              class="border-white text-white hover:bg-white/10"
              @click="scrollToSearchForm"
            >
              {{ t('cars.searchNow') }}
            </UButton>
          </div>
        </div>
      </UPageSection>
    </div>
  </div>
</template>
