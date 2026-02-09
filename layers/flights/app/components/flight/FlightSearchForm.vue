<script setup lang="ts">
import { computed, ref } from 'vue'
import { DateFormatter, getLocalTimeZone, today, type CalendarDate, type DateValue } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

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

async function onSubmit() {
  if (!canSubmit.value) return

  emit('search')
}
</script>

<template>
  <div
    :class="[
      'w-full',
      props.embedded ? '' : 'bg-white rounded-3xl shadow-2xl border border-neutral-100 p-6 md:p-8 transition-all duration-300 hover:shadow-xl'
    ]"
  >
    <form class="space-y-6" @submit.prevent="onSubmit">
      <!-- Mobile: trip type toggle -->
      <ClientOnly>
        <div class="flex lg:hidden items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
          <button
            type="button"
            :class="[
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              searchState.tripType === 'roundtrip'
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                : 'text-neutral-500 hover:text-neutral-700',
            ]"
            @click="searchState.tripType = 'roundtrip'"
          >
            {{ t('flights.search.roundtrip') }}
          </button>
          <button
            type="button"
            :class="[
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              searchState.tripType === 'oneway'
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                : 'text-neutral-500 hover:text-neutral-700',
            ]"
            @click="searchState.tripType = 'oneway'"
          >
            {{ t('flights.search.oneway') }}
          </button>
        </div>
        <template #fallback>
          <div class="flex lg:hidden w-full gap-2">
            <USkeleton class="h-8 flex-1 rounded-md" />
            <USkeleton class="h-8 flex-1 rounded-md" />
          </div>
        </template>
      </ClientOnly>

      <!-- Row 1: From | Swap | To | Trip type toggle (desktop) -->
      <div class="flex flex-col lg:flex-row lg:items-end gap-4">
        <!-- From -->
        <div class="flex-1 min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700">
            {{ $t('flights.search.from') }}
          </label>
          <ClientOnly>
            <AirportSelect
              v-model="searchState.origin"
              :placeholder="$t('flights.search.from')"
              icon="i-lucide-plane-takeoff"
              size="lg"
            />
            <template #fallback>
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <!-- Swap buttons -->
        <div class="flex justify-center lg:pb-0.5">
          <UButton
            variant="ghost"
            color="neutral"
            size="lg"
            class="h-10 w-10 shrink-0 p-0 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40 lg:hidden"
            :aria-label="$t('flights.search.swapAirports')"
            :disabled="!searchState.origin && !searchState.destination"
            @click="swapAirports"
          >
            <UIcon name="i-lucide-arrow-down-up" class="size-5" />
          </UButton>
          <UButton
            icon="i-lucide-arrow-left-right"
            variant="ghost"
            color="neutral"
            size="md"
            class="hidden h-[45px] shrink-0 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40 lg:flex"
            :aria-label="$t('flights.search.swapAirports')"
            :disabled="!searchState.origin && !searchState.destination"
            @click="swapAirports"
          />
        </div>

        <!-- To -->
        <div class="flex-1 min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700">
            {{ $t('flights.search.to') }}
          </label>
          <ClientOnly>
            <AirportSelect
              v-model="searchState.destination"
              :placeholder="$t('flights.search.to')"
              icon="i-lucide-plane-landing"
              size="lg"
            />
            <template #fallback>
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <!-- Desktop: trip type toggle -->
        <ClientOnly>
          <div class="hidden lg:flex items-stretch gap-1 rounded-lg bg-neutral-100 p-0.5 self-end action-col h-9">
            <button
              type="button"
              :class="[
                'flex-1 flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                searchState.tripType === 'roundtrip'
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                  : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="searchState.tripType = 'roundtrip'"
            >
              {{ t('flights.search.roundtrip') }}
            </button>
            <button
              type="button"
              :class="[
                'flex-1 flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                searchState.tripType === 'oneway'
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                  : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="searchState.tripType = 'oneway'"
            >
              {{ t('flights.search.oneway') }}
            </button>
          </div>
          <template #fallback>
            <div class="hidden lg:flex gap-2 self-end action-col">
              <USkeleton class="h-9 flex-1 rounded-md" />
              <USkeleton class="h-9 flex-1 rounded-md" />
            </div>
          </template>
        </ClientOnly>
      </div>

      <!-- Row 2: Dates | Passengers | Search -->
      <div
        class="grid grid-cols-1 items-end gap-4 sm:grid-cols-2"
        :class="searchState.tripType === 'roundtrip'
          ? 'lg:grid-cols-[1fr_1fr_1fr_auto_auto]'
          : 'lg:grid-cols-[1fr_1fr_auto_auto]'"
      >
        <div class="min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700">
            {{ $t('flights.search.departureDate') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="departureDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="justify-start rounded-md"
                icon="i-lucide-calendar"
              >
                <span
                  :class="[
                    searchState.departureDate
                      ? 'font-normal text-neutral-900'
                      : 'font-normal text-neutral-400',
                  ]"
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

        <div v-if="searchState.tripType === 'roundtrip'" class="min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700">
            {{ $t('flights.search.returnDate') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="returnDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="justify-start rounded-md"
                icon="i-lucide-calendar"
              >
                <span
                  :class="[
                    searchState.returnDate
                      ? 'font-normal text-neutral-900'
                      : 'font-normal text-neutral-400',
                  ]"
                >
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

        <div class="min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700">
            {{ $t('flights.search.passengers') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="passengersOpen">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="justify-start rounded-md"
                icon="i-lucide-users"
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
              <USkeleton class="h-10 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <!-- Flexible dates -->
        <div class="flex items-center gap-1 self-end pb-2.5">
          <ClientOnly>
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
            <template #fallback>
              <USkeleton class="size-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </template>
          </ClientOnly>
        </div>

        <div class="flex items-end sm:col-span-2 lg:col-span-1 action-col">
          <ClientOnly>
            <UButton
              type="submit"
              block
              size="lg"
              color="primary"
              :loading="isSearching"
              :disabled="!canSubmit || !searchState.origin || !searchState.destination || !searchState.departureDate"
              icon="i-lucide-search"
              class="font-bold"
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

    <div class="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10 sm:gap-3">
      <div
        v-for="badge in [
          { icon: 'i-lucide-badge-check', key: 'noFees' },
          { icon: 'i-lucide-shield-check', key: 'directBooking' },
          { icon: 'i-lucide-lock', key: 'secureData' }
        ]"
        :key="badge.key"
        class="flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary-600/20 bg-primary-50 px-2 py-1.5 sm:px-4 sm:py-2"
      >
        <UIcon
          :name="badge.icon"
          class="h-3.5 w-3.5 shrink-0 text-primary-600 sm:h-4 sm:w-4"
        />
        <span class="text-xs sm:text-sm font-medium whitespace-nowrap">{{ t(`trustBadges.${badge.key}`) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .action-col {
    width: 18rem;
    flex-shrink: 0;
  }
}
</style>
