<script setup lang="ts">
import { useCarStore, type CarFilters } from '../../stores/carStore'
import { useAddressStore } from '../../stores/addressStore'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const carStore = useCarStore()
const addressStore = useAddressStore()
const { formatDate } = useFormatDate()

// URL: /makina/search?pickup=...&return=...&startDate=...&endDate=...&startTime=...&endTime=...
const query = computed(() => route.query as Record<string, string>)

const searchParams = computed(() => ({
  location: query.value.pickup || query.value.location || undefined,
  dropoffLocation: query.value.return || query.value.dropoffLocation || undefined,
  startDate: query.value.startDate || undefined,
  endDate: query.value.endDate || undefined,
  startTime: query.value.startTime || undefined,
  endTime: query.value.endTime || undefined,
}))

const hasSearchParams = computed(
  () =>
    !!(query.value.startDate && query.value.endDate && query.value.startTime && query.value.endTime),
)

function buildSearchQuery(updates: Record<string, string> = {}) {
  const q = { ...query.value, ...updates }
  const out: Record<string, string> = {}
  if (q.pickup) out.pickup = q.pickup
  else if (q.location) out.pickup = q.location
  if (q.return) out.return = q.return
  else if (q.dropoffLocation) out.return = q.dropoffLocation
  if (q.startDate) out.startDate = q.startDate
  if (q.endDate) out.endDate = q.endDate
  if (q.startTime) out.startTime = q.startTime
  if (q.endTime) out.endTime = q.endTime
  if (q.minPrice) out.minPrice = q.minPrice
  if (q.maxPrice) out.maxPrice = q.maxPrice
  if (q.transmission) out.transmission = q.transmission
  if (q.fuel) out.fuel = q.fuel
  if (q.seats) out.seats = q.seats
  if (q.category) out.category = q.category
  if (q.color) out.color = q.color
  if (q.sortBy && q.sortBy !== 'price-asc') out.sortBy = q.sortBy
  if (q.page && q.page !== '1') out.page = q.page
  if (q.vehicle_id) out.vehicle_id = q.vehicle_id
  return out
}

function pushSearchQuery(updates: Record<string, string>) {
  void router.push({ path: route.path, query: buildSearchQuery(updates) })
}

function getFiltersFromUrl(): ReturnType<() => {
  minPrice?: number
  maxPrice?: number
  transmission?: string[]
  fuel?: string[]
  seats?: number[]
  category?: string[]
  color?: string[]
  sortBy?: 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc'
}> {
  const q = query.value
  const filters: Record<string, unknown> = {}
  if (q.minPrice) {
    const min = Number(q.minPrice)
    if (!Number.isNaN(min)) filters.minPrice = min
  }
  if (q.maxPrice) {
    const max = Number(q.maxPrice)
    if (!Number.isNaN(max)) filters.maxPrice = max
  }
  if (q.transmission && typeof q.transmission === 'string')
    filters.transmission = q.transmission.split(',').map((s) => s.trim()).filter(Boolean)
  if (q.fuel && typeof q.fuel === 'string')
    filters.fuel = q.fuel.split(',').map((s) => s.trim()).filter(Boolean)
  if (q.seats && typeof q.seats === 'string')
    filters.seats = q.seats.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
  if (q.category && typeof q.category === 'string')
    filters.category = q.category.split(',').map((s) => s.trim()).filter(Boolean)
  if (q.color && typeof q.color === 'string') {
    const arr = q.color.split(',').map((s) => s.trim()).filter(Boolean)
    if (arr.length) filters.color = arr
  }
  if (q.sortBy && typeof q.sortBy === 'string') {
    const valid = ['price-asc', 'price-desc', 'year-desc', 'name-asc']
    if (valid.includes(q.sortBy)) filters.sortBy = q.sortBy
  }
  return filters as ReturnType<typeof getFiltersFromUrl>
}

function getActiveFiltersCountFromUrl(): number {
  const q = query.value
  let count = 0
  const min = q.minPrice ? Number(q.minPrice) : carStore.minPrice
  const max = q.maxPrice ? Number(q.maxPrice) : carStore.maxPrice
  if (!Number.isNaN(min) && !Number.isNaN(max) && (min !== carStore.minPrice || max !== carStore.maxPrice))
    count++
  if (q.transmission && typeof q.transmission === 'string' && q.transmission.split(',').filter(Boolean).length)
    count++
  if (q.fuel && typeof q.fuel === 'string' && q.fuel.split(',').filter(Boolean).length) count++
  if (q.seats && typeof q.seats === 'string' && q.seats.split(',').filter(Boolean).length) count++
  if (q.category && typeof q.category === 'string' && q.category.split(',').filter(Boolean).length) count++
  if (q.color && typeof q.color === 'string' && q.color.split(',').filter(Boolean).length) count++
  return count
}

const activeFiltersCount = computed(() => getActiveFiltersCountFromUrl())

const isEditing = ref(false)
const selectedDates = ref<{ start: Date | null; end: Date | null }>({ start: null, end: null })
const selectedTimes = ref<{ start: string | null; end: string | null }>({ start: null, end: null })
const selectedLocation = ref('')
const showDropOff = ref(false)
const dropOffLocation = ref('')
const addressItems = computed(() => addressStore.pickupCities)
const effectivePickupCity = computed(() => {
  if (!selectedLocation.value) return ''
  const option = addressStore.pickupCities.find((o) => o.value === selectedLocation.value)
  return option?.city ?? selectedLocation.value
})
const dropOffAddressItems = computed(
  () => (selectedLocation.value ? addressStore.dropOffByPickupCity[effectivePickupCity.value] ?? [] : []),
)

const hasLocation = computed(() => !!(searchParams.value.location && searchParams.value.location !== ''))
const hasDropoffLocation = computed(
  () =>
    !!(
      searchParams.value.dropoffLocation &&
      searchParams.value.dropoffLocation !== '' &&
      searchParams.value.dropoffLocation !== searchParams.value.location
    ),
)

const timeOptions = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30',
  '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
]

async function searchCars() {
  if (
    !searchParams.value.startDate ||
    !searchParams.value.endDate ||
    !searchParams.value.startTime ||
    !searchParams.value.endTime
  )
    return
  await carStore.searchCars({
    startDate: searchParams.value.startDate,
    endDate: searchParams.value.endDate,
    startTime: searchParams.value.startTime,
    endTime: searchParams.value.endTime,
    location: searchParams.value.location,
    dropoffLocation: searchParams.value.dropoffLocation,
  })
}

if (import.meta.client) {
  onMounted(async () => {
    if (hasSearchParams.value && addressStore.pickupCities.length === 0) {
      await addressStore.fetchAllAddresses()
    }
    if (hasSearchParams.value) {
      const q = query.value
      if (q.startDate) selectedDates.value.start = new Date(q.startDate)
      if (q.endDate) selectedDates.value.end = new Date(q.endDate)
      if (q.startTime) selectedTimes.value.start = q.startTime
      if (q.endTime) selectedTimes.value.end = q.endTime
      const pickup = q.pickup || q.location
      if (pickup) selectedLocation.value = pickup
      const ret = q.return || q.dropoffLocation
      if (ret && ret !== pickup) {
        dropOffLocation.value = ret
        showDropOff.value = true
      }
      const pageNum = q.page ? Number(q.page) : 1
      if (!Number.isNaN(pageNum) && pageNum >= 1) carStore.page = pageNum
      const urlFilters = getFiltersFromUrl()
      const batched: Partial<CarFilters> = {
        priceRange: [urlFilters.minPrice ?? carStore.minPrice, urlFilters.maxPrice ?? carStore.maxPrice],
        transmission: urlFilters.transmission ?? [],
        fuel: urlFilters.fuel ?? [],
        seats: urlFilters.seats ?? [],
        category: urlFilters.category ?? [],
        color: urlFilters.color ?? [],
        sortBy: urlFilters.sortBy ?? 'price-asc',
      }
      await carStore.setFilters(batched, true)
      await searchCars()
    }
  })
}

watch(
  () => [query.value.startDate, query.value.endDate, query.value.startTime, query.value.endTime, query.value.pickup, query.value.return, query.value.page, query.value.sortBy, query.value.minPrice, query.value.maxPrice, query.value.transmission, query.value.fuel, query.value.seats],
  async () => {
    if (!hasSearchParams.value) return
    const q = query.value
    if (q.startDate) selectedDates.value.start = new Date(q.startDate)
    if (q.endDate) selectedDates.value.end = new Date(q.endDate)
    if (q.startTime) selectedTimes.value.start = q.startTime
    if (q.endTime) selectedTimes.value.end = q.endTime
    const pickup = q.pickup || q.location
    if (pickup) selectedLocation.value = pickup
    const ret = q.return || q.dropoffLocation
    if (ret && ret !== pickup) {
      dropOffLocation.value = ret
      showDropOff.value = true
    } else {
      showDropOff.value = false
      dropOffLocation.value = ''
    }
    const pageNum = q.page ? Number(q.page) : 1
    if (!Number.isNaN(pageNum) && pageNum >= 1) carStore.page = pageNum
    const urlFilters = getFiltersFromUrl()
    const batched: Partial<CarFilters> = {
      priceRange: [urlFilters.minPrice ?? carStore.minPrice, urlFilters.maxPrice ?? carStore.maxPrice],
      transmission: urlFilters.transmission ?? [],
      fuel: urlFilters.fuel ?? [],
      seats: urlFilters.seats ?? [],
      category: urlFilters.category ?? [],
      color: urlFilters.color ?? [],
      sortBy: urlFilters.sortBy ?? 'price-asc',
    }
    await carStore.setFilters(batched, true)
    await searchCars()
  },
)

const page = computed({
  get: () => carStore.page,
  set: (v: number) => carStore.setPage(v),
})
const limit = computed(() => carStore.limit)
const response = computed(() => ({
  cars: carStore.cars,
  total: carStore.total,
  page: carStore.page,
  limit: carStore.limit,
}))
const loading = computed(() => carStore.loading)
const viewMode = computed({
  get: () => carStore.viewMode,
  set: (v: 'grid' | 'list') => carStore.setViewMode(v),
})

const isDesktop = ref(false)
if (import.meta.client) {
  onMounted(() => {
    const handleResize = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 0
      isDesktop.value = w >= 1024
      if (w >= 1024 && carStore.viewMode !== 'list') carStore.setViewMode('list')
      else if (w < 1024 && carStore.viewMode !== 'grid') carStore.setViewMode('grid')
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  })
}

const isFilterSidebarOpen = ref(false)
function openFilterSidebar() {
  if (!isDesktop.value) isFilterSidebarOpen.value = true
}

function getSortByFromUrl(): 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc' {
  const q = query.value
  if (q.sortBy && ['price-asc', 'price-desc', 'year-desc', 'name-asc'].includes(q.sortBy))
    return q.sortBy as 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc'
  return 'price-asc'
}

const sortBy = computed({
  get: () => getSortByFromUrl(),
  set: (value: 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc') => {
    if (value === 'price-asc') {
      const q = { ...query.value }
      delete q.sortBy
      pushSearchQuery(q)
    } else {
      pushSearchQuery({ sortBy: value })
    }
  },
})

const sortOptions = computed(() => [
  { label: t('cars.sortOptions.priceLowToHigh'), value: 'price-asc' },
  { label: t('cars.sortOptions.priceHighToLow'), value: 'price-desc' },
  { label: t('cars.sortOptions.yearNewestFirst'), value: 'year-desc' },
  { label: t('cars.sortOptions.nameAToZ'), value: 'name-asc' },
])

function handleEdit() {
  isEditing.value = true
}
function handleCancelEdit() {
  isEditing.value = false
}
function toggleDropOff() {
  showDropOff.value = !showDropOff.value
  if (!showDropOff.value) dropOffLocation.value = ''
}
function handleSearch() {
  if (!selectedDates.value.start || !selectedDates.value.end) return
  const q: Record<string, string> = {
    pickup: selectedLocation.value,
    return: dropOffLocation.value || selectedLocation.value,
    startDate: formatDate(selectedDates.value.start, 'YYYY-MM-DD'),
    endDate: formatDate(selectedDates.value.end, 'YYYY-MM-DD'),
    startTime: selectedTimes.value.start ?? '10:00',
    endTime: selectedTimes.value.end ?? '10:00',
  }
  const urlFilters = getFiltersFromUrl()
  const min = carStore.minPrice
  const max = carStore.maxPrice
  if (urlFilters.minPrice !== undefined || urlFilters.maxPrice !== undefined) {
    q.minPrice = String(urlFilters.minPrice ?? min)
    q.maxPrice = String(urlFilters.maxPrice ?? max)
  }
  if (urlFilters.transmission?.length) q.transmission = urlFilters.transmission.join(',')
  if (urlFilters.fuel?.length) q.fuel = urlFilters.fuel.join(',')
  if (urlFilters.seats?.length) q.seats = urlFilters.seats.join(',')
  if (urlFilters.category?.length) q.category = urlFilters.category.join(',')
  if (urlFilters.color?.length) q.color = urlFilters.color.join(',')
  if (urlFilters.sortBy && urlFilters.sortBy !== 'price-asc') q.sortBy = urlFilters.sortBy
  isEditing.value = false
  void router.push({ path: route.path, query: q })
}

watch(page, (newPage) => {
  pushSearchQuery({ page: String(newPage) })
  if (import.meta.client && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
})

useSeoPage({
  title: () =>
    hasSearchParams.value && searchParams.value.location
      ? `${t('cars.title')} ${searchParams.value.location} | Krahaso.co`
      : `${t('cars.title')} | Krahaso.co`,
  description: () => t('cars.description'),
  canonical: () => localePath('makina-search'),
})

</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 -mx-4 -mb-8 px-4 pb-8 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto py-6">
      <UBreadcrumb
        :items="[
          { label: t('nav.home'), to: localePath('/') },
          { label: t('nav.cars'), to: localePath('makina') },
          { label: t('cars.results.description') },
        ]"
        class="mb-6"
      />

      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {{ t('cars.title') }}
        </h1>

        <!-- Summary bar -->
        <div
          v-if="!isEditing"
          class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="flex flex-wrap gap-4 text-sm items-center">
            <div v-if="hasLocation" class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary" />
              <span class="text-muted">
                {{ t('cars.pickup') }}: <strong>{{ searchParams.location }}</strong>
              </span>
            </div>
            <div v-if="hasDropoffLocation" class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary" />
              <span class="text-muted">
                {{ t('cars.dropoff') }}: <strong>{{ searchParams.dropoffLocation }}</strong>
              </span>
            </div>
            <div v-if="searchParams.startDate && searchParams.endDate" class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar-days" class="w-4 h-4 text-primary" />
              <span class="text-muted">
                {{ t('cars.dates') }}: <strong>{{ searchParams.startDate }} – {{ searchParams.endDate }}</strong>
              </span>
            </div>
            <div v-if="searchParams.startTime && searchParams.endTime" class="flex items-center gap-2">
              <UIcon name="i-lucide-clock" class="w-4 h-4 text-primary" />
              <span class="text-muted">
                {{ t('cars.time') }}: <strong>{{ searchParams.startTime }} – {{ searchParams.endTime }}</strong>
              </span>
            </div>
            <div class="ml-auto">
              <UButton
                icon="i-lucide-pencil"
                color="primary"
                variant="ghost"
                size="sm"
                @click="handleEdit"
              >
                {{ t('cars.editSearch') }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Edit search form -->
        <div
          v-else
          class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div
            :class="[
              'flex flex-col md:flex-row gap-4',
              showDropOff ? 'max-w-7xl' : 'max-w-5xl',
            ]"
          >
            <div :class="['flex gap-2 items-center', showDropOff ? 'flex-[1_1_0]' : 'flex-1']">
              <USelectMenu
                v-model="selectedLocation"
                :items="addressItems"
                :placeholder="t('cars.pickupLocation')"
                size="md"
                leading-icon="i-lucide-map-pin"
                searchable
                :loading="addressStore.loading"
                class="min-w-[250px] flex-1"
                value-key="value"
                label-key="label"
              />
              <UButton
                :icon="showDropOff ? 'i-lucide-minus' : 'i-lucide-plus'"
                color="primary"
                variant="outline"
                size="md"
                square
                class="shrink-0"
                @click="toggleDropOff"
              />
            </div>
            <USelectMenu
              v-if="showDropOff"
              v-model="dropOffLocation"
              :items="dropOffAddressItems"
              :placeholder="t('cars.dropoffLocation')"
              size="md"
              leading-icon="i-lucide-map-pin"
              searchable
              :loading="addressStore.loading"
              :disabled="!selectedLocation || dropOffAddressItems.length === 0"
              class="flex-[1_1_0] min-w-[250px]"
              value-key="value"
              label-key="label"
            />
            <UPopover :portal="true" :popper="{ strategy: 'fixed', zIndex: 9999 }" class="flex-1">
              <UButton
                icon="i-lucide-calendar-days"
                :label="
                  selectedDates.start && selectedDates.end
                    ? `${formatDate(selectedDates.start, 'DD.MM.YYYY')} – ${formatDate(selectedDates.end, 'DD.MM.YYYY')}`
                    : t('cars.selectDates')
                "
                class="w-full text-left justify-start"
                variant="outline"
                size="md"
                block
              />
              <template #content="{ close }">
                <DateRangePicker
                  v-model="selectedDates"
                  :today-date="true"
                  @close="close"
                />
              </template>
            </UPopover>
            <USelect
              :model-value="selectedTimes.start ?? undefined"
              :items="timeOptions"
              :placeholder="t('cars.pickupTime')"
              leading-icon="i-lucide-clock"
              size="md"
              class="flex-[0.3]"
              @update:model-value="selectedTimes.start = $event ?? null"
            />
            <USelect
              :model-value="selectedTimes.end ?? undefined"
              :items="timeOptions"
              :placeholder="t('cars.returnTime')"
              leading-icon="i-lucide-clock"
              size="md"
              class="flex-[0.3]"
              @update:model-value="selectedTimes.end = $event ?? null"
            />
            <div class="flex gap-2">
              <UButton color="neutral" variant="outline" size="md" @click="handleCancelEdit">
                {{ t('cars.cancel') }}
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                size="md"
                icon="i-lucide-search"
                @click="handleSearch"
              >
                {{ t('cars.search') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-6">
        <aside class="hidden lg:block w-80 shrink-0">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
            <CarFiltersSidebar search-page />
          </div>
        </aside>

        <div class="flex-1 min-w-0">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
              <div class="flex items-center gap-4 flex-1">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-filter"
                  @click="openFilterSidebar"
                >
                  {{ t('cars.filterLabel') }}
                  <UBadge
                    v-if="activeFiltersCount > 0"
                    :label="String(activeFiltersCount)"
                    color="primary"
                    class="ml-2"
                  />
                </UButton>
                <p class="text-sm text-muted">
                  <span class="font-medium text-gray-900 dark:text-white">{{ carStore.total }}</span>
                  {{ carStore.total === 1 ? t('cars.car') : t('cars.cars') }} {{ t('cars.available') }}
                </p>
              </div>
              <div class="flex items-center gap-4 w-full sm:w-auto">
                <USelect
                  v-model="sortBy"
                  :items="sortOptions"
                  :placeholder="t('cars.sortBy')"
                  class="flex-1 sm:flex-initial sm:w-48"
                />
                <div class="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <UButton
                    :color="viewMode === 'grid' ? 'primary' : 'neutral'"
                    :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
                    icon="i-lucide-layout-grid"
                    size="sm"
                    @click="viewMode = 'grid'"
                  />
                  <UButton
                    :color="viewMode === 'list' ? 'primary' : 'neutral'"
                    :variant="viewMode === 'list' ? 'solid' : 'ghost'"
                    icon="i-lucide-list"
                    size="sm"
                    @click="viewMode = 'list'"
                  />
                </div>
              </div>
            </div>
          </div>

          <ClientOnly>
            <div v-if="loading" class="space-y-6">
              <div
                :class="[
                  'grid grid-cols-1 gap-6',
                  viewMode === 'grid'
                    ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                    : 'md:grid md:grid-cols-1 md:space-y-6',
                ]"
              >
                <div
                  v-for="i in limit"
                  :key="i"
                  :class="viewMode === 'list' ? 'md:flex md:gap-6' : ''"
                >
                  <USkeleton
                    :class="viewMode === 'list' ? 'md:h-48 md:w-80 md:shrink-0 h-80' : 'h-80'"
                    class="w-full rounded-xl"
                  />
                  <div v-if="viewMode === 'list'" class="hidden md:flex flex-1 space-y-4">
                    <USkeleton class="h-6 w-3/4" />
                    <USkeleton class="h-4 w-1/2" />
                    <USkeleton class="h-4 w-full" />
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else-if="response.cars && response.cars.length > 0"
              :class="[
                'grid grid-cols-1 gap-6',
                viewMode === 'grid'
                  ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                  : 'md:grid md:grid-cols-1 md:space-y-6',
              ]"
            >
              <CarCard
                v-for="car in response.cars"
                :key="car.id"
                :car="car"
                :view-mode="viewMode"
              />
            </div>

            <EmptyState
              v-else-if="hasSearchParams && response?.cars && response.cars.length === 0 && !loading"
            />

            <template #fallback>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div v-for="i in 6" :key="i" class="space-y-4">
                  <USkeleton class="h-80 w-full rounded-xl" />
                  <USkeleton class="h-4 w-3/4" />
                  <USkeleton class="h-4 w-1/2" />
                </div>
              </div>
            </template>
          </ClientOnly>

          <div
            v-if="response?.total && response.total > limit"
            class="flex justify-center py-8"
          >
            <UPagination
              v-model:page="page"
              :items-per-page="limit"
              :total="response.total"
              show-edges
            />
          </div>
        </div>
      </div>

      <USlideover
        v-model:open="isFilterSidebarOpen"
        side="left"
        :title="t('cars.filterLabel')"
        :ui="{ content: 'w-full max-w-sm', body: 'overflow-y-auto' }"
      >
        <template #body>
          <CarFiltersSidebar search-page />
        </template>
        <template #footer>
          <div class="flex gap-3 w-full">
            <UButton
              v-if="activeFiltersCount > 0"
              color="neutral"
              variant="outline"
              class="flex-1"
              @click="isFilterSidebarOpen = false"
            >
              {{ t('cars.clearAll') }}
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              class="flex-1"
              icon="i-lucide-eye"
              trailing
              @click="isFilterSidebarOpen = false"
            >
              {{ t('cars.viewResults') }}
            </UButton>
          </div>
        </template>
      </USlideover>
    </div>
  </div>
</template>
