<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { CalendarDate } from '@internationalized/date'
import type { Flight } from '~/types/flight'

const { t, locale } = useI18n()

const {
  searchState,
  results,
  flexibleResults,
  filteredResults,
  filteredOutboundFlights,
  filteredReturnFlights,
  isRoundTrip,
  isSearching,
  isSearchingFlexible,
  sortBy,
  sortOrder,
  availableCarriers,
  availableFlightNumbers,
  availableProviders,
  priceRange,
  filters,
  resetFilters,
  search,
  searchFlexible,
  clearResults
} = useFlightSearch()

const selectedFlight = ref<Flight | null>(null)
const mobileFiltersOpen = ref(false)

// Date change confirmation modal
const dateChangeModalOpen = ref(false)
const pendingDateChange = ref<{ date: string, legType: 'outbound' | 'return' } | null>(null)

const hasSearchCriteria = computed(() => {
  return !!(searchState.value.origin && searchState.value.destination && searchState.value.departureDate)
})

// Format CalendarDate to YYYY-MM-DD string
function formatCalendarDate(date: { year: number, month: number, day: number } | null): string | undefined {
  if (!date) return undefined
  const year = date.year
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Selected dates for flexible matrix (formatted as YYYY-MM-DD)
const selectedDepartureDate = computed(() => formatCalendarDate(searchState.value.departureDate))
const selectedReturnDate = computed(() => formatCalendarDate(searchState.value.returnDate))

// Format date for display in modal
const pendingDateFormatted = computed(() => {
  if (!pendingDateChange.value) return ''
  const date = new Date(pendingDateChange.value.date)
  return date.toLocaleDateString(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
})

// Handle date selection from flexible matrix
function onFlexibleDateSelect(date: string, legType: 'outbound' | 'return') {
  // Don't show confirmation if clicking the already selected date
  const currentDate = legType === 'outbound' ? selectedDepartureDate.value : selectedReturnDate.value
  if (date === currentDate) return

  pendingDateChange.value = { date, legType }
  dateChangeModalOpen.value = true
}

// Confirm date change and trigger new search
async function confirmDateChange() {
  if (!pendingDateChange.value) return

  const { date, legType } = pendingDateChange.value
  const parts = date.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const newDate = new CalendarDate(year, month, day)

  // Update the appropriate date in search state
  if (legType === 'outbound') {
    searchState.value.departureDate = newDate
  } else {
    searchState.value.returnDate = newDate
  }

  // Close modal
  dateChangeModalOpen.value = false
  pendingDateChange.value = null

  // Clear results and trigger new searches
  clearResults()

  // Run both searches in parallel
  await Promise.all([
    search({ forceFresh: false }),
    searchFlexible()
  ])
}

// Cancel date change
function cancelDateChange() {
  dateChangeModalOpen.value = false
  pendingDateChange.value = null
}

// Reusable template for filter content
const [DefineFilterContent, ReuseFilterContent] = createReusableTemplate()

const defaultProviderIds = ['airprishtina', 'kosovafly', 'dituria', 'erifly', 'airtiketa', 'prishtinaticket', 'flyksa'] as const
const providerNameById: Record<string, string> = {
  airprishtina: 'AirPrishtina',
  kosovafly: 'KosovaFly',
  dituria: 'Dituria',
  erifly: 'EriFly',
  airtiketa: 'AirTiketa',
  prishtinaticket: 'Prishtina Ticket',
  flyksa: 'FlyKSA'
}

const loadingProviders = computed(() => {
  const ids = results.value?.meta?.providers?.length
    ? results.value.meta.providers
    : [...defaultProviderIds]
  return ids.map(id => ({
    id,
    name: providerNameById[id] || id
  }))
})

// Sort options (reactive to locale)
const sortOptions = computed(() => [
  { label: t('sort.cheapest'), value: 'price' },
  { label: t('sort.shortest'), value: 'duration' },
  { label: t('sort.earliest'), value: 'departure' }
])

// Date formatter (reactive to locale)
const dateFormatter = computed(() => new Intl.DateTimeFormat(locale.value, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}))

const shortDateFormatter = computed(() => new Intl.DateTimeFormat(locale.value, {
  day: '2-digit',
  month: 'short'
}))

// Check if any filter is active
const hasActiveFilters = computed(() => {
  return filters.value.maxPrice || filters.value.carriers.length > 0 || filters.value.providers.length > 0 || filters.value.flightNumbers.length > 0 || filters.value.hideSoldOut
})

// Departure time range mapping
const departureTimeRanges: Record<string, [number, number] | null> = {
  any: null,
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 24]
}

const departureTimeRangeValue = computed(() => {
  if (!filters.value.departureTimeRange) return 'any'
  const [min, max] = filters.value.departureTimeRange
  if (min === 6 && max === 12) return 'morning'
  if (min === 12 && max === 18) return 'afternoon'
  if (min === 18 && max === 24) return 'evening'
  return 'any'
})

function onDepartureTimeChange(value: string) {
  filters.value.departureTimeRange = departureTimeRanges[value] ?? null
}

const maxStopsValue = computed(() => {
  if (filters.value.maxStops === null) return 'any'
  return String(filters.value.maxStops)
})

function onMaxStopsChange(value: string) {
  filters.value.maxStops = value === 'any' ? null : parseInt(value, 10)
}

// Handle flight selection
function onSelectFlight(flight: Flight) {
  selectedFlight.value = selectedFlight.value?.id === flight.id ? null : flight
}

// Handle booking
function onBookFlight(flight: Flight) {
  // Tracking could go here
  console.log('Booking flight:', flight.id)
}
</script>

<template>
  <!-- Define reusable filter content -->
  <DefineFilterContent>
    <div class="space-y-6">
      <!-- Price Filter -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('filter.maxPrice', { price: filters.maxPrice || priceRange.max }) }}
        </label>
        <USlider
          :model-value="filters.maxPrice ?? priceRange.max"
          :min="priceRange.min"
          :max="priceRange.max"
          :step="10"
          @update:model-value="(val: number | number[] | undefined) => filters.maxPrice = typeof val === 'number' ? val : null"
        />
      </div>

      <!-- Sold Out Filter -->
      <div>
        <UCheckbox
          v-model="filters.hideSoldOut"
          :label="$t('filter.hideSoldOut')"
        />
      </div>

      <!-- Provider Filter -->
      <div v-if="availableProviders.length > 1">
        <label class="mb-2 block text-sm font-medium">{{ $t('filter.providers') }}</label>
        <div class="space-y-2">
          <UCheckbox
            v-for="provider in availableProviders"
            :key="provider.id"
            :model-value="filters.providers.includes(provider.id)"
            :label="provider.name"
            @update:model-value="(checked: boolean | 'indeterminate') => {
              if (checked === true) {
                filters.providers.push(provider.id)
              }
              else {
                filters.providers = filters.providers.filter((p: string) => p !== provider.id)
              }
            }"
          />
        </div>
      </div>

      <!-- Carrier Filter -->
      <div v-if="availableCarriers.length > 1">
        <label class="mb-2 block text-sm font-medium">{{ $t('filter.airlines') }}</label>
        <div class="space-y-2">
          <UCheckbox
            v-for="carrier in availableCarriers"
            :key="carrier"
            :model-value="filters.carriers.includes(carrier)"
            :label="carrier"
            @update:model-value="(checked: boolean | 'indeterminate') => {
              if (checked === true) {
                filters.carriers.push(carrier)
              }
              else {
                filters.carriers = filters.carriers.filter((c: string) => c !== carrier)
              }
            }"
          />
        </div>
      </div>

      <!-- Flight Number Filter -->
      <div v-if="availableFlightNumbers.length > 1">
        <label class="mb-2 block text-sm font-medium">{{ $t('filter.flightNumber') }}</label>
        <div class="max-h-48 space-y-2 overflow-y-auto">
          <UCheckbox
            v-for="flightNumber in availableFlightNumbers"
            :key="flightNumber"
            :model-value="filters.flightNumbers.includes(flightNumber)"
            :label="flightNumber"
            @update:model-value="(checked: boolean | 'indeterminate') => {
              if (checked === true) {
                filters.flightNumbers.push(flightNumber)
              }
              else {
                filters.flightNumbers = filters.flightNumbers.filter((fn: string) => fn !== flightNumber)
              }
            }"
          />
        </div>
      </div>

      <!-- Departure Time Filter -->
      <div>
        <label class="mb-2 block text-sm font-medium">{{ $t('filter.departureTime') }}</label>
        <URadioGroup
          :model-value="departureTimeRangeValue"
          :items="[
            { label: $t('filter.anytime'), value: 'any' },
            { label: $t('filter.morning'), value: 'morning' },
            { label: $t('filter.afternoon'), value: 'afternoon' },
            { label: $t('filter.evening'), value: 'evening' }
          ]"
          @update:model-value="onDepartureTimeChange"
        />
      </div>

      <!-- Stops Filter -->
      <div>
        <label class="mb-2 block text-sm font-medium">{{ $t('filter.stops') }}</label>
        <URadioGroup
          :model-value="maxStopsValue"
          :items="[
            { label: $t('filter.allStops'), value: 'any' },
            { label: $t('filter.directOnly'), value: '0' },
            { label: $t('filter.maxOneStop'), value: '1' }
          ]"
          @update:model-value="onMaxStopsChange"
        />
      </div>
    </div>
  </DefineFilterContent>

  <div
    v-if="isSearching || (!results && hasSearchCriteria)"
    class="space-y-6"
  >
    <div class="flex flex-col gap-2 text-sm text-muted">
      <div class="flex items-center gap-3">
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-primary"
        />
        <span>{{ $t('loading.searching') }}</span>
      </div>
      <div class="text-xs text-muted">
        {{ $t('loading.providers', { n: loadingProviders.length }) }}
      </div>
    </div>

    <UCard>
      <div
        class="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <div
          v-for="provider in loadingProviders"
          :key="provider.id"
          class="
            flex items-center justify-between rounded-lg border border-default
            bg-default px-3 py-2 text-sm
          "
        >
          <span class="text-default">{{ provider.name }}</span>
          <span class="flex items-center gap-2 text-xs text-muted">
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin text-primary"
              :aria-label="$t('loading.searching')"
            />
          </span>
        </div>
      </div>
    </UCard>

    <!-- Flexible Date Matrix (shown during loading if enabled) -->
    <div
      v-if="searchState.flexibleDates"
      class="space-y-6"
    >
      <!-- Loading skeleton for flexible search -->
      <div
        v-if="isSearchingFlexible && !flexibleResults"
        class="space-y-4"
      >
        <h3 class="flex items-center gap-2 text-sm font-medium">
          <UIcon
            name="i-lucide-plane-takeoff"
            class="h-4 w-4"
          />
          {{ $t('flexible.outbound') }}
          <UIcon
            name="i-lucide-loader-2"
            class="h-3 w-3 animate-spin text-muted"
          />
        </h3>
        <div class="grid grid-cols-7 gap-2">
          <USkeleton
            v-for="i in 7"
            :key="i"
            class="h-24 rounded-lg"
          />
        </div>
      </div>

      <!-- Actual flexible results -->
      <FlightFlexibleDateMatrix
        v-if="flexibleResults"
        :dates="flexibleResults.outbound"
        :cheapest-date="flexibleResults.cheapestOutboundDate"
        :selected-date="selectedDepartureDate"
        leg-type="outbound"
        :is-loading="isSearchingFlexible"
        @select="(date: string) => onFlexibleDateSelect(date, 'outbound')"
      />

      <FlightFlexibleDateMatrix
        v-if="flexibleResults?.return && flexibleResults.return.length > 0"
        :dates="flexibleResults.return"
        :cheapest-date="flexibleResults.cheapestReturnDate ?? null"
        :selected-date="selectedReturnDate"
        leg-type="return"
        :is-loading="isSearchingFlexible"
        @select="(date: string) => onFlexibleDateSelect(date, 'return')"
      />
    </div>

    <div
      class="
        flex flex-col gap-6
        lg:flex-row
      "
    >
      <aside
        class="
          hidden shrink-0
          lg:block lg:w-64
        "
      >
        <UCard>
          <div class="space-y-4">
            <USkeleton class="h-5 w-24" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-5/6" />
            <USkeleton class="h-4 w-3/4" />
          </div>
        </UCard>
      </aside>

      <div class="flex-1 space-y-4">
        <UCard
          v-for="i in 3"
          :key="i"
        >
          <div class="space-y-3">
            <USkeleton class="h-5 w-40" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-5/6" />
            <USkeleton class="h-4 w-2/3" />
          </div>
        </UCard>
      </div>
    </div>
  </div>

  <div v-else-if="results || (searchState.flexibleDates && (flexibleResults || isSearchingFlexible))">
    <!-- Results Header (only when results available) -->
    <div
      v-if="results"
      class="
        mb-6 flex flex-col gap-4
        md:flex-row md:items-center md:justify-between
      "
    >
      <div>
        <h2 class="text-xl font-bold">
          {{ $t('results.title', results.meta.totalResults) }}
        </h2>
        <p class="text-sm text-muted">
          {{ results.meta.origin }} → {{ results.meta.destination }}
          {{ $t('results.onDate', { date: dateFormatter.format(new Date(results.meta.departureDate)) }) }}
          <template v-if="results.meta.returnDate">
            · {{ results.meta.destination }} → {{ results.meta.origin }}
            {{ $t('results.onDate', { date: dateFormatter.format(new Date(results.meta.returnDate)) }) }}
          </template>
        </p>
      </div>

      <!-- Sort (Desktop only - in header) -->
      <div
        class="
          hidden items-center gap-2
          lg:flex
        "
      >
        <span class="text-sm text-muted">{{ $t('sort.label') }}</span>
        <USelect
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          class="min-w-40"
        />
        <UButton
          :icon="sortOrder === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
          variant="ghost"
          size="sm"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
        />
      </div>
    </div>

    <!-- Sort + Filter Bar (Mobile only - fixed) -->
    <div
      class="
        fixed top-[var(--ui-header-height)] right-0 left-0 z-20 border-b
        border-default bg-default px-4 py-3
        lg:hidden
      "
    >
      <div class="flex items-center gap-2">
        <!-- Sort (left) -->
        <USelect
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          class="min-w-0 flex-1"
        />
        <UButton
          :icon="sortOrder === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
          variant="outline"
          color="neutral"
          size="sm"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
        />

        <!-- Mobile Filter Button (right) -->
        <UDrawer
          v-model:open="mobileFiltersOpen"
          direction="right"
          :title="$t('filter.title')"
        >
          <UButton
            icon="i-lucide-sliders-horizontal"
            variant="outline"
            color="neutral"
            class="min-w-30"
          >
            {{ $t('filter.title') }}
            <UBadge
              v-if="hasActiveFilters"
              color="primary"
              size="xs"
              class="ml-1"
            >
              !
            </UBadge>
          </UButton>

          <template #body>
            <ReuseFilterContent />
          </template>

          <template #footer>
            <UButton
              v-if="hasActiveFilters"
              variant="outline"
              color="neutral"
              block
              @click="resetFilters"
            >
              {{ $t('filter.reset') }}
            </UButton>
            <UButton
              color="primary"
              block
              @click="mobileFiltersOpen = false"
            >
              {{ $t('common.showResults') }}
            </UButton>
          </template>
        </UDrawer>
      </div>
    </div>

    <div
      class="
        flex flex-col gap-6
        lg:flex-row
      "
    >
      <!-- Filters Sidebar (Desktop only) -->
      <aside
        class="
          hidden shrink-0
          lg:block lg:w-64
        "
      >
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">
                {{ $t('filter.title') }}
              </h3>
              <UButton
                v-if="hasActiveFilters"
                variant="link"
                size="xs"
                @click="resetFilters"
              >
                {{ $t('filter.reset') }}
              </UButton>
            </div>
          </template>

          <ReuseFilterContent />
        </UCard>
      </aside>

      <!-- Results List -->
      <div class="flex-1 space-y-6">
        <!-- Flexible Date Matrix (shown when flexibleDates is enabled) -->
        <div
          v-if="searchState.flexibleDates && (flexibleResults || isSearchingFlexible)"
          class="space-y-6"
        >
          <!-- Loading State for Flexible Search -->
          <div
            v-if="isSearchingFlexible && !flexibleResults"
            class="space-y-4"
          >
            <div class="flex items-center gap-2 text-sm text-muted">
              <UIcon
                name="i-lucide-loader-2"
                class="h-4 w-4 animate-spin"
              />
              {{ $t('loading.searching') }}...
            </div>
            <div class="grid grid-cols-7 gap-2">
              <USkeleton
                v-for="i in 7"
                :key="i"
                class="h-24 rounded-lg"
              />
            </div>
          </div>

          <!-- Outbound Date Matrix -->
          <FlightFlexibleDateMatrix
            v-if="flexibleResults"
            :dates="flexibleResults.outbound"
            :cheapest-date="flexibleResults.cheapestOutboundDate"
            :selected-date="selectedDepartureDate"
            leg-type="outbound"
            :is-loading="isSearchingFlexible"
            @select="(date: string) => onFlexibleDateSelect(date, 'outbound')"
          />

          <!-- Return Date Matrix (only for roundtrip) -->
          <FlightFlexibleDateMatrix
            v-if="flexibleResults?.return && flexibleResults.return.length > 0"
            :dates="flexibleResults.return"
            :cheapest-date="flexibleResults.cheapestReturnDate ?? null"
            :selected-date="selectedReturnDate"
            leg-type="return"
            :is-loading="isSearchingFlexible"
            @select="(date: string) => onFlexibleDateSelect(date, 'return')"
          />

          <USeparator v-if="flexibleResults" />
        </div>

        <!-- Outbound Flights -->
        <div v-if="results">
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UIcon
              name="i-lucide-plane-takeoff"
              class="text-primary"
            />
            {{ $t('results.outbound') }}
            <span class="text-sm font-normal text-muted">
              {{ results.meta.origin }} → {{ results.meta.destination }}
              · {{ shortDateFormatter.format(new Date(results.meta.departureDate)) }}
            </span>
          </h3>

          <!-- No Outbound Results -->
          <UAlert
            v-if="filteredOutboundFlights.length === 0"
            icon="i-lucide-search-x"
            color="warning"
            :title="$t('results.noOutbound')"
            :description="$t('results.tryOther')"
            class="mb-4"
          />

          <!-- Outbound Flight Cards -->
          <div class="space-y-4">
            <FlightCard
              v-for="(flight, index) in filteredOutboundFlights"
              :key="flight.id"
              :flight="flight"
              :expanded="selectedFlight?.id === flight.id"
              :position="index + 1"
              :total-results="filteredOutboundFlights.length"
              @select="onSelectFlight"
              @book="onBookFlight"
            />
          </div>
        </div>

        <!-- Return Flights (only for roundtrip) -->
        <div v-if="results && isRoundTrip">
          <USeparator class="my-6" />

          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UIcon
              name="i-lucide-plane-landing"
              class="text-primary"
            />
            {{ $t('results.return') }}
            <span class="text-sm font-normal text-muted">
              {{ results.meta.destination }} → {{ results.meta.origin }}
              · {{ shortDateFormatter.format(new Date(results.meta.returnDate!)) }}
            </span>
          </h3>

          <!-- No Return Results -->
          <UAlert
            v-if="filteredReturnFlights.length === 0"
            icon="i-lucide-search-x"
            color="warning"
            :title="$t('results.noReturn')"
            :description="$t('results.tryOther')"
            class="mb-4"
          />

          <!-- Return Flight Cards -->
          <div class="space-y-4">
            <FlightCard
              v-for="(flight, index) in filteredReturnFlights"
              :key="flight.id"
              :flight="flight"
              :expanded="selectedFlight?.id === flight.id"
              :position="index + 1"
              :total-results="filteredReturnFlights.length"
              @select="onSelectFlight"
              @book="onBookFlight"
            />
          </div>
        </div>

        <!-- Results Info -->
        <p
          v-if="results && filteredResults.length > 0"
          class="pt-4 text-center text-sm text-muted"
        >
          {{ $t('results.outboundFlights', filteredOutboundFlights.length) }}
          <template v-if="isRoundTrip">
            · {{ $t('results.returnFlights', filteredReturnFlights.length) }}
          </template>
          <template v-if="results.meta.cacheHit">
            · {{ $t('results.fromCache') }}
          </template>
        </p>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div
    v-else
    class="py-12 text-center"
  >
    <UIcon
      name="i-lucide-plane"
      class="mb-4 text-6xl text-muted"
    />
    <p class="text-lg text-muted">
      {{ $t('search.searchFlights') }}
    </p>
  </div>

  <!-- Date Change Confirmation Modal -->
  <UModal
    v-model:open="dateChangeModalOpen"
    :title="$t('flexible.confirmTitle')"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar"
              class="h-5 w-5 text-primary"
            />
            <h3 class="font-semibold">
              {{ $t('flexible.confirmTitle') }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ $t('flexible.confirmMessage', { date: pendingDateFormatted }) }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="cancelDateChange"
            >
              {{ $t('flexible.confirmNo') }}
            </UButton>
            <UButton
              color="primary"
              :loading="isSearching"
              @click="confirmDateChange"
            >
              {{ $t('flexible.confirmYes') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
