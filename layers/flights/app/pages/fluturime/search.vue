<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const { searchState, results, flexibleResults, search, searchFlexible, isSearching, isSearchingFlexible, clearResults } = useFlightSearch()

// WhatsApp link with pre-filled message based on current search
const whatsappLink = computed(() => {
  const number = config.public.whatsappNumber?.replace(/[^0-9]/g, '') || ''
  const origin = searchState.value.origin?.code || ''
  const destination = searchState.value.destination?.code || ''
  const message = origin && destination ? `${origin} ${destination}` : ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
})

const { getAirportByCode, fetchAirports, airports } = useAirports()
const router = useRouter()
const route = useRoute()
const autoSearchAttempted = ref(false)
const isApplyingQuery = ref(false)
const queryError = ref<string | null>(null)
const searchFormOpen = ref<string | undefined>(undefined)
const whatsappBannerDismissed = ref(false)

const hasQueryParams = computed(() => Object.keys(route.query).length > 0)
const forceFreshQuery = computed(() => {
  const value = route.query.forceFresh
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true'
  }
  return false
})

const hasSearchCriteria = computed(() => {
  return !!(searchState.value.origin && searchState.value.destination && searchState.value.departureDate)
})

watchEffect(() => {
  if (!results.value && !isSearching.value && !hasSearchCriteria.value && !hasQueryParams.value) {
    router.push(localePath('/'))
    return
  }

  if (!results.value && !isSearching.value && hasSearchCriteria.value && !autoSearchAttempted.value) {
    autoSearchAttempted.value = true
    const searches = [search({ forceFresh: forceFreshQuery.value })]
    if (searchState.value.flexibleDates) {
      searches.push(searchFlexible())
    }
    Promise.all(searches)
  }
})

// Watch for flexibleDates toggle - trigger flexible search when enabled with existing results
watch(
  () => searchState.value.flexibleDates,
  (enabled) => {
    if (enabled && results.value && !flexibleResults.value && !isSearchingFlexible.value) {
      searchFlexible()
    }
  }
)

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
  const date = typeof route.query.date === 'string' ? route.query.date : null
  const returnDate = typeof route.query.returnDate === 'string' ? route.query.returnDate : null

  // Ensure airports are loaded before resolving
  if (airports.value.length === 0) {
    await fetchAirports()
  }

  if (!from || !to) {
    // If only airports are provided (no date), just open the search form
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
    // Airports provided but no date - open search form
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
    queryError.value = t('flights.errors.invalidDate')
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
  const flexibleParam = route.query.flexibleDates
  if (typeof flexibleParam === 'string') {
    searchState.value.flexibleDates = flexibleParam === 'true' || flexibleParam === '1'
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

// Handle new search
async function onSearch() {
  // Run both searches in parallel if flexible dates is enabled
  const searches = [search({ forceFresh: forceFreshQuery.value })]

  if (searchState.value.flexibleDates) {
    searches.push(searchFlexible())
  }

  await Promise.all(searches)
}

// Date formatter (reactive to locale)
const shortDateFormatter = computed(() => new Intl.DateTimeFormat(locale.value, {
  day: '2-digit',
  month: 'short'
}))

const passengerSummary = computed(() => {
  if (!results.value) return ''

  const { adults, children, infants } = results.value.meta.passengers

  // If all 0 → show nothing
  if (adults === 0 && children === 0 && infants === 0) {
    return ''
  }

  const parts: string[] = []

  if (adults > 0) {
    parts.push(`${adults} ${t('flights.search.adults')}`)
  }

  if (children > 0) {
    parts.push(`${children} ${t('flights.search.children')}`)
  }

  if (infants > 0) {
    parts.push(`${infants} ${t('flights.search.infants')}`)
  }

  return parts.join(', ')
})

// SEO
useSeoMeta({
  title: () => results.value
    ? `${t('flights.title')} ${results.value.meta.origin} → ${results.value.meta.destination} | Krahaso.co`
    : `${t('flights.title')} | Krahaso.co`,
  description: () => results.value
    ? `${results.value.meta.totalResults} ${t('flights.title')} ${t('common.from')} ${results.value.meta.origin} ${t('common.to')} ${results.value.meta.destination}`
    : t('flights.seo.description')
})
</script>

<template>
  <div class="py-8">
    <UContainer>
      <!-- Breadcrumb -->
      <UBreadcrumb
        :items="[
          { label: $t('nav.home'), to: localePath('/') },
          { label: $t('flights.title') }
        ]"
        class="mb-6"
      />

      <!-- Error Alert -->
      <UAlert
        v-if="queryError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('flights.errors.title')"
        :description="queryError"
        class="mb-6"
        close
        @update:open="queryError = null"
      />

      <!-- WhatsApp Promotion Banner (shows after results loaded) -->
      <div
        v-if="results && !whatsappBannerDismissed"
        class="
          relative mb-6 rounded-xl bg-linear-to-r from-green-50 to-green-100 p-4
          sm:p-5
          dark:from-green-900/20 dark:to-green-800/20
        "
      >
        <!-- Close Button -->
        <button
          type="button"
          class="
            absolute top-2 right-2 rounded-full p-1.5 transition-colors
            hover:bg-green-200/50
            dark:hover:bg-green-800/50
          "
          @click="whatsappBannerDismissed = true"
        >
          <UIcon
            name="i-lucide-x"
            class="
              h-4 w-4 text-green-700
              dark:text-green-300
            "
          />
        </button>

        <div
          class="
            flex flex-col items-center gap-4 pr-6
            sm:flex-row
          "
        >
          <div
            class="
              flex h-10 w-10 shrink-0 items-center justify-center rounded-full
              bg-green-500
            "
          >
            <UIcon
              name="i-simple-icons-whatsapp"
              class="h-6 w-6 text-white"
            />
          </div>
          <div
            class="
              flex-1 text-center
              sm:text-left
            "
          >
            <div
              class="
                mb-0.5 flex items-center justify-center gap-2
                sm:justify-start
              "
            >
              <span
                class="
                  text-sm font-medium text-gray-900
                  dark:text-white
                "
              >{{ $t('landing.whatsapp.title') }}</span>
            </div>
            <p
              class="
                hidden text-xs text-gray-600
                sm:block
                dark:text-gray-300
              "
            >
              {{ $t('landing.whatsapp.description') }}
            </p>
          </div>
          <a
            :href="whatsappLink"
            target="_blank"
            rel="noopener noreferrer"
            class="
              inline-flex shrink-0 items-center gap-2 rounded-full bg-green-500
              px-4 py-2 text-sm font-medium text-white transition-colors
              hover:bg-green-600
            "
          >
            <UIcon
              name="i-simple-icons-whatsapp"
              class="h-5 w-5"
            />
            {{ $t('landing.whatsapp.cta') }}
          </a>
        </div>
      </div>

      <!-- Search Form (collapsible) -->
      <UCard class="mb-8">
        <UAccordion
          v-model="searchFormOpen"
          :items="[{
            label: $t('flights.search.title'),
            icon: 'i-lucide-search',
            content: ''
          }]"
        >
          <template #content>
            <FlightSearchForm
              class="pt-4"
              embedded
              @search="onSearch"
            />
          </template>
        </UAccordion>

        <!-- Quick Search Summary -->
        <div
          v-if="results"
          class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
        >
          <!-- Outbound -->
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-primary">{{ results.meta.origin }}</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="text-muted"
            />
            <span class="font-mono font-bold text-primary">{{ results.meta.destination }}</span>
          </div>
          <span class="text-muted">
            {{ shortDateFormatter.format(new Date(results.meta.departureDate)) }}
          </span>

          <!-- Return (if roundtrip) -->
          <template v-if="results.meta.returnDate">
            <USeparator
              orientation="vertical"
              class="
                hidden h-4
                sm:block
              "
            />
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-primary">{{ results.meta.destination }}</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="text-muted"
              />
              <span class="font-mono font-bold text-primary">{{ results.meta.origin }}</span>
            </div>
            <span class="text-muted">
              {{ shortDateFormatter.format(new Date(results.meta.returnDate)) }}
            </span>
          </template>

          <USeparator
            orientation="vertical"
            class="
              hidden h-4
              sm:block
            "
          />
          <span
            v-if="passengerSummary"
            class="text-muted"
          >
            {{ passengerSummary }}
          </span>
        </div>
      </UCard>

      <!-- Results -->
      <FlightResults />
    </UContainer>
  </div>
</template>
