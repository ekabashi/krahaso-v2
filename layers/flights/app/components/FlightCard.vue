<script setup lang="ts">
import type { Flight } from '~/types/flight'
import { useFlightAnalytics } from '../composables/useFlightAnalytics'

const { locale } = useI18n()
const { trackFlightClick, trackProviderRedirect } = useFlightAnalytics()

const props = defineProps<{
  flight: Flight
  expanded?: boolean
  position?: number
  totalResults?: number
}>()

const emit = defineEmits<{
  select: [flight: Flight]
  book: [flight: Flight]
}>()

// Modal state
const showExitModal = ref(false)

// Format duration as "Xh Ym"
const formattedDuration = computed(() => {
  const hours = Math.floor(props.flight.duration / 60)
  const minutes = props.flight.duration % 60
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
})

// Currency formatter (reactive to locale)
const currencyFormatter = computed(() => new Intl.NumberFormat(locale.value, {
  style: 'currency',
  currency: props.flight.currency
}))

// Format price with currency
const formattedPrice = computed(() => {
  return currencyFormatter.value.format(props.flight.totalPrice)
})

// Format base price
const formattedBasePrice = computed(() => {
  return currencyFormatter.value.format(props.flight.basePrice)
})

// Format tax price
const formattedTaxPrice = computed(() => {
  return currencyFormatter.value.format(props.flight.taxPrice)
})

// Seats urgency
const seatsUrgency = computed(() => {
  if (props.flight.seatsAvailable <= 3) return 'error'
  if (props.flight.seatsAvailable <= 10) return 'warning'
  return null
})

// Provider display name
const providerName = computed(() => {
  const names: Record<string, string> = {
    airprishtina: 'AirPrishtina',
    kosovafly: 'KosovaFly',
    dituria: 'Dituria',
    erifly: 'EriFly',
    airtiketa: 'AirTiketa',
    prishtinaticket: 'Prishtina Ticket',
    flyksa: 'FlyKSA'
  }
  return names[props.flight.providerId] || props.flight.providerId
})

// Provider base URL (just homepage, not specific flight)
const providerBaseUrl = computed(() => {
  const urls: Record<string, string> = {
    airprishtina: 'https://www.airprishtina.com',
    kosovafly: 'https://www.kosova-fly.de',
    dituria: 'https://www.dituria.net',
    erifly: 'https://www.erifly.eu',
    airtiketa: 'https://www.airtiketa.com',
    prishtinaticket: 'https://www.prishtinaticket.net',
    flyksa: 'https://www.flyksa.com'
  }
  return urls[props.flight.providerId] || '#'
})

// Provider badge color
type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
const providerColor = computed<BadgeColor>(() => {
  const colors: Record<string, BadgeColor> = {
    airprishtina: 'primary',
    kosovafly: 'success',
    dituria: 'warning',
    erifly: 'info',
    airtiketa: 'secondary',
    prishtinaticket: 'neutral',
    flyksa: 'primary'
  }
  return colors[props.flight.providerId] || 'neutral'
})

// Handle card click - track and emit
function handleCardClick() {
  if (props.position !== undefined && props.totalResults !== undefined) {
    trackFlightClick(props.flight, props.position, props.totalResults, 'card')
  }
  emit('select', props.flight)
}

// Handle opening provider website
function handleOpenProvider() {
  // Track click on book button (before showing modal)
  if (props.position !== undefined && props.totalResults !== undefined) {
    trackFlightClick(props.flight, props.position, props.totalResults, 'price_button')
  }
  showExitModal.value = true
}

// Confirm and open provider (modal stays open)
function confirmOpenProvider() {
  // Track conversion before redirect
  trackProviderRedirect(props.flight)
  window.open(providerBaseUrl.value, '_blank')
  emit('book', props.flight)
}
</script>

<template>
  <UCard
    class="
      cursor-pointer transition-all
      hover:ring-2 hover:ring-primary/50
    "
    @click="handleCardClick"
  >
    <div
      class="
        flex flex-col gap-4
        lg:flex-row lg:items-center lg:justify-between
      "
    >
      <!-- Flight Info -->
      <div
        class="
          flex flex-1 items-center gap-4
          lg:gap-8
        "
      >
        <!-- Airline -->
        <div class="flex min-w-20 flex-col items-center text-center">
          <UBadge
            :color="providerColor"
            variant="subtle"
            size="xs"
            class="order-1 mb-1"
          >
            {{ providerName }}
          </UBadge>
          <p class="order-2 text-sm font-semibold">
            {{ flight.operatingCarrier }}
          </p>
          <p class="order-3 font-mono text-xs text-muted">
            {{ flight.flightNumber }}
          </p>
        </div>

        <!-- Times & Route -->
        <div class="flex flex-1 items-center gap-4">
          <!-- Departure -->
          <div class="text-center">
            <p
              class="
                text-xl font-bold
                lg:text-2xl
              "
            >
              {{ flight.departureTime }}
            </p>
            <p class="text-sm font-medium text-muted">
              {{ flight.origin.code }}
            </p>
          </div>

          <!-- Duration & Stops -->
          <div class="flex flex-1 flex-col items-center px-2">
            <span class="mb-1 text-xs text-muted">{{ formattedDuration }}</span>
            <div class="flex w-full items-center gap-1">
              <div class="h-px flex-1 bg-border" />
              <UIcon
                name="i-lucide-plane"
                class="text-xs text-muted"
              />
              <div class="h-px flex-1 bg-border" />
            </div>
            <span
              v-if="flight.stops === 0"
              class="
                mt-1 text-xs text-green-600
                dark:text-green-400
              "
            >
              {{ $t('flights.direct') }}
            </span>
            <span
              v-else
              class="mt-1 text-xs text-warning"
            >
              {{ $t('flights.stops', flight.stops) }}
            </span>
          </div>

          <!-- Arrival -->
          <div class="text-center">
            <p
              class="
                text-xl font-bold
                lg:text-2xl
              "
            >
              {{ flight.arrivalTime }}
            </p>
            <p class="text-sm font-medium text-muted">
              {{ flight.destination.code }}
            </p>
          </div>
        </div>
      </div>

      <!-- Price & Action -->
      <div
        class="
          flex items-center justify-between gap-4
          lg:min-w-50 lg:justify-end
        "
      >
        <div class="text-center">
          <!-- Sold out -->
          <template v-if="!flight.available">
            <p class="text-xl font-bold text-error">
              {{ $t('flights.soldOut') }}
            </p>
            <UBadge
              color="error"
              size="xs"
              class="mt-1"
            >
              {{ $t('flights.noSeats') }}
            </UBadge>
          </template>

          <!-- Available -->
          <template v-else>
            <p class="text-2xl font-bold text-primary">
              {{ formattedPrice }}
            </p>
            <p class="text-xs text-muted">
              {{ $t('flights.perPerson') }}
            </p>
            <UBadge
              v-if="seatsUrgency"
              :color="seatsUrgency"
              size="xs"
              class="mt-1"
            >
              {{ $t('flights.seats', { n: flight.seatsAvailable }) }}
            </UBadge>
          </template>
        </div>

        <UButton
          icon="i-lucide-external-link"
          size="lg"
          @click.stop="handleOpenProvider"
        >
          {{ $t('flights.toProvider') }}
        </UButton>
      </div>
    </div>

    <!-- Expanded Details -->
    <template v-if="expanded">
      <USeparator class="my-4" />
      <div
        class="
          grid grid-cols-2 gap-4 text-sm
          md:grid-cols-4
        "
      >
        <div>
          <p class="text-muted">
            {{ $t('flights.bookingClass') }}
          </p>
          <p class="font-medium">
            {{ flight.cabinClass }}
          </p>
        </div>
        <div>
          <p class="text-muted">
            {{ $t('flights.aircraft') }}
          </p>
          <p class="font-medium">
            {{ flight.aircraft || $t('flights.tba') }}
          </p>
        </div>
        <div>
          <p class="text-muted">
            {{ $t('flights.basePrice') }}
          </p>
          <p class="font-medium">
            {{ formattedBasePrice }}
          </p>
        </div>
        <div>
          <p class="text-muted">
            {{ $t('flights.taxesFees') }}
          </p>
          <p class="font-medium">
            {{ formattedTaxPrice }}
          </p>
        </div>
      </div>
    </template>
  </UCard>

  <!-- Exit Modal -->
  <UModal
    v-model:open="showExitModal"
    :title="$t('flights.exitModal.title')"
    :description="$t('flights.exitModal.disclaimer', { provider: providerName })"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="bg-neutral/10 rounded-full p-2">
                <UIcon
                  name="i-lucide-external-link"
                  class="text-neutral text-xl"
                />
              </div>
              <h3 class="text-lg font-semibold">
                {{ $t('flights.exitModal.title') }}
              </h3>
            </div>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="showExitModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Disclaimer -->
          <p class="text-sm text-muted">
            {{ $t('flights.exitModal.disclaimer', { provider: providerName }) }}
          </p>

          <!-- Autopika Promo (subtle container) -->
          <div class="rounded-lg border border-default bg-muted/30 p-4">
            <div class="flex items-start gap-3">
              <!-- Car Icon -->
              <div class="shrink-0 rounded-lg bg-primary/10 p-2">
                <UIcon
                  name="i-lucide-car"
                  class="text-xl text-primary"
                />
              </div>

              <div class="flex-1">
                <!-- Headline + Subline -->
                <p class="font-semibold">
                  {{ $t('flights.exitModal.autopika.headline') }}
                </p>
                <p class="mb-2 text-xs text-muted">
                  {{ $t('flights.exitModal.autopika.subline') }}
                </p>

                <!-- Benefits -->
                <ul class="mb-2 space-y-1">
                  <li
                    v-for="benefit in ['local', 'realtime', 'direct']"
                    :key="benefit"
                    class="flex items-center gap-2 text-sm text-muted"
                  >
                    <UIcon
                      name="i-lucide-check"
                      class="shrink-0 text-xs text-primary"
                    />
                    <span>{{ $t(`flights.exitModal.autopika.benefits.${benefit}`) }}</span>
                  </li>
                </ul>

                <!-- Link -->
                <a
                  href="https://www.autopika.al"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="
                    inline-flex items-center gap-1 text-sm font-medium
                    text-primary
                    hover:underline
                  "
                >
                  {{ $t('flights.exitModal.autopika.cta') }}
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="text-xs"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              @click="showExitModal = false"
            >
              {{ $t('flights.close') }}
            </UButton>
            <UButton
              icon="i-lucide-external-link"
              @click="confirmOpenProvider"
            >
              {{ $t('flights.exitModal.continue', { provider: providerName }) }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
