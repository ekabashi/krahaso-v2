<script setup lang="ts">
import type { DatePriceInfo } from '~/types/flight'

const { t, locale } = useI18n()

const props = defineProps<{
  dates: DatePriceInfo[]
  cheapestDate: string | null
  selectedDate?: string
  legType: 'outbound' | 'return'
  isLoading?: boolean
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

// Scroll container ref
const scrollContainer = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Check scroll position and update arrow visibility
function updateScrollIndicators() {
  if (!scrollContainer.value) return
  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value
  canScrollLeft.value = scrollLeft > 10
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 10
}

// Scroll to selected date on mount
onMounted(() => {
  nextTick(() => {
    if (!scrollContainer.value || !props.selectedDate) return

    // Find the selected date element
    const selectedIndex = props.dates.findIndex(d => d.date === props.selectedDate)
    if (selectedIndex === -1) return

    const cells = scrollContainer.value.querySelectorAll('[data-date-cell]')
    const selectedCell = cells[selectedIndex] as HTMLElement
    if (!selectedCell) return

    // Center the selected date
    const containerWidth = scrollContainer.value.clientWidth
    const cellLeft = selectedCell.offsetLeft
    const cellWidth = selectedCell.offsetWidth
    const scrollTo = cellLeft - (containerWidth / 2) + (cellWidth / 2)

    scrollContainer.value.scrollTo({ left: scrollTo, behavior: 'instant' })
    updateScrollIndicators()
  })
})

// Update indicators on scroll
function onScroll() {
  updateScrollIndicators()
}

// Scroll left/right
function scrollByAmount(direction: 'left' | 'right') {
  if (!scrollContainer.value) return
  const amount = direction === 'left' ? -200 : 200
  scrollContainer.value.scrollBy({ left: amount, behavior: 'smooth' })
}

// Format date for display - parse date parts manually to avoid timezone issues
function formatDay(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  // Create date at noon UTC to avoid timezone shifts
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date.toLocaleDateString(locale.value, { weekday: 'short', timeZone: 'UTC' })
}

function formatDayNumber(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  // Create date at noon UTC to avoid timezone shifts
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date.toLocaleDateString(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

// Format price
function formatPrice(price: number | null): string {
  if (price === null) return '–'
  return `${Math.round(price)}€`
}

// Check if selected date has same price as cheapest
const selectedIsTiedForCheapest = computed(() => {
  if (!props.selectedDate || !props.cheapestDate) return false
  const cheapestPrice = props.dates.find(d => d.date === props.cheapestDate)?.minPrice
  const selectedPrice = props.dates.find(d => d.date === props.selectedDate)?.minPrice
  return cheapestPrice !== null && selectedPrice !== null && cheapestPrice === selectedPrice
})

// Check if date is cheapest (but hide if selected date is tied for cheapest)
function isCheapest(dateStr: string): boolean {
  if (dateStr !== props.cheapestDate) return false
  // Don't show "Günstigster" badge if selected date is tied for cheapest
  if (selectedIsTiedForCheapest.value && dateStr !== props.selectedDate) return false
  return true
}

// Check if date is selected
function isSelected(dateStr: string): boolean {
  return dateStr === props.selectedDate
}

// Check if selected date has the same price as cheapest (show combined badge)
function isSelectedTiedForCheapest(dateStr: string): boolean {
  if (!isSelected(dateStr)) return false
  return selectedIsTiedForCheapest.value
}

// Get cell styling based on state
function getCellClass(date: DatePriceInfo): string {
  const classes = [
    `
      relative min-w-[76px] shrink-0 cursor-pointer rounded-lg border p-2
      text-center transition-all
      sm:min-w-0 sm:shrink sm:p-3
    `,
    'hover:border-primary/50 hover:shadow-md'
  ]

  // Selected date that is tied for cheapest gets primary styling
  if (isSelectedTiedForCheapest(date.date)) {
    classes.push('border-primary bg-primary/10 ring-2 ring-primary')
  } else if (isCheapest(date.date)) {
    classes.push('border-primary bg-primary/10 ring-2 ring-primary')
  } else if (isSelected(date.date)) {
    // Selected date (not tied for cheapest) gets slate style
    classes.push('border-slate-400 bg-slate-100 ring-2 ring-slate-400 dark:border-slate-500 dark:bg-slate-800 dark:ring-slate-500')
  } else if (date.minPrice === null) {
    classes.push('border-default bg-muted/10 opacity-50')
  } else {
    classes.push('border-default bg-default')
  }

  return classes.join(' ')
}
</script>

<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="flex items-center gap-2 text-sm font-medium">
        <UIcon
          :name="legType === 'outbound' ? 'i-lucide-plane-takeoff' : 'i-lucide-plane-landing'"
          class="h-4 w-4"
        />
        {{ legType === 'outbound' ? t('flights.flexible.outbound') : t('flights.flexible.return') }}
      </h3>
      <span
        v-if="isLoading"
        class="flex items-center gap-1 text-xs text-muted"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="h-3 w-3 animate-spin"
        />
      </span>
      <span
        v-else-if="cheapestDate"
        class="flex items-center gap-1 text-xs text-primary"
      >
        <UIcon
          name="i-lucide-badge-check"
          class="h-3 w-3"
        />
        {{ t('flights.flexible.cheapest') }}
      </span>
    </div>

    <!-- Date Grid with arrows overlapping -->
    <div
      v-if="dates.length > 0"
      class="relative"
    >
      <!-- Left Arrow - overlapping cells -->
      <button
        v-if="canScrollLeft"
        class="
          absolute top-[calc(50%+6px)] left-1 z-20 -translate-y-1/2 rounded-full
          bg-slate-500/70 p-1.5 shadow-md
          sm:hidden
        "
        @click="scrollByAmount('left')"
      >
        <UIcon
          name="i-lucide-chevron-left"
          class="h-4 w-4 text-white"
        />
      </button>

      <!-- Scroll Container -->
      <div
        ref="scrollContainer"
        class="
          -mx-4 overflow-x-auto overflow-y-visible px-4 pb-2
          sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0
        "
        @scroll="onScroll"
      >
        <div
          class="
            flex gap-1.5 pt-3
            sm:grid sm:grid-cols-7 sm:gap-2
          "
        >
          <div
            v-for="date in dates"
            :key="date.date"
            :class="getCellClass(date)"
            data-date-cell
            @click="emit('select', date.date)"
          >
            <!-- Combined Badge: Selected AND tied for cheapest -->
            <div
              v-if="isSelectedTiedForCheapest(date.date)"
              class="
                absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full
                bg-primary px-2 py-0.5 text-[10px] font-medium whitespace-nowrap
                text-white
              "
            >
              {{ t('flights.flexible.yourDate') }} · {{ t('flights.flexible.cheapest') }}
            </div>

            <!-- Cheapest Badge (only if selected is NOT tied for cheapest) -->
            <div
              v-else-if="isCheapest(date.date)"
              class="
                absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full
                bg-primary px-2 py-0.5 text-[10px] font-medium whitespace-nowrap
                text-white
              "
            >
              {{ t('flights.flexible.cheapest') }}
            </div>

            <!-- Selected Date Badge (only if NOT tied for cheapest) -->
            <div
              v-else-if="isSelected(date.date)"
              class="
                absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full
                bg-slate-500 px-2 py-0.5 text-[10px] font-medium
                whitespace-nowrap text-white
              "
            >
              {{ t('flights.flexible.yourDate') }}
            </div>

            <!-- Day of Week -->
            <p
              class="
                text-[10px] text-muted
                sm:text-xs
              "
            >
              {{ formatDay(date.date) }}
            </p>

            <!-- Date -->
            <p
              class="
                text-xs font-medium
                sm:text-sm
              "
            >
              {{ formatDayNumber(date.date) }}
            </p>

            <!-- Price -->
            <p
              :class="[
                `
                  mt-1 text-base font-bold
                  sm:text-lg
                `,
                date.minPrice !== null ? 'text-primary' : 'text-muted'
              ]"
            >
              {{ formatPrice(date.minPrice) }}
            </p>

            <!-- Flight Count -->
            <p class="text-[10px] text-muted">
              <template v-if="date.isLoading">
                <UIcon
                  name="i-lucide-loader-2"
                  class="h-3 w-3 animate-spin"
                />
              </template>
              <template v-else-if="date.flightCount > 0">
                {{ date.flightCount }} {{ date.flightCount === 1 ? t('flights.flexible.flight') : t('flights.flexible.flights') }}
              </template>
              <template v-else>
                {{ t('flights.flexible.noFlights') }}
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- Right Arrow - overlapping cells -->
      <button
        v-if="canScrollRight"
        class="
          absolute top-[calc(50%+6px)] right-1 z-20 -translate-y-1/2
          rounded-full bg-slate-500/70 p-1.5 shadow-md
          sm:hidden
        "
        @click="scrollByAmount('right')"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="h-4 w-4 text-white"
        />
      </button>
    </div>

    <!-- Hint -->
    <p class="text-xs text-muted">
      {{ t('flights.flexible.selectHint') }}
    </p>
  </div>
</template>
