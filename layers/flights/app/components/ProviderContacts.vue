<script setup lang="ts">
interface ProviderContact {
  providerId: string
  requests: number
  webClicks: number
  phoneClicks: number
}

interface Props {
  providers?: ProviderContact[] | null
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
    .sort((a, b) => (b.webClicks + b.phoneClicks) - (a.webClicks + a.phoneClicks))
)

const totalClicks = computed(() =>
  (props.providers ?? []).reduce((sum, p) => sum + p.webClicks + p.phoneClicks, 0)
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
            Anfragen
          </th>
          <th class="py-2 text-right font-medium text-muted">
            <div class="flex items-center justify-end gap-1">
              <UIcon
                name="i-lucide-globe"
                class="size-3.5"
              />
              Web
            </div>
          </th>
          <th class="py-2 text-right font-medium text-muted">
            <div class="flex items-center justify-end gap-1">
              <UIcon
                name="i-lucide-phone"
                class="size-3.5"
              />
              Telefon
            </div>
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
            <span class="font-medium">{{ providerNames[provider.providerId] ?? provider.providerId }}</span>
          </td>
          <td class="py-3 text-right text-muted tabular-nums">
            {{ provider.requests.toLocaleString() }}
          </td>
          <td class="py-3 text-right tabular-nums">
            <div class="flex items-center justify-end gap-2">
              <span class="font-semibold text-primary">{{ provider.webClicks.toLocaleString() }}</span>
              <UProgress
                v-if="totalClicks > 0"
                :model-value="provider.webClicks"
                :max="Math.max(...sortedProviders.map(p => p.webClicks), 1)"
                size="xs"
                class="w-10"
              />
            </div>
          </td>
          <td class="py-3 text-right tabular-nums">
            <div class="flex items-center justify-end gap-2">
              <span class="font-semibold text-success">{{ provider.phoneClicks.toLocaleString() }}</span>
              <UProgress
                v-if="totalClicks > 0"
                :model-value="provider.phoneClicks"
                :max="Math.max(...sortedProviders.map(p => p.phoneClicks), 1)"
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
      Keine Kontaktanfragen vorhanden
    </div>
  </div>
</template>
