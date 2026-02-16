<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Flights Routes - Krahaso Admin'
})

const days = ref(7)

const { data, status, refresh } = await useFetch('/api/admin/routes', {
  query: computed(() => ({ days: days.value, limit: 100 }))
})

const isLoading = computed(() => status.value === 'pending')

// Date range options
const dateRangeOptions = [
  { label: '7 Tage', value: 7 },
  { label: '30 Tage', value: 30 },
  { label: '90 Tage', value: 90 }
]

// Search filter
const search = ref('')

// Table columns
const columns = [
  { accessorKey: 'rank', header: '#' },
  { accessorKey: 'route', header: 'Route' },
  { accessorKey: 'searchCount', header: 'Suchen' },
  { accessorKey: 'redirectCount', header: 'Redirects' },
  { accessorKey: 'conversionRate', header: 'Conversion' }
]

// Filtered and ranked routes
const filteredRoutes = computed(() => {
  if (!data.value?.routes) return []

  let routes = data.value.routes.map((route, index) => ({
    ...route,
    rank: index + 1,
    route: `${route.origin} → ${route.destination}`
  }))

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    routes = routes.filter(r =>
      r.origin.toLowerCase().includes(searchLower)
      || r.destination.toLowerCase().includes(searchLower)
    )
  }

  return routes
})

// Summary stats
const totalSearches = computed(() =>
  data.value?.routes?.reduce((sum, r) => sum + r.searchCount, 0) ?? 0
)
const totalRedirects = computed(() =>
  data.value?.routes?.reduce((sum, r) => sum + r.redirectCount, 0) ?? 0
)
const avgConversion = computed(() =>
  totalSearches.value > 0 ? (totalRedirects.value / totalSearches.value * 100).toFixed(1) : '0.0'
)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="
        flex flex-col gap-4
        md:flex-row md:items-center md:justify-between
      "
    >
      <div>
        <h1 class="text-3xl font-bold">
          Routen
        </h1>
        <p class="mt-1 text-muted">
          Alle Flugstrecken mit Performance-Daten
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Date Range Selector -->
        <UFieldGroup size="sm">
          <UButton
            v-for="option in dateRangeOptions"
            :key="option.value"
            :variant="days === option.value ? 'solid' : 'outline'"
            :color="days === option.value ? 'primary' : 'neutral'"
            @click="days = option.value"
          >
            {{ option.label }}
          </UButton>
        </UFieldGroup>

        <!-- Refresh Button -->
        <UButton
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="neutral"
          :loading="isLoading"
          @click="refresh()"
        />
      </div>
    </div>

    <!-- Summary Cards -->
    <div
      class="
        grid grid-cols-1 gap-4
        md:grid-cols-4
      "
    >
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold">
            {{ data?.total ?? 0 }}
          </div>
          <div class="text-sm text-muted">
            Routen
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold">
            {{ totalSearches.toLocaleString() }}
          </div>
          <div class="text-sm text-muted">
            Suchen gesamt
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold">
            {{ totalRedirects.toLocaleString() }}
          </div>
          <div class="text-sm text-muted">
            Redirects gesamt
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-primary">
            {{ avgConversion }}%
          </div>
          <div class="text-sm text-muted">
            Ø Conversion
          </div>
        </div>
      </UCard>
    </div>

    <!-- Routes Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-map-pin"
              class="text-primary"
            />
            <h3 class="text-lg font-semibold">
              Alle Routen
            </h3>
          </div>

          <!-- Search -->
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Route suchen..."
            size="sm"
            class="w-48"
          />
        </div>
      </template>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="space-y-2"
      >
        <USkeleton
          v-for="i in 10"
          :key="i"
          class="h-12 w-full"
        />
      </div>

      <!-- Table -->
      <UTable
        v-else-if="filteredRoutes.length > 0"
        :data="filteredRoutes"
        :columns="columns"
      >
        <template #rank-data="{ row }">
          <span class="font-bold text-muted">{{ row.original.rank }}</span>
        </template>

        <template #route-data="{ row }">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold">{{ row.original.origin }}</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-3 text-muted"
            />
            <span class="font-mono font-bold">{{ row.original.destination }}</span>
          </div>
        </template>

        <template #searchCount-data="{ row }">
          {{ row.original.searchCount.toLocaleString() }}
        </template>

        <template #redirectCount-data="{ row }">
          <span
            :class="row.original.redirectCount > 0 ? `font-medium text-success` : `
              text-muted
            `"
          >
            {{ row.original.redirectCount }}
          </span>
        </template>

        <template #conversionRate-data="{ row }">
          <UBadge
            :color="row.original.conversionRate > 0.1 ? 'success' : row.original.conversionRate > 0 ? 'warning' : 'neutral'"
            variant="subtle"
          >
            {{ (row.original.conversionRate * 100).toFixed(1) }}%
          </UBadge>
        </template>
      </UTable>

      <!-- Empty State -->
      <div
        v-else
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon
          name="i-lucide-search-x"
          class="mb-4 size-12 text-muted"
        />
        <h2 class="text-lg font-semibold">
          Keine Routen gefunden
        </h2>
        <p class="mt-1 text-muted">
          {{ search ? 'Keine Routen entsprechen deiner Suche.' : 'Es wurden noch keine Flugsuchen durchgefÃ¼hrt.' }}
        </p>
      </div>
    </UCard>
  </div>
</template>



