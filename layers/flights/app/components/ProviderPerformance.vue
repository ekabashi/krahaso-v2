<script setup lang="ts">
interface Provider {
  providerId: string
  searchCount: number
  resultCount: number
  clickCount: number
  redirectCount: number
  avgPrice: number
  ctr: number
  conversionRate: number
}

interface Props {
  providers?: Provider[] | null
  loading?: boolean
}

const props = defineProps<Props>()

const providerNames: Record<string, string> = {
  airprishtina: 'AirPrishtina',
  kosovafly: 'KosovaFly',
  dituria: 'Dituria',
  erifly: 'EriFly',
  airtiketa: 'AirTiketa',
  prishtinaticket: 'Prishtina Ticket',
  flyksa: 'FlyKSA'
}

const sortedProviders = computed(() =>
  [...(props.providers ?? [])]
    .sort((a, b) => b.conversionRate - a.conversionRate)
)
</script>

<template>
  <div class="overflow-x-auto">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="space-y-3"
    >
      <USkeleton
        v-for="i in 5"
        :key="i"
        class="h-12 w-full"
      />
    </div>

    <!-- Table -->
    <table
      v-else-if="sortedProviders.length > 0"
      class="w-full text-sm"
    >
      <thead>
        <tr class="border-b border-default">
          <th class="py-2 text-left font-medium text-muted">
            Provider
          </th>
          <th class="py-2 text-right font-medium text-muted">
            Clicks
          </th>
          <th class="py-2 text-right font-medium text-muted">
            Redirects
          </th>
          <th class="py-2 text-right font-medium text-muted">
            CTR
          </th>
          <th class="py-2 text-right font-medium text-muted">
            Conv.
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="provider in sortedProviders"
          :key="provider.providerId"
          class="
            border-b border-default transition-colors
            last:border-0
            hover:bg-elevated
          "
        >
          <td class="py-3">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ providerNames[provider.providerId] ?? provider.providerId }}</span>
              <UBadge
                v-if="provider.conversionRate > 0.35"
                color="success"
                variant="subtle"
                size="xs"
              >
                Top
              </UBadge>
            </div>
          </td>
          <td class="py-3 text-right tabular-nums">
            {{ provider.clickCount.toLocaleString() }}
          </td>
          <td class="py-3 text-right font-semibold text-primary tabular-nums">
            {{ provider.redirectCount.toLocaleString() }}
          </td>
          <td class="py-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <span class="tabular-nums">{{ (provider.ctr * 100).toFixed(1) }}%</span>
              <UProgress
                :model-value="provider.ctr * 100"
                :max="20"
                size="xs"
                class="w-10"
              />
            </div>
          </td>
          <td class="py-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <span class="font-semibold tabular-nums">{{ (provider.conversionRate * 100).toFixed(1) }}%</span>
              <UProgress
                :model-value="provider.conversionRate * 100"
                :max="50"
                size="xs"
                class="w-10"
                color="success"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Empty State -->
    <div
      v-else
      class="py-8 text-center text-muted"
    >
      Keine Provider-Daten vorhanden
    </div>
  </div>
</template>
