<script setup lang="ts">
import { computed, ref } from 'vue'
import { DateFormatter, getLocalTimeZone, today, type CalendarDate, type DateValue } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const route = useRoute()

const props = withDefaults(
  defineProps<{
    /** Kur true, nuk renderon kartën e jashtme (për integrim në kartë të faqes kryesore) */
    embedded?: boolean
  }>(),
  { embedded: false }
)

const emit = defineEmits<{
  search: []
}>()

const { searchState, isSearching, searchError, swapAirports } = useFlightSearch()

const df = computed(() => new DateFormatter(locale.value, {
  dateStyle: 'medium'
}))

const departureDateOpen = ref(false)
const returnDateOpen = ref(false)
const passengersOpen = ref(false)

const minDate = computed(() => today(getLocalTimeZone()))

const tripTypes = computed(() => [
  { label: t('flights.search.roundtrip'), value: 'roundtrip' },
  { label: t('flights.search.oneway'), value: 'oneway' }
])

const totalPassengers = computed(() => {
  const p = searchState.value.passengers
  return p.adults + p.children + p.infants
})

const passengerLabel = computed(() => {
  const p = searchState.value.passengers
  const parts: string[] = []
  if (p.adults > 0) parts.push(`${p.adults} ${t('flights.search.adults').slice(0, 3)}.`)
  if (p.children > 0) parts.push(`${p.children} ${t('flights.search.children').slice(0, 4)}.`)
  if (p.infants > 0) parts.push(`${p.infants} ${t('flights.search.infants').slice(0, 4)}`)
  return parts.join(', ') || `1 ${t('flights.search.adults').slice(0, 3)}.`
})

function incrementPassenger(type: 'adults' | 'children' | 'infants') {
  if (totalPassengers.value >= 9) return
  if (type === 'infants' && searchState.value.passengers.infants >= searchState.value.passengers.adults) return
  searchState.value.passengers[type]++
}

function decrementPassenger(type: 'adults' | 'children' | 'infants') {
  if (type === 'adults' && searchState.value.passengers.adults <= 1) return
  if (searchState.value.passengers[type] <= 0) return
  searchState.value.passengers[type]--
  if (searchState.value.passengers.infants > searchState.value.passengers.adults) {
    searchState.value.passengers.infants = searchState.value.passengers.adults
  }
}

function formatDate(date: CalendarDate | null): string {
  if (!date) return t('flights.search.selectDate')
  return df.value.format(date.toDate(getLocalTimeZone()))
}

function onDepartureDateSelect(date: DateValue | DateRange | DateValue[] | null | undefined) {
  if (!date || Array.isArray(date) || 'start' in date) return
  const calendarDate = date as CalendarDate
  searchState.value.departureDate = calendarDate
  departureDateOpen.value = false

  if (!searchState.value.returnDate || searchState.value.returnDate.compare(calendarDate) < 0) {
    searchState.value.returnDate = calendarDate.add({ weeks: 1 })
  }
}

function onReturnDateSelect(date: DateValue | DateRange | DateValue[] | null | undefined) {
  if (!date || Array.isArray(date) || 'start' in date) return
  searchState.value.returnDate = date as CalendarDate
  returnDateOpen.value = false
}

const canSubmit = computed(() => {
  const s = searchState.value
  if (!s.origin || !s.destination || !s.departureDate) return false
  if (s.tripType === 'roundtrip' && !s.returnDate) return false
  return true
})

function onTripTypeChange(value: string | number) {
  if (value === 'roundtrip' || value === 'oneway') {
    searchState.value.tripType = value
  }
}

async function onSubmit() {
  if (!canSubmit.value) return

  emit('search')
}
</script>

<template>
  <div
    :class="[
      'w-full',
      props.embedded ? '' : 'bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 md:p-8 transition-all duration-300 hover:shadow-3xl'
    ]"
  >
    <form
      class="flight-search-form space-y-4"
      @submit.prevent="onSubmit"
    >
      <div class="flex justify-end">
        <ClientOnly>
          <UTabs
            :items="tripTypes"
            :model-value="searchState.tripType"
            class="w-fit"
            @update:model-value="onTripTypeChange"
          />
          <template #fallback>
            <div class="flex gap-2 w-fit">
              <USkeleton class="h-8 w-24 rounded-md" />
              <USkeleton class="h-8 w-20 rounded-md" />
            </div>
          </template>
        </ClientOnly>
      </div>

      <div
        class="form-controls-taller flex flex-col items-stretch sm:items-center md:gap-3 sm:flex-row"
      >
        <div class="w-full sm:flex-1 space-y-2">
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('flights.search.from') }}
          </label>
          <ClientOnly>
            <AirportSelect
              v-model="searchState.origin"
              :placeholder="$t('flights.search.from')"
              icon="i-lucide-plane-takeoff"
            />
            <template #fallback>
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <UButton
          variant="ghost"
          color="neutral"
          size="md"
          class="exclude-from-taller mt-2 p-0 shrink-0 h-10 w-10 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 disabled:opacity-40 pl-2 self-center sm:hidden"
          :aria-label="$t('flights.search.swapAirports')"
          :disabled="!searchState.origin && !searchState.destination"
          @click="swapAirports"
        >
          <UIcon
            name="i-lucide-arrow-down-up"
            class="size-6"
          />
        </UButton>
        <UButton
          icon="i-lucide-arrow-left-right"
          variant="ghost"
          color="neutral"
          size="md"
          class="exclude-from-taller mt-6 shrink-0 h-10 w-10 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 disabled:opacity-40 pl-2 self-center hidden sm:flex"
          :aria-label="$t('flights.search.swapAirports')"
          :disabled="!searchState.origin && !searchState.destination"
          @click="swapAirports"
        />

        <div class="w-full sm:flex-1 space-y-2">
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('flights.search.to') }}
          </label>
          <ClientOnly>
            <AirportSelect
              v-model="searchState.destination"
              :placeholder="$t('flights.search.to')"
              icon="i-lucide-plane-landing"
            />
            <template #fallback>
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <div class="form-controls-taller flex flex-col gap-4 sm:flex-row sm:items-end">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('flights.search.departureDate') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="departureDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                class="w-full justify-start"
                icon="i-lucide-calendar"
                size="lg"
              >
                <span
                  :class="searchState.departureDate ? 'text-default' : `text-muted`"
                >
                  {{ formatDate(searchState.departureDate) }}
                </span>
              </UButton>
              <template #content>
                <UCalendar
                  :model-value="searchState.departureDate"
                  :min-value="minDate"
                  @update:model-value="onDepartureDateSelect"
                />
              </template>
            </UPopover>
            <template #fallback>
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>
        <div
          v-if="searchState.tripType === 'roundtrip'"
          class="space-y-2"
        >
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('flights.search.returnDate') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="returnDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                class="w-full justify-start"
                icon="i-lucide-calendar"
                size="lg"
              >
                <span :class="searchState.returnDate ? 'text-default' : 'text-muted'">
                  {{ formatDate(searchState.returnDate) }}
                </span>
              </UButton>
              <template #content>
                <UCalendar
                  :model-value="searchState.returnDate"
                  :min-value="searchState.departureDate || minDate"
                  @update:model-value="onReturnDateSelect"
                />
              </template>
            </UPopover>
            <template #fallback>
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('flights.search.passengers') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="passengersOpen">
              <UButton
                color="neutral"
                variant="outline"
                class="w-full justify-start"
                icon="i-lucide-users"
                size="lg"
              >
                <span class="truncate">{{ passengerLabel }}</span>
              </UButton>
              <template #content>
                <div class="w-64 space-y-4 p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium">
                        {{ $t('flights.search.adults') }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ $t('flights.search.adultsAge') }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <UButton
                        icon="i-lucide-minus"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        :disabled="searchState.passengers.adults <= 1"
                        @click="decrementPassenger('adults')"
                      />
                      <span class="w-6 text-center font-medium">{{ searchState.passengers.adults }}</span>
                      <UButton
                        icon="i-lucide-plus"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        :disabled="totalPassengers >= 9"
                        @click="incrementPassenger('adults')"
                      />
                    </div>
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium">
                        {{ $t('flights.search.children') }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ $t('flights.search.childrenAge') }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <UButton
                        icon="i-lucide-minus"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        :disabled="searchState.passengers.children <= 0"
                        @click="decrementPassenger('children')"
                      />
                      <span class="w-6 text-center font-medium">{{ searchState.passengers.children }}</span>
                      <UButton
                        icon="i-lucide-plus"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        :disabled="totalPassengers >= 9"
                        @click="incrementPassenger('children')"
                      />
                    </div>
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium">
                        {{ $t('flights.search.infants') }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ $t('flights.search.infantsAge') }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <UButton
                        icon="i-lucide-minus"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        :disabled="searchState.passengers.infants <= 0"
                        @click="decrementPassenger('infants')"
                      />
                      <span class="w-6 text-center font-medium">{{ searchState.passengers.infants }}</span>
                      <UButton
                        icon="i-lucide-plus"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        :disabled="totalPassengers >= 9 || searchState.passengers.infants >= searchState.passengers.adults"
                        @click="incrementPassenger('infants')"
                      />
                    </div>
                  </div>

                  <p class="text-xs text-muted">
                    {{ $t('flights.search.maxPassengers') }}
                  </p>
                </div>
              </template>
            </UPopover>
            <template #fallback>
              <USkeleton class="h-10 w-32 rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <ClientOnly>
          <div
            id="flexible-dates-checkbox"
            class="exclude-from-taller flex items-center gap-1 self-left"
          >
            <UCheckbox
              v-model="searchState.flexibleDates"
              :label="$t('flights.search.flexibleLabel')"
            />
            <UTooltip :text="$t('flights.search.flexibleHint')">
              <UIcon
                name="i-lucide-info"
                class="size-4 text-muted"
              />
            </UTooltip>
          </div>
          <template #fallback>
            <div class="flex items-center gap-1">
              <USkeleton class="size-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
          </template>
        </ClientOnly>

        <div class="sm:ml-auto">
          <ClientOnly>
            <UButton
              type="submit"
              :loading="isSearching"
              :disabled="!canSubmit || !searchState.origin || !searchState.destination || !searchState.departureDate"
              icon="i-lucide-search"
              class="whitespace-nowrap h-11 w-full md:w-auto"
            >
              {{ $t('flights.search.searchFlights') }}
            </UButton>
            <template #fallback>
              <USkeleton class="h-10 w-32 rounded-md" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <UAlert
        v-if="searchError"
        color="error"
        icon="i-lucide-alert-circle"
        :title="searchError"
        :close-button="{ icon: 'i-lucide-x', color: 'error', variant: 'link' }"
        @close="searchError = null"
      />
    </form>

    <div class="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
      <div
        v-for="badge in [
          { icon: 'i-lucide-badge-check', key: 'noFees' },
          { icon: 'i-lucide-shield-check', key: 'directBooking' },
          { icon: 'i-lucide-lock', key: 'secureData' }
        ]"
        :key="badge.key"
        class="flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/20 bg-primary/5 px-2 py-1.5 sm:px-4 sm:py-2"
      >
        <UIcon
          :name="badge.icon"
          class="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0"
        />
        <span class="text-xs sm:text-sm font-medium whitespace-nowrap">{{ t(`trustBadges.${badge.key}`) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* E njëjta lartësi si te makina: 45px për from/to (UInputMenu), datat, pasagjerët. Tabs, swap dhe checkbox përjashtuar. */
.flight-search-form .form-controls-taller :deep(button[type="button"]:not(.exclude-from-taller)) {
  height: 45px !important;
  min-height: 45px !important;
  box-sizing: border-box;
}
.flight-search-form .form-controls-taller :deep(input:not([type="checkbox"]):not([type="hidden"])) {
  height: 45px !important;
  min-height: 45px !important;
  box-sizing: border-box;
}
/* Checkbox "Data fleksibël": lartësi normale, jo 45px (ID për specifikë më të lartë) */
#flexible-dates-checkbox :deep(label) {
  height: auto !important;
  min-height: 0 !important;
}
#flexible-dates-checkbox :deep(button),
#flexible-dates-checkbox :deep(input[type="checkbox"]) {
  height: 1rem !important;
  min-height: 1rem !important;
}
</style>
