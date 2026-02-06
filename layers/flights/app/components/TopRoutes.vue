<script setup lang="ts">
interface Route {
  origin: string
  destination: string
  searchCount: number
  redirectCount: number
  conversionRate: number
}

interface Props {
  routes?: Route[] | null
  loading?: boolean
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 10
})

const displayRoutes = computed(() => props.routes?.slice(0, props.limit) ?? [])
</script>

<template>
  <div class="space-y-2">
    <!-- Loading State -->
    <template v-if="loading">
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center justify-between p-3"
      >
        <div class="flex items-center gap-3">
          <USkeleton class="size-6" />
          <USkeleton class="h-5 w-32" />
        </div>
        <USkeleton class="h-5 w-20" />
      </div>
    </template>

    <!-- Routes List -->
    <template v-else-if="displayRoutes.length > 0">
      <div
        v-for="(route, index) in displayRoutes"
        :key="`${route.origin}-${route.destination}`"
        class="
          flex items-center justify-between rounded-lg p-3 transition-colors
          hover:bg-elevated
        "
      >
        <!-- Rank & Route -->
        <div class="flex items-center gap-3">
          <span class="w-6 text-sm font-bold text-muted">{{ index + 1 }}.</span>
          <div>
            <div class="font-semibold">
              {{ route.origin }} <UIcon
                name="i-lucide-arrow-right"
                class="inline size-3 text-muted"
              /> {{ route.destination }}
            </div>
            <div class="text-xs text-muted">
              {{ route.searchCount.toLocaleString() }} Suchen
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="text-right">
          <div class="font-semibold">
            {{ route.redirectCount }} Redirects
          </div>
          <div class="text-xs text-muted">
            {{ (route.conversionRate * 100).toFixed(1) }}% Conv.
          </div>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div
      v-else
      class="py-8 text-center text-muted"
    >
      Keine Routen-Daten vorhanden
    </div>
  </div>
</template>
