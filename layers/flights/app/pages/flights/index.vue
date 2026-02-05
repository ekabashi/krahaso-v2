<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const { t } = useI18n()
const { searchState, searchError, clearResults, navigateToFlightsSearch } = useFlightSearch()
const { getAirportByCode, fetchAirports, airports } = useAirports()

const route = useRoute()
const localePath = useLocalePath()

useSeoPage({
  title: () => `${t('flights.title')} | Krahaso.co`,
  description: () => t('flights.description')
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
            'item': 'https://krahaso.co/flights'
          }
        ]
      })
    }
  ]
}))

const autoSearchAttempted = ref(false)
const isApplyingQuery = ref(false)
const queryError = ref<string | null>(null)
const searchFormOpen = ref<string | undefined>('0')

const hasQueryParams = computed(() => Object.keys(route.query).length > 0)

const hasSearchCriteria = computed(() => {
  return !!(searchState.value.origin && searchState.value.destination && searchState.value.departureDate)
})

function parseDateParam(value: string | null): CalendarDate | null {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || !month || !day) return null
  return new CalendarDate(year, month, day)
}

function buildAirport(code: string) {
  const upper = code.toUpperCase()
  return {
    id: upper,
    code: upper,
    name: upper,
    city: upper,
    country: 'Unknown'
  }
}

async function resolveAirport(code: string) {
  const upper = code.toUpperCase()
  const resolved = await getAirportByCode(upper)
  return resolved || buildAirport(upper)
}

async function applyQueryToSearchState(): Promise<void> {
  if (isApplyingQuery.value) return
  isApplyingQuery.value = true
  queryError.value = null

  const from = typeof route.query.from === 'string' ? route.query.from : null
  const to = typeof route.query.to === 'string' ? route.query.to : null
  const date = typeof route.query.date === 'string' ? route.query.date : (typeof route.query.departDate === 'string' ? route.query.departDate : null)
  const returnDate = typeof route.query.returnDate === 'string' ? route.query.returnDate : null

  if (airports.value.length === 0) {
    await fetchAirports()
  }

  if (!from || !to) {
    if (from || to) {
      const [origin, destination] = await Promise.all([
        from ? resolveAirport(from) : Promise.resolve(null),
        to ? resolveAirport(to) : Promise.resolve(null)
      ])
      if (origin) searchState.value.origin = origin
      if (destination) searchState.value.destination = destination
      searchFormOpen.value = '0'
    }
    isApplyingQuery.value = false
    return
  }

  if (!date) {
    const [origin, destination] = await Promise.all([
      resolveAirport(from),
      resolveAirport(to)
    ])
    searchState.value.origin = origin
    searchState.value.destination = destination
    searchFormOpen.value = '0'
    isApplyingQuery.value = false
    return
  }

  const departure = parseDateParam(date)
  if (!departure) {
    queryError.value = t('errors.invalidDate')
    searchFormOpen.value = '0'
    isApplyingQuery.value = false
    return
  }

  const [origin, destination] = await Promise.all([
    resolveAirport(from),
    resolveAirport(to)
  ])

  searchState.value.origin = origin
  searchState.value.destination = destination
  searchState.value.departureDate = departure
  searchState.value.returnDate = returnDate ? parseDateParam(returnDate) : null
  searchState.value.tripType = returnDate ? 'roundtrip' : 'oneway'

  if (typeof route.query.adults === 'string') {
    const adults = Number(route.query.adults)
    if (Number.isFinite(adults) && adults > 0) searchState.value.passengers.adults = adults
  }
  if (typeof route.query.children === 'string') {
    const children = Number(route.query.children)
    if (Number.isFinite(children) && children >= 0) searchState.value.passengers.children = children
  }
  if (typeof route.query.infants === 'string') {
    const infants = Number(route.query.infants)
    if (Number.isFinite(infants) && infants >= 0) searchState.value.passengers.infants = infants
  }

  clearResults()
  autoSearchAttempted.value = false
  isApplyingQuery.value = false
}

onMounted(() => {
  if (Object.keys(route.query).length > 0) {
    void applyQueryToSearchState()
  }
})

watch(
  () => route.query,
  (next, prev) => {
    if (next !== prev) {
      void applyQueryToSearchState()
    }
  }
)

async function onSearch() {
  await navigateToFlightsSearch()
}
</script>

<template>
  <div class="relative">

    <UContainer class="py-8">
      <UBreadcrumb
        :items="[
          { label: $t('nav.home'), to: '/' },
          { label: $t('nav.flights') }
        ]"
        class="mb-6"
      />

      <!-- Hero Section (only when no search) -->
      <div
        v-if="!hasSearchCriteria && !hasQueryParams"
        class="mb-6"
      >
        <h1 class="text-3xl font-bold mb-2">
          {{ t('flights.title') }}
        </h1>
        <p class="text-muted">
          {{ t('flights.description') }}
        </p>
      </div>

      <!-- Search Form -->
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FlightSearchForm @search="onSearch" />
      </div>

      <UAlert
        v-if="queryError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('errors.title')"
        :description="queryError"
        class="mb-6"
        close
        @update:open="queryError = null"
      />

      <UAlert
        v-if="searchError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('errors.title')"
        :description="searchError"
        class="mb-6"
        close
        @update:open="searchError = null"
      />

      <!-- Results Section -->
      <div v-if="!hasSearchCriteria && !hasQueryParams">
        <!-- Popular Routes Section -->
        <UPageSection
          :title="t('flights.routes.title')"
          :description="t('flights.routes.description')"
          class="mb-12"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
            <NuxtLink
              v-for="routeItem in popularRoutes"
              :key="routeItem.slug"
              :to="localePath(`/flights/${routeItem.slug}`)"
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
                      <span class="block text-2xl font-bold text-gray-900 mb-1">{{ routeItem.code.split('-')[0] }}</span>
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
                      <span class="block text-2xl font-bold text-gray-900 mb-1">{{ routeItem.code.split('-')[1] }}</span>
                      <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Destinacion</span>
                    </div>
                  </div>

                  <!-- Route Details -->
                  <div class="flex items-center justify-between pt-4 border-t border-dashed border-gray-100">
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
                <div class="absolute top-[88px] -left-1.5 w-3 h-3 rounded-full bg-gray-50 border border-t-transparent border-l-transparent border-gray-100 rotate-45" />
                <div class="absolute top-[88px] -right-1.5 w-3 h-3 rounded-full bg-gray-50 border border-t-transparent border-r-transparent border-gray-100 -rotate-45" />
              </div>
            </NuxtLink>
          </div>
        </UPageSection>

        <!-- Highlights Section -->
        <UPageSection
          :title="t('flights.highlights.title')"
          :description="t('flights.highlights.description')"
          class="mb-8 sm:mb-12"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <UCard
              v-for="highlight in highlights"
              :key="highlight.title"
              :ui="{ body: 'p-4 sm:p-6' }"
              class="text-center"
            >
              <div class="flex flex-col items-center space-y-2 sm:space-y-3">
                <div class="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <UIcon
                    :name="highlight.icon"
                    class="text-2xl sm:text-3xl text-primary"
                  />
                </div>
                <h3 class="font-semibold text-sm sm:text-base">
                  {{ highlight.title }}
                </h3>
                <p class="text-xs sm:text-sm text-muted wrap-break-word">
                  {{ highlight.description }}
                </p>
              </div>
            </UCard>
          </div>
        </UPageSection>

        <!-- Tips Section -->
        <UPageSection
          :title="t('flights.tips.title')"
          :description="t('flights.tips.description')"
          class="mb-8 sm:mb-12 bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/20 dark:to-primary-900/20 rounded-2xl p-4 sm:p-6 lg:p-8"
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
      </div>

      <!-- FAQ Section -->
      <UPageSection
        :title="t('flights.faq.title')"
        :description="t('flights.faq.description')"
      >
        <div class="w-full lg:w-3xl mx-auto px-4 sm:px-6">
          <UAccordion
            :items="faqs"
          />
        </div>
      </UPageSection>

      <!-- CTA Section -->
      <UPageSection
        class="bg-linear-to-br from-primary-600 to-primary-700 text-white rounded-2xl p-6 sm:p-8"
      >
        <div class="max-w-2xl mx-auto text-center px-4 sm:px-6">
          <h2 class="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
            {{ t('flights.cta.title') }}
          </h2>
          <p class="mb-4 sm:mb-6 text-sm sm:text-base text-primary-100">
            {{ t('flights.cta.description') }}
          </p>
          <UButton
            :to="localePath('/makina/aeroporti-prishtines')"
            size="lg"
            color="neutral"
            variant="solid"
            trailing-icon="i-lucide-arrow-right"
            class="bg-white text-primary-700 hover:bg-primary-50 w-full sm:w-auto"
          >
            {{ t('flights.cta.rentCar') }}
          </UButton>
        </div>
      </UPageSection>
    </UContainer>
  </div>
</template>
