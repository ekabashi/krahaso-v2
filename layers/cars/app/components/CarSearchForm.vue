<script setup lang="ts">
import { useAddressStore } from '../stores/addressStore'
import { slugify } from '../utils/slugify'
import type { CityOption } from '../types'

const { t, locale } = useI18n()
const { formatDate } = useFormatDate()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { trackSearchSubmitted } = useAnalytics()
const addressStore = useAddressStore()
const { getLocationByKey } = useAvailableLocations()

const props = withDefaults(
  defineProps<{
    defaultLocationKey?: string
    embedded?: boolean
  }>(),
  { defaultLocationKey: '', embedded: false },
)

const emit = defineEmits<{
  search: [params: Record<string, string>]
}>()

const addressItems = computed(() => addressStore.pickupCities)

const effectivePickupCity = computed(() => {
  if (!selectedLocation.value) return ''
  const option = addressStore.pickupCities.find(
    (o: CityOption) => o.value === selectedLocation.value,
  )
  return option?.city ?? selectedLocation.value
})

const dropOffAddressItems = computed(() => {
  if (!selectedLocation.value) return addressStore.pickupCities
  return addressStore.dropOffByPickupCity[effectivePickupCity.value] ?? []
})

const selectedDates = ref<{ start: Date | null; end: Date | null }>({
  start: null,
  end: null,
})

const selectedTimes = ref<{ start: string | null; end: string | null }>({
  start: null,
  end: null,
})

const selectedLocation = ref('')
const dropOffLocation = ref('')
const dateRangeOpen = ref(false)
const pickupTimeOpen = ref(false)
const returnTimeOpen = ref(false)
const isSearching = ref(false)
const locationType = ref<'same' | 'different'>('same')

const windowWidth = ref(0)
const numberOfMonths = computed(() => (windowWidth.value < 1024 ? 1 : 2))

onMounted(() => {
  if (import.meta.client) {
    windowWidth.value = window.innerWidth
    const handleResize = () => {
      windowWidth.value = window.innerWidth
    }
    window.addEventListener('resize', handleResize)
    onUnmounted(() => window.removeEventListener('resize', handleResize))
  }
})

if (import.meta.client) {
  onMounted(async () => {
    if (addressStore.pickupCities.length === 0) {
      await addressStore.fetchAllAddresses()
    }
  })
}

// Sync from route query
const q = computed(() => route.query)
watch(
  [q, addressItems],
  () => {
    const loc = typeof q.value.location === 'string' ? q.value.location : ''
    if (loc && addressItems.value.some((i: CityOption) => i.value === loc)) {
      selectedLocation.value = loc
      if (locationType.value === 'same') dropOffLocation.value = loc
    }
    const start = typeof q.value.startDate === 'string' ? q.value.startDate : ''
    const end = typeof q.value.endDate === 'string' ? q.value.endDate : ''
    if (start) selectedDates.value.start = new Date(start)
    if (end) selectedDates.value.end = new Date(end)
    if (typeof q.value.startTime === 'string') selectedTimes.value.start = q.value.startTime
    if (typeof q.value.endTime === 'string') selectedTimes.value.end = q.value.endTime
  },
  { immediate: true },
)

// Preselect location when defaultLocationKey is set (e.g. on /makina/prizren)
watch(
  () => [props.defaultLocationKey, addressItems.value, locale.value] as const,
  ([key, items]) => {
    if (!key || items.length === 0) return
    const def = getLocationByKey(key)
    if (!def) return
    const name = def.names[locale.value as 'sq' | 'en' | 'de']
    const option = items.find(
      (i: CityOption) => i.value === name || i.label === name,
    )
    if (option && !selectedLocation.value) {
      selectedLocation.value = option.value
      if (locationType.value === 'same') dropOffLocation.value = option.value
    }
  },
  { immediate: true },
)

watch(selectedLocation, (newLocation) => {
  if (newLocation) {
    const cityOption = addressStore.pickupCities.find(
      (c: CityOption) => c.value === newLocation,
    )
    if (cityOption) {
      if (locationType.value === 'same') {
        dropOffLocation.value = cityOption.city ?? newLocation
      } else {
        const valid = dropOffAddressItems.value.map((item: CityOption) => item.value)
        if (dropOffLocation.value && !valid.includes(dropOffLocation.value)) {
          dropOffLocation.value = ''
        }
      }
    }
  } else {
    dropOffLocation.value = ''
  }
})

watch(locationType, (newType) => {
  if (newType === 'same' && selectedLocation.value) {
    dropOffLocation.value = selectedLocation.value
  } else if (
    newType === 'different' &&
    dropOffLocation.value === selectedLocation.value
  ) {
    dropOffLocation.value = ''
  }
})

const timeOptions = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
]

function timeLabel(time: string): string {
  if (time === '00:00') return t('carSearch.midnight')
  if (time === '12:00') return t('carSearch.noon')
  return time
}

function getNextFullHour(): string {
  const now = new Date()
  const next = now.getHours() + 1
  const h = (next % 24).toString().padStart(2, '0')
  return `${h}:00`
}

const pickupTimeGrid = useTemplateRef<HTMLElement>('pickupTimeGrid')
const returnTimeGrid = useTemplateRef<HTMLElement>('returnTimeGrid')

function scrollToSelected(gridEl: HTMLElement | null, time: string | null) {
  if (!time) return
  nextTick(() => {
    nextTick(() => {
      const el = gridEl ?? pickupTimeGrid.value ?? returnTimeGrid.value
      if (!el) return
      const btn = el.querySelector(`[data-time="${time}"]`) as HTMLElement | null
      if (btn) btn.scrollIntoView({ block: 'center', behavior: 'instant' })
    })
  })
}

// Auto-select next full hour on mount
onMounted(() => {
  if (!selectedTimes.value.start && !selectedTimes.value.end) {
    const defaultTime = getNextFullHour()
    selectedTimes.value.start = defaultTime
    selectedTimes.value.end = defaultTime
  }
})

// Scroll to selected time when popover opens
watch(pickupTimeOpen, (open) => {
  if (open) scrollToSelected(pickupTimeGrid.value, selectedTimes.value.start)
})
watch(returnTimeOpen, (open) => {
  if (open) scrollToSelected(returnTimeGrid.value, selectedTimes.value.end)
})

function formatDateRangeDisplay(): string {
  const start = selectedDates.value.start
  const end = selectedDates.value.end
  if (!start && !end) return t('carSearch.selectDate')
  const startStr = start ? formatDate(start, 'MMM D, YYYY') : t('carSearch.selectDate')
  const endStr = end ? formatDate(end, 'MMM D, YYYY') : t('carSearch.selectDate')
  return `${startStr} – ${endStr}`
}

const isFormValid = computed(
  () =>
    !!(
      selectedDates.value.start &&
      selectedDates.value.end &&
      selectedLocation.value
    ),
)

function swapLocations() {
  if (locationType.value === 'different') {
    const temp = selectedLocation.value
    selectedLocation.value = dropOffLocation.value
    dropOffLocation.value = temp
  }
}

async function handleSearch() {
  if (
    !isFormValid.value ||
    !selectedDates.value.start ||
    !selectedDates.value.end
  ) {
    return
  }

  isSearching.value = true

  const dropoff =
    locationType.value === 'same'
      ? selectedLocation.value
      : dropOffLocation.value || selectedLocation.value
  const query: Record<string, string> = {
    pickup: slugify(selectedLocation.value),
    return: slugify(dropoff),
    startDate: formatDate(selectedDates.value.start!, 'YYYY-MM-DD'),
    endDate: formatDate(selectedDates.value.end!, 'YYYY-MM-DD'),
    startTime: selectedTimes.value.start ?? '10:00',
    endTime: selectedTimes.value.end ?? '10:00',
  }

  trackSearchSubmitted('car', {
    form_source: 'krahaso_car_search_form',
    route_path: route.path,
    pickupLocation: selectedLocation.value,
    dropoffLocation: dropoff,
    pickupDate: query.startDate,
    dropoffDate: query.endDate,
    pickupTime: query.startTime,
    dropoffTime: query.endTime,
    sameLocation: locationType.value === 'same',
  })

  try {
    emit('search', { ...query, location: selectedLocation.value, dropoffLocation: dropoff })
    void router.push({ path: localePath('makina-search'), query })
  } finally {
    isSearching.value = false
  }
}
</script>

<template>
  <div
    :class="[
      'w-full',
      embedded
        ? ''
        : 'rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl transition-all duration-300 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-900 md:p-8',
    ]"
  >
    <form class="landing-car-form space-y-6" @submit.prevent="handleSearch">
      <!-- Mobile: location type toggle -->
      <ClientOnly>
        <div class="flex lg:hidden items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
          <button
            type="button"
            :class="[
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              locationType === 'same'
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                : 'text-neutral-500 hover:text-neutral-700',
            ]"
            @click="locationType = 'same'"
          >
            {{ t('carSearch.sameLocation') }}
          </button>
          <button
            type="button"
            :class="[
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              locationType === 'different'
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                : 'text-neutral-500 hover:text-neutral-700',
            ]"
            @click="locationType = 'different'"
          >
            {{ t('carSearch.differentLocation') }}
          </button>
        </div>
        <template #fallback>
          <div class="flex lg:hidden w-full gap-2">
            <USkeleton class="h-8 flex-1 rounded-md" />
            <USkeleton class="h-8 flex-1 rounded-md" />
          </div>
        </template>
      </ClientOnly>

      <!-- Location row: [Pickup] [Swap?] [Dropoff?] [Toggle] -->
      <div class="flex flex-col lg:flex-row lg:items-end gap-4">
        <!-- Pickup -->
        <div class="flex-1 min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {{
              locationType === 'same'
                ? t('carSearch.pickupDropoffLocation')
                : t('carSearch.pickupLocation')
            }}
          </label>
          <ClientOnly>
            <USelectMenu
              v-model="selectedLocation"
              :items="addressItems"
              :placeholder="t('carSearch.whereNeedCar')"
              size="lg"
              icon="i-lucide-map-pin"
              searchable
              :loading="addressStore.loading"
              value-key="value"
              label-key="label"
              class="w-full rounded-md"
            />
            <template #fallback>
              <USkeleton class="h-9 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <!-- Swap button (only when different) -->
        <div v-if="locationType === 'different'" class="flex justify-center lg:pb-0.5">
          <UButton
            variant="ghost"
            color="neutral"
            size="lg"
            class="h-10 w-10 shrink-0 p-0 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40 lg:hidden"
            aria-label="Swap locations"
            :disabled="!selectedLocation && !dropOffLocation"
            @click="swapLocations"
          >
            <UIcon name="i-lucide-arrow-down-up" class="size-5" />
          </UButton>
          <UButton
            icon="i-lucide-arrow-left-right"
            variant="ghost"
            color="neutral"
            size="md"
            class="hidden h-[45px] shrink-0 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40 lg:flex"
            aria-label="Swap locations"
            :disabled="!selectedLocation && !dropOffLocation"
            @click="swapLocations"
          />
        </div>

        <!-- Dropoff (only when different) -->
        <div v-if="locationType === 'different'" class="flex-1 min-w-0 space-y-1.5">
          <label class="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {{ t('carSearch.dropoffLocation') }}
          </label>
          <ClientOnly>
            <USelectMenu
              v-model="dropOffLocation"
              :items="dropOffAddressItems"
              :placeholder="t('carSearch.whereReturnCar')"
              size="lg"
              icon="i-lucide-map-pin"
              searchable
              :loading="addressStore.loading"
              :disabled="!selectedLocation || dropOffAddressItems.length === 0"
              value-key="value"
              label-key="label"
              class="w-full rounded-md"
            />
            <template #fallback>
              <USkeleton class="h-9 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <!-- Desktop: location type toggle -->
        <ClientOnly>
          <div class="hidden lg:flex items-stretch gap-1 rounded-lg bg-neutral-100 p-0.5 self-end action-col h-9">
            <button
              type="button"
              :class="[
                'flex-1 flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors cursor-pointer',
                locationType === 'same'
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                  : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="locationType = 'same'"
            >
              {{ t('carSearch.sameLocation') }}
            </button>
            <button
              type="button"
              :class="[
                'flex-1 flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors cursor-pointer',
                locationType === 'different'
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-primary-200'
                  : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="locationType = 'different'"
            >
              {{ t('carSearch.differentLocation') }}
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

      <div
        class="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <div class="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
          <label class="mb-1.5 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {{ t('carSearch.dateRange') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="dateRangeOpen">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="justify-start rounded-md transition-colors duration-200"
                icon="i-lucide-calendar-days"
              >
                <span
                  :class="[
                    selectedDates.start && selectedDates.end
                      ? 'font-normal text-neutral-900 dark:text-neutral-100'
                      : 'font-normal text-neutral-400',
                  ]"
                >
                  {{ formatDateRangeDisplay() }}
                </span>
              </UButton>
              <template #content="{ close }">
                <DateRangePicker
                  v-model="selectedDates"
                  :today-date="true"
                  :number-of-months="numberOfMonths"
                  @close="
                    () => {
                      close()
                      dateRangeOpen = false
                    }
                  "
                />
              </template>
            </UPopover>
            <template #fallback>
              <USkeleton class="h-9 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {{ t('carSearch.pickupTime') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="pickupTimeOpen">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="justify-start rounded-md"
                icon="i-lucide-clock"
              >
                <span :class="selectedTimes.start ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'">
                  {{ selectedTimes.start ? timeLabel(selectedTimes.start) : t('carSearch.selectTime') }}
                </span>
              </UButton>
              <template #content>
                <div ref="pickupTimeGrid" class="grid grid-cols-2 gap-1.5 px-3 py-5 max-h-64 overflow-y-auto w-56">
                  <button
                    v-for="time in timeOptions"
                    :key="time"
                    type="button"
                    :data-time="time"
                    :class="[
                      'rounded-lg px-2 py-2.5 text-sm text-center transition-colors cursor-pointer',
                      selectedTimes.start === time
                        ? 'bg-primary-600 text-white font-medium'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                    ]"
                    @click="selectedTimes.start = time; pickupTimeOpen = false"
                  >
                    {{ timeLabel(time) }}
                  </button>
                </div>
              </template>
            </UPopover>
            <template #fallback>
              <USkeleton class="h-9 w-full rounded-md" />
            </template>
          </ClientOnly>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {{ t('carSearch.returnTime') }}
          </label>
          <ClientOnly>
            <UPopover v-model:open="returnTimeOpen">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="justify-start rounded-md"
                icon="i-lucide-clock"
              >
                <span :class="selectedTimes.end ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'">
                  {{ selectedTimes.end ? timeLabel(selectedTimes.end) : t('carSearch.selectTime') }}
                </span>
              </UButton>
              <template #content>
                <div ref="returnTimeGrid" class="grid grid-cols-2 gap-1.5 px-3 py-5 max-h-64 overflow-y-auto w-56">
                  <button
                    v-for="time in timeOptions"
                    :key="time"
                    type="button"
                    :data-time="time"
                    :class="[
                      'rounded-lg px-2 py-2.5 text-sm text-center transition-colors cursor-pointer',
                      selectedTimes.end === time
                        ? 'bg-primary-600 text-white font-medium'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                    ]"
                    @click="selectedTimes.end = time; returnTimeOpen = false"
                  >
                    {{ timeLabel(time) }}
                  </button>
                </div>
              </template>
            </UPopover>
            <template #fallback>
              <USkeleton class="h-9 w-full rounded-md" />
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
              :disabled="!isFormValid"
              icon="i-lucide-search"
              class="font-bold"
            >
              <span v-if="!isSearching">{{ t('carSearch.searchCars') }}</span>
              <span v-else>{{ t('carSearch.searching') }}</span>
            </UButton>
            <template #fallback>
              <USkeleton class="h-9 w-32 rounded-md" />
            </template>
          </ClientOnly>
        </div>
      </div>
    </form>

    <div class="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10 sm:gap-3">
      <div
        v-for="badge in [
          { icon: 'i-lucide-badge-check', key: 'carNoFee' },
          { icon: 'i-lucide-tag', key: 'carTransparent' },
          { icon: 'i-lucide-shield-check', key: 'carComfort' },
        ]"
        :key="badge.key"
        class="flex items-center gap-1.5 rounded-full border border-primary-600/20 bg-primary-50 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2"
      >
        <UIcon :name="badge.icon" class="h-3.5 w-3.5 shrink-0 text-primary-600 sm:h-4 sm:w-4" />
        <span class="whitespace-nowrap text-xs font-medium sm:text-sm">
          {{ t(`trustBadges.${badge.key}`) }}
        </span>
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
