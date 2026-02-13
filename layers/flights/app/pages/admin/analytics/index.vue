<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Flights Analytics - Krahaso Admin'
})

const localePath = useLocalePath()

const days = ref(7)

const { data: overview, status, error, refresh } = await useFetch('/api/admin/analytics/overview', {
  query: computed(() => ({ days: days.value })),
  dedupe: 'cancel',
  retry: 0,
  timeout: 15000
})

const isLoading = computed(() => status.value === 'pending')
const hasError = computed(() => status.value === 'error')
const errorMessage = computed(() => {
  if (!error.value) return null
  return error.value.message || 'Failed to load analytics data.'
})

// Date range options
const dateRangeOptions = [
  { label: 'Heute', value: 1 },
  { label: '7 Tage', value: 7 },
  { label: '30 Tage', value: 30 },
  { label: '90 Tage', value: 90 }
]

// Provider name mapping
const providerNames: Record<string, string> = {
  airprishtina: 'AirPrishtina',
  kosovafly: 'KosovaFly',
  dituria: 'Dituria',
  erifly: 'EriFly',
  airtiketa: 'AirTiketa',
  prishtinaticket: 'Prishtina Ticket',
  flyksa: 'FlyKSA'
}

// Auto-refresh every 300 seconds / 5 mins
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

onMounted(() => {
  refreshInterval.value = setInterval(() => {
    refresh()
  }, 300000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div class="space-y-6">
    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      title="Analytics konnte nicht geladen werden"
      :description="errorMessage || 'Bitte erneut versuchen.'"
    >
      <template #actions>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-refresh-cw"
          size="xs"
          @click="refresh()"
        >
          Erneut laden
        </UButton>
      </template>
    </UAlert>

    <!-- Header -->
    <div
      class="
        flex flex-col gap-4
        md:flex-row md:items-center md:justify-between
      "
    >
      <div>
        <h1 class="text-3xl font-bold">
          Analytics Dashboard
        </h1>
        <p class="mt-1 text-muted">
          Zeitraum: {{ overview?.period?.from }} bis {{ overview?.period?.to }} (UTC)
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

    <!-- Today's Quick Stats -->
    <UCard v-if="overview?.today">
      <div class="mb-4 flex items-center gap-2">
        <UIcon
          name="i-lucide-calendar"
          class="text-primary"
        />
        <span class="font-semibold">Heute</span>
      </div>
      <div
        class="
          grid grid-cols-2 gap-4 text-center
          md:grid-cols-4
        "
      >
        <div>
          <div class="text-2xl font-bold">
            {{ overview.today.searches }}
          </div>
          <div class="text-sm text-muted">
            Suchen
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold">
            {{ overview.today.clicks }}
          </div>
          <div class="text-sm text-muted">
            Clicks
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold">
            {{ overview.today.redirects }}
          </div>
          <div class="text-sm text-muted">
            Redirects
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold text-primary">
            {{ (overview.today.conversionRate * 100).toFixed(1) }}%
          </div>
          <div class="text-sm text-muted">
            Conversion
          </div>
        </div>
      </div>
    </UCard>

    <!-- KPI Cards Grid -->
    <div
      class="
        grid grid-cols-1 gap-4
        md:grid-cols-2
        lg:grid-cols-3
      "
    >
      <KpiCard
        title="Suchen gesamt"
        :value="overview?.searches?.total?.toLocaleString()"
        :change="overview?.searches?.change"
        :trend="overview?.searches?.trend"
        icon="i-lucide-search"
        :loading="isLoading"
        description="Gesamtanzahl aller Flugsuchen im ausgewÃ¤hlten Zeitraum. Umfasst Suchen Ã¼ber die Website und den WhatsApp Bot."
        formula="Web-Suchen + WhatsApp-Suchen"
      >
        <template #footer>
          <div class="flex gap-4 text-xs text-muted">
            <span>Web: {{ overview?.searches?.web ?? 0 }}</span>
            <span>WhatsApp: {{ overview?.searches?.whatsapp ?? 0 }}</span>
          </div>
        </template>
      </KpiCard>

      <KpiCard
        title="Provider Redirects"
        :value="overview?.redirects?.total?.toLocaleString()"
        :change="overview?.redirects?.change"
        :trend="overview?.redirects?.trend"
        icon="i-lucide-external-link"
        :loading="isLoading"
        description="Anzahl der Weiterleitungen zu Provider-Buchungsseiten. Dies ist der wichtigste Conversion-Indikator."
        formula="Klicks auf 'Jetzt buchen' Button"
      >
        <template #footer>
          <div
            v-if="overview?.redirects?.topProvider"
            class="text-xs text-muted"
          >
            Top: {{ providerNames[overview.redirects.topProvider] ?? overview.redirects.topProvider }}
          </div>
        </template>
      </KpiCard>

      <KpiCard
        title="Flight Clicks"
        :value="overview?.clicks?.total?.toLocaleString()"
        :change="overview?.clicks?.change"
        :trend="overview?.clicks?.trend"
        icon="i-lucide-mouse-pointer"
        :loading="isLoading"
        description="Anzahl der Klicks auf Flugkarten in den Suchergebnissen. Zeigt das Nutzerinteresse an spezifischen FlÃ¼gen."
        formula="Summe aller Flugkarten-Klicks"
      >
        <template #footer>
          <div class="text-xs text-muted">
            {{ overview?.clicks?.avgPerSearch?.toFixed(1) ?? 0 }} Clicks pro Suche
          </div>
        </template>
      </KpiCard>

      <KpiCard
        title="Conversion Rate"
        :value="overview?.conversionRate?.formatted"
        :change="overview?.conversionRate?.change"
        :trend="overview?.conversionRate?.trend"
        icon="i-lucide-target"
        :loading="isLoading"
        description="Anteil der Suchen, die zu einem Redirect auf eine Provider-Buchungsseite fÃ¼hren. HÃ¶here Werte bedeuten bessere Nutzer-Konvertierung."
        formula="(Redirects Ã· Suchen) × 100"
      >
        <template #footer>
          <div class="text-xs text-muted">
            {{ overview?.redirects?.total ?? 0 }} Redirects / {{ overview?.searches?.total ?? 0 }} Suchen
          </div>
        </template>
      </KpiCard>

      <KpiCard
        title="WhatsApp Bot"
        :value="overview?.botShare?.formatted"
        :change="overview?.botShare?.change"
        :trend="overview?.botShare?.trend"
        icon="i-lucide-message-circle"
        :loading="isLoading"
        description="Anteil der Suchen, die Ã¼ber den WhatsApp Bot erfolgen. Zeigt die Nutzung des Bot-Kanals im Vergleich zur Website."
        formula="(Bot-Suchen Ã· Gesamt-Suchen) × 100"
      >
        <template #footer>
          <div class="text-xs text-muted">
            {{ overview?.botShare?.totalBotSearches ?? 0 }} Bot-Suchen
          </div>
        </template>
      </KpiCard>

      <KpiCard
        title="Mietwagen-Interesse"
        :value="overview?.rentalInterest?.interestRateFormatted ?? '0%'"
        icon="i-lucide-car"
        :loading="isLoading"
        description="Anteil der Nutzer, die nach der Flugsuche Interesse an einem Mietwagen bekunden."
        formula="(Ja-Antworten Ã· Gesamt-Antworten) × 100"
      >
        <template #footer>
          <div class="flex gap-4 text-xs text-muted">
            <span class="text-success">{{ overview?.rentalInterest?.interested ?? 0 }} Ja</span>
            <span>{{ overview?.rentalInterest?.notInterested ?? 0 }} Nein</span>
          </div>
        </template>
      </KpiCard>
    </div>

    <!-- Two Column Layout -->
    <div
      class="
        grid grid-cols-1 gap-6
        lg:grid-cols-2
      "
    >
      <!-- Top Routes -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-map-pin"
                class="text-primary"
              />
              <h3 class="text-lg font-semibold">
                Top Routen
              </h3>
            </div>
            <UButton
              :to="localePath('/admin/routes')"
              variant="ghost"
              color="neutral"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              Alle Routen
            </UButton>
          </div>
        </template>

        <TopRoutes
          :routes="overview?.topRoutes"
          :loading="isLoading"
          :limit="5"
        />
      </UCard>

      <!-- Provider Performance -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-bar-chart-3"
                class="text-primary"
              />
              <h3 class="text-lg font-semibold">
                Provider Performance
              </h3>
            </div>
          </div>
        </template>

        <ProviderPerformance
          :providers="overview?.providerStats"
          :loading="isLoading"
        />
      </UCard>
    </div>

    <!-- Hot Sold-Out Routes -->
    <UCard v-if="overview?.soldOutRoutes?.length">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-flame"
              class="text-error"
            />
            <h3 class="text-lg font-semibold">
              Hot Routes ohne VerfÃ¼gbarkeit
            </h3>
          </div>
          <UBadge
            color="error"
            variant="soft"
          >
            {{ overview.soldOutRoutes.length }} Routen
          </UBadge>
        </div>
      </template>

      <p class="mb-4 text-sm text-muted">
        Routen mit hoher Nachfrage aber ohne buchbare FlÃ¼ge (ausverkauft oder 0â‚¬ Preis)
      </p>

      <div class="space-y-3">
        <div
          v-for="route in overview.soldOutRoutes"
          :key="`${route.origin}-${route.destination}`"
          class="flex items-center justify-between rounded-lg bg-elevated p-3"
        >
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 font-mono text-sm font-medium">
              <span>{{ route.origin }}</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-muted"
              />
              <span>{{ route.destination }}</span>
            </div>
          </div>
          <div class="flex items-center gap-4 text-sm">
            <div class="text-right">
              <div class="font-semibold text-error">
                {{ route.requestCount }}×
              </div>
              <div class="text-xs text-muted">
                Anfragen
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium">
                ~{{ route.avgSoldOutFlights.toFixed(0) }}
              </div>
              <div class="text-xs text-muted">
                FlÃ¼ge/Suche
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Provider Contacts -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-phone"
              class="text-primary"
            />
            <h3 class="text-lg font-semibold">
              Provider-Kontakte
            </h3>
          </div>
          <div class="flex items-center gap-4 text-sm text-muted">
            <span>{{ overview?.providerContacts?.totalRequests ?? 0 }} Anfragen</span>
            <span class="font-medium text-primary">{{ overview?.providerContacts?.totalClicks ?? 0 }} Klicks</span>
          </div>
        </div>
      </template>

      <ProviderContacts
        :providers="overview?.providerContacts?.byProvider"
        :loading="isLoading"
      />
    </UCard>

    <!-- Channel Distribution -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-pie-chart"
            class="text-primary"
          />
          <h3 class="text-lg font-semibold">
            Kanal-Verteilung
          </h3>
        </div>
      </template>

      <div class="flex items-center justify-center gap-8 py-4">
        <div class="text-center">
          <div class="text-4xl font-bold text-primary">
            {{ overview?.searches?.web ?? 0 }}
          </div>
          <div class="flex items-center gap-1 text-sm text-muted">
            <UIcon
              name="i-lucide-globe"
              class="size-4"
            />
            Web
          </div>
        </div>

        <USeparator
          orientation="vertical"
          class="h-16"
        />

        <div class="text-center">
          <div class="text-4xl font-bold text-success">
            {{ overview?.searches?.whatsapp ?? 0 }}
          </div>
          <div class="flex items-center gap-1 text-sm text-muted">
            <UIcon
              name="i-lucide-message-circle"
              class="size-4"
            />
            WhatsApp
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mt-4">
        <div class="mb-1 flex justify-between text-xs text-muted">
          <span>Web ({{ ((overview?.searches?.web ?? 0) / Math.max(overview?.searches?.total ?? 1, 1) * 100).toFixed(0) }}%)</span>
          <span>WhatsApp ({{ ((overview?.searches?.whatsapp ?? 0) / Math.max(overview?.searches?.total ?? 1, 1) * 100).toFixed(0) }}%)</span>
        </div>
        <div class="flex h-3 overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full bg-primary transition-all"
            :style="{ width: `${(overview?.searches?.web ?? 0) / Math.max(overview?.searches?.total ?? 1, 1) * 100}%` }"
          />
          <div
            class="h-full bg-success transition-all"
            :style="{ width: `${(overview?.searches?.whatsapp ?? 0) / Math.max(overview?.searches?.total ?? 1, 1) * 100}%` }"
          />
        </div>
      </div>
    </UCard>

    <!-- Footer -->
    <div class="text-center text-sm text-muted">
      <ClientOnly>
        <span>Letzte Aktualisierung: {{ new Date().toLocaleTimeString('de-DE') }}</span>
        <template #fallback>
          <span>Letzte Aktualisierung: --:--:--</span>
        </template>
      </ClientOnly>
      <span class="mx-2">|</span>
      Auto-Refresh alle 5 Minuten
    </div>
  </div>
</template>


