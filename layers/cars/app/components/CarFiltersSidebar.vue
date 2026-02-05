<script setup lang="ts">
import { useCarStore, type CarFilters } from '~/stores/carStore'

const route = useRoute()
const router = useRouter()
const carStore = useCarStore()
const { formatPrice } = useFormatPrice()
const { t } = useI18n()

const query = computed(() => route.query as Record<string, string>)

function getFiltersFromUrl(): Partial<CarFilters> {
  const q = query.value
  const filters: Partial<CarFilters> = {
    transmission: [],
    fuel: [],
    seats: [],
    category: [],
    color: [],
    priceRange: [carStore.minPrice, carStore.maxPrice],
    sortBy: 'price-asc',
  }

  const min = q.minPrice ? Number(q.minPrice) : carStore.minPrice
  const max = q.maxPrice ? Number(q.maxPrice) : carStore.maxPrice
  if (!Number.isNaN(min) && !Number.isNaN(max)) {
    filters.priceRange = [min, max]
  }

  if (q.transmission && typeof q.transmission === 'string') {
    filters.transmission = q.transmission
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (q.fuel && typeof q.fuel === 'string') {
    filters.fuel = q.fuel.split(',').map((s) => s.trim()).filter(Boolean)
  }
  if (q.seats && typeof q.seats === 'string') {
    filters.seats = q.seats
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))
  }
  if (q.category && typeof q.category === 'string') {
    filters.category = q.category.split(',').map((s) => s.trim()).filter(Boolean)
  }
  if (q.color && typeof q.color === 'string') {
    const colorArray = q.color.split(',').map((s) => s.trim()).filter(Boolean)
    if (colorArray.length > 0) filters.color = colorArray
  }
  if (q.sortBy && typeof q.sortBy === 'string') {
    const validSortBy = ['price-asc', 'price-desc', 'year-desc', 'name-asc']
    if (validSortBy.includes(q.sortBy)) {
      filters.sortBy = q.sortBy as CarFilters['sortBy']
    }
  }

  return filters
}

const urlFilters = computed(() => getFiltersFromUrl())

const priceRange = computed({
  get: () =>
    urlFilters.value.priceRange ?? [carStore.minPrice, carStore.maxPrice],
  set: (value: [number, number]) => {
    updateUrlWithFilters({ ...urlFilters.value, priceRange: value })
  },
})

function buildSearchQuery(filters: Partial<CarFilters>): Record<string, string> {
  const q = query.value
  const out: Record<string, string> = {}
  if (q.pickup) out.pickup = String(q.pickup)
  else if (q.location) out.pickup = String(q.location)
  if (q.return) out.return = String(q.return)
  else if (q.dropoffLocation) out.return = String(q.dropoffLocation)
  if (q.startDate) out.startDate = String(q.startDate)
  if (q.endDate) out.endDate = String(q.endDate)
  if (q.startTime) out.startTime = String(q.startTime)
  if (q.endTime) out.endTime = String(q.endTime)
  if (q.page) out.page = String(q.page)

  const min = carStore.minPrice
  const max = carStore.maxPrice
  if (
    filters.priceRange &&
    (filters.priceRange[0] !== min || filters.priceRange[1] !== max)
  ) {
    out.minPrice = String(filters.priceRange[0])
    out.maxPrice = String(filters.priceRange[1])
  }
  if (filters.transmission?.length) out.transmission = filters.transmission.join(',')
  if (filters.fuel?.length) out.fuel = filters.fuel.join(',')
  if (filters.seats?.length) out.seats = filters.seats.join(',')
  if (filters.category?.length) out.category = filters.category.join(',')
  if (filters.color?.length) out.color = filters.color.join(',')
  if (filters.sortBy && filters.sortBy !== 'price-asc') out.sortBy = filters.sortBy
  return out
}

function updateUrlWithFilters(filters: Partial<CarFilters>) {
  const next = buildSearchQuery(filters)
  void router.push({ path: route.path, query: next })
}

function toggleTransmission(value: string) {
  const current = [...(urlFilters.value.transmission || [])]
  const index = current.indexOf(value)
  if (index > -1) current.splice(index, 1)
  else current.push(value)
  updateUrlWithFilters({ ...urlFilters.value, transmission: current })
}

function toggleFuel(value: string) {
  const current = [...(urlFilters.value.fuel || [])]
  const index = current.indexOf(value)
  if (index > -1) current.splice(index, 1)
  else current.push(value)
  updateUrlWithFilters({ ...urlFilters.value, fuel: current })
}

function toggleSeats(value: number) {
  const current = [...(urlFilters.value.seats || [])]
  const index = current.indexOf(value)
  if (index > -1) current.splice(index, 1)
  else current.push(value)
  updateUrlWithFilters({ ...urlFilters.value, seats: current })
}

function toggleCategory(value: string) {
  const current = [...(urlFilters.value.category || [])]
  const index = current.indexOf(value)
  if (index > -1) current.splice(index, 1)
  else current.push(value)
  updateUrlWithFilters({ ...urlFilters.value, category: current })
}

function toggleColor(value: string) {
  const current = [...(urlFilters.value.color || [])]
  const index = current.indexOf(value)
  if (index > -1) current.splice(index, 1)
  else current.push(value)
  updateUrlWithFilters({ ...urlFilters.value, color: current })
}

function clearAllFilters() {
  const q = query.value
  const out: Record<string, string> = {}
  if (q.pickup) out.pickup = String(q.pickup)
  else if (q.location) out.pickup = String(q.location)
  if (q.return) out.return = String(q.return)
  else if (q.dropoffLocation) out.return = String(q.dropoffLocation)
  if (q.startDate) out.startDate = String(q.startDate)
  if (q.endDate) out.endDate = String(q.endDate)
  if (q.startTime) out.startTime = String(q.startTime)
  if (q.endTime) out.endTime = String(q.endTime)
  if (q.page) out.page = String(q.page)
  void router.push({ path: route.path, query: out })
}

const activeFiltersCount = computed(() => {
  let count = 0
  const filters = urlFilters.value
  if (
    filters.priceRange &&
    (filters.priceRange[0] !== carStore.minPrice ||
      filters.priceRange[1] !== carStore.maxPrice)
  )
    count++
  if (filters.transmission?.length) count++
  if (filters.fuel?.length) count++
  if (filters.seats?.length) count++
  if (filters.category?.length) count++
  if (filters.color?.length) count++
  return count
})

function formatColorLabel(color: string): string {
  return color
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getColorValue(color: string): string {
  const colorMap: Record<string, string> = {
    white: '#FFFFFF',
    pearl_white: '#F8F8F8',
    black: '#000000',
    metallic_black: '#2A2A2A',
    matte_black: '#1A1A1A',
    red: '#E60012',
    pearl_red: '#CC0000',
    blue: '#0066FF',
    dark_blue: '#003D82',
    green: '#00A651',
    dark_green: '#006837',
    yellow: '#FFD400',
    orange: '#FF6600',
    purple: '#9B26AF',
    gray: '#8E8E93',
    dark_gray: '#4A4A4A',
    silver: '#C7C7CC',
    brown: '#8B4513',
    gold: '#FFB800',
  }
  return colorMap[color] ?? '#CCCCCC'
}
</script>

<template>
  <div>
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t('cars.filterLabel') }}
        </h2>
        <UButton
          v-if="activeFiltersCount > 0"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="clearAllFilters"
        >
          {{ t('cars.clearAll') }}
        </UButton>
      </div>
      <p v-if="carStore.total > 0" class="text-sm text-muted mt-1">
        {{ carStore.total }}
        {{ carStore.total === 1 ? t('cars.car') : t('cars.cars') }}
        {{ t('cars.available') }}
      </p>
    </div>

    <div class="p-4 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t('cars.priceRange') }}
        </label>
        <USlider
          v-model="priceRange"
          :min="carStore.minPrice"
          :max="carStore.maxPrice"
          :step="5"
        />
        <div class="flex justify-between text-sm text-muted mt-2">
          <span>{{ formatPrice(priceRange[0]) }}</span>
          <span>{{ formatPrice(priceRange[1]) }}</span>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t('cars.transmission') }}
        </label>
        <div class="space-y-2">
          <UCheckbox
            v-for="transmission in carStore.availableTransmissions"
            :key="transmission"
            :model-value="(urlFilters.transmission || []).includes(transmission)"
            :label="transmission"
            @update:model-value="toggleTransmission(transmission)"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t('cars.fuelType') }}
        </label>
        <div class="space-y-2">
          <UCheckbox
            v-for="fuel in carStore.availableFuels"
            :key="fuel"
            :model-value="(urlFilters.fuel || []).includes(fuel)"
            :label="fuel"
            @update:model-value="toggleFuel(fuel)"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t('cars.numberOfSeats') }}
        </label>
        <div class="space-y-2">
          <UCheckbox
            v-for="seat in carStore.availableSeats"
            :key="seat"
            :model-value="(urlFilters.seats || []).includes(seat)"
            :label="seat + ' ' + t('cars.seats')"
            @update:model-value="toggleSeats(seat)"
          />
        </div>
      </div>

      <div v-if="carStore.availableCategories.length > 0">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t('cars.category') }}
        </label>
        <div class="space-y-2">
          <UCheckbox
            v-for="category in carStore.availableCategories"
            :key="category"
            :model-value="(urlFilters.category || []).includes(category)"
            :label="carStore.formatCategoryDisplay(category)"
            @update:model-value="toggleCategory(category)"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t('cars.color') }}
        </label>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="color in carStore.availableColors"
            :key="color"
            type="button"
            :class="[
              'w-7 h-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              (urlFilters.color || []).includes(color)
                ? 'border-primary ring-2 ring-primary ring-offset-1 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            ]"
            :style="{ backgroundColor: getColorValue(color) }"
            :title="formatColorLabel(color)"
            @click="toggleColor(color)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
