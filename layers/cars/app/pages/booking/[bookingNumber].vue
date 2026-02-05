<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { formatDate } = useFormatDate()
const { t } = useI18n()
const localePath = useLocalePath()

const bookingNumber = computed(() => route.params.bookingNumber as string)

type BookingDetail = {
  id: number
  booking_number: string
  status: string
  total_price: number
  startDateTime: string
  endDateTime: string
  pickupPoint: string
  returnPoint: string
  description: string | null
  vehicle_price: string
  options?: Record<string, boolean>
  vehicles: {
    id: number
    make: string
    model: string
    year: number
    images: string | null
    category: string | null
  } | null
  customers: {
    id: number
    name: string
    surname: string
    email: string
    phone: string
    address: Record<string, unknown>
  } | null
}

const booking = ref<BookingDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

function opts(booking: BookingDetail): Record<string, boolean> {
  const o = booking.options ?? {}
  return {
    secondDriver: o.secondDriver ?? (o as Record<string, boolean>).second_driver ?? false,
    gps: o.gps ?? (o as Record<string, boolean>).gps_navigation ?? false,
    maksikos: o.maksikos ?? false,
    greenCard: o.greenCard ?? (o as Record<string, boolean>).green_card ?? false,
    europeanCard: o.europeanCard ?? (o as Record<string, boolean>).european_card ?? false,
    roadAssistance: o.roadAssistance ?? (o as Record<string, boolean>).road_assistance ?? false,
    outOfKosovo: o.outOfKosovo ?? (o as Record<string, boolean>).out_of_kosovo ?? false,
  }
}

onMounted(async () => {
  if (!bookingNumber.value) {
    error.value = t('booking.bookingNumberRequired')
    loading.value = false
    return
  }

  try {
    const data = await $fetch<BookingDetail>(`/api/bookings/${bookingNumber.value}`)
    booking.value = data
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('booking.failedToLoad')
    toast.add({
      title: t('booking.error'),
      description: error.value,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
})

function handleBack() {
  void router.push(localePath('/'))
}

function handlePrint() {
  if (import.meta.client && typeof window !== 'undefined') {
    window.print()
  }
}

type BadgeColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

const statusColors: Record<string, BadgeColor> = {
  upcoming: 'info',
  active: 'success',
  completed: 'neutral',
  cancelled: 'error',
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 print:bg-white">
    <UContainer class="py-8 print:py-0 print:max-w-none print:px-0">
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-700 dark:text-gray-300 print-hidden"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="w-10 h-10 animate-spin text-primary-500"
        />
        <span class="text-sm font-medium">{{ t('booking.loadingDetails') }}</span>
      </div>

      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 print-hidden"
      >
        <UIcon
          name="i-lucide-alert-circle"
          class="w-12 h-12 text-red-500"
        />
        <div class="space-y-2 max-w-md">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ t('booking.notFound') }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            {{ error }}
          </p>
        </div>
        <UButton
          color="primary"
          size="md"
          icon="i-lucide-home"
          @click="handleBack"
        >
          {{ t('booking.goBackHome') }}
        </UButton>
      </div>

      <div
        v-else-if="booking"
        class="max-w-5xl mx-auto space-y-6 print:max-w-none print:px-6"
      >
        <div class="flex items-center justify-between gap-3 print-hidden">
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-arrow-left"
            size="md"
            class="print-hidden"
            @click="handleBack"
          >
            {{ t('booking.back') }}
          </UButton>
          <UBadge
            :color="statusColors[booking.status] || 'neutral'"
            variant="solid"
            size="lg"
            class="print-hidden"
          >
            {{ booking.status.toUpperCase() }}
          </UBadge>
        </div>

        <div class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('booking.bookingNumber') }}
              </p>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ booking.booking_number }}
              </h1>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('booking.pricing') }}
              </p>
              <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
                €{{ booking.total_price.toFixed(2) }}
              </p>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-400">
            {{ t('booking.details') }}
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
          <div class="lg:col-span-2 space-y-6">
            <div class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <div class="p-6 space-y-4">
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ t('booking.vehicleInformation') }}
                  </h2>
                  <div class="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span v-if="booking.vehicles?.year">{{ booking.vehicles?.year }}</span>
                    <span v-if="booking.vehicles?.category">• {{ booking.vehicles?.category }}</span>
                  </div>
                </div>

                <div
                  v-if="booking.vehicles"
                  class="space-y-4"
                >
                  <img
                    :src="booking.vehicles.images || 'https://placehold.co/800x400?text=No+Image'"
                    :alt="`${booking.vehicles.make} ${booking.vehicles.model}`"
                    class="w-full h-64 object-cover rounded-xl border border-gray-100 dark:border-gray-800 print:h-52"
                  >
                  <div>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">
                      {{ booking.vehicles.make }} {{ booking.vehicles.model }}
                    </p>
                  </div>
                </div>
                <div
                  v-else
                  class="text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ t('booking.vehicleNotAvailable') }}
                </div>
              </div>
            </div>

            <div class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <div class="p-6 space-y-4">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ t('booking.pickupReturnDetails') }}
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <p class="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                      {{ t('booking.pickup') }}
                    </p>
                    <p class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ booking.pickupPoint }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(booking.startDateTime, 'DD MMM YYYY, HH:mm') }}
                    </p>
                  </div>
                  <div class="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <p class="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                      {{ t('booking.return') }}
                    </p>
                    <p class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ booking.returnPoint }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(booking.endDateTime, 'DD MMM YYYY, HH:mm') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="booking && Object.values(opts(booking)).some(Boolean)"
              class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm"
            >
              <div class="p-6 space-y-4">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ t('booking.additionalOptions') }}
                </h2>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-if="opts(booking).secondDriver"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.secondDriver') }}
                  </UBadge>
                  <UBadge
                    v-if="opts(booking).gps"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.gpsNavigation') }}
                  </UBadge>
                  <UBadge
                    v-if="opts(booking).maksikos"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.maksikos') }}
                  </UBadge>
                  <UBadge
                    v-if="opts(booking).greenCard"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.greenCard') }}
                  </UBadge>
                  <UBadge
                    v-if="opts(booking).europeanCard"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.europeanCard') }}
                  </UBadge>
                  <UBadge
                    v-if="opts(booking).roadAssistance"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.roadAssistance') }}
                  </UBadge>
                  <UBadge
                    v-if="opts(booking).outOfKosovo"
                    color="primary"
                    variant="soft"
                    size="md"
                  >
                    {{ t('checkout.steps.extras.outOfKosovo') }}
                  </UBadge>
                </div>
              </div>
            </div>

            <div
              v-if="booking.description"
              class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm"
            >
              <div class="p-6 space-y-3">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ t('booking.description') }}
                </h2>
                <p class="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {{ booking.description }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <div class="p-6 space-y-4">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ t('booking.customerInformation') }}
                </h2>
                <div
                  v-if="booking.customers"
                  class="space-y-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div>
                    <p class="text-xs uppercase text-gray-500 dark:text-gray-400">
                      {{ t('booking.name') }}
                    </p>
                    <p class="font-semibold text-gray-900 dark:text-white">
                      {{ booking.customers.name }} {{ booking.customers.surname }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs uppercase text-gray-500 dark:text-gray-400">
                      {{ t('booking.email') }}
                    </p>
                    <p class="break-all">
                      {{ booking.customers.email }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs uppercase text-gray-500 dark:text-gray-400">
                      {{ t('booking.phone') }}
                    </p>
                    <p>{{ booking.customers.phone }}</p>
                  </div>
                  <div v-if="booking.customers.address">
                    <p class="text-xs uppercase text-gray-500 dark:text-gray-400">
                      {{ t('booking.address') }}
                    </p>
                    <p>
                      {{
                        typeof booking.customers.address === 'object' &&
                        booking.customers.address !== null &&
                        'street' in booking.customers.address &&
                        'city' in booking.customers.address
                          ? `${(booking.customers.address as { street: string; city: string }).street}, ${(booking.customers.address as { street: string; city: string }).city}`
                          : ''
                      }}
                    </p>
                  </div>
                </div>
                <div
                  v-else
                  class="text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ t('booking.customerNotAvailable') }}
                </div>
              </div>
            </div>

            <div class="card bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <div class="p-6 space-y-3">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ t('booking.pricing') }}
                  </h2>
                </div>
                <div class="space-y-2 text-gray-700 dark:text-gray-300">
                  <div class="flex justify-between text-sm">
                    <span>{{ t('booking.dailyRate') }}</span>
                    <span class="font-medium">€{{ parseFloat(booking.vehicle_price || '0').toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between text-base font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span>{{ t('booking.totalPrice') }}</span>
                    <span class="text-primary-600 dark:text-primary-400">€{{ booking.total_price.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-center pt-4 print-hidden">
          <UButton
            variant="outline"
            size="lg"
            icon="i-lucide-printer"
            class="flex-1 sm:flex-none min-w-[200px]"
            @click="handlePrint"
          >
            {{ t('booking.printBooking') }}
          </UButton>
          <UButton
            variant="solid"
            color="primary"
            size="lg"
            icon="i-lucide-home"
            class="flex-1 sm:flex-none min-w-[200px]"
            @click="handleBack"
          >
            {{ t('booking.backToHome') }}
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4;
    margin: 0.5cm;
  }

  :global(body),
  :global(html) {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 11pt !important;
  }

  .print-hidden {
    display: none !important;
  }

  .card {
    box-shadow: none !important;
    border-color: #e5e7eb !important;
    border-width: 1px !important;
    page-break-inside: avoid !important;
    margin-bottom: 0.5rem !important;
    padding: 0.75rem !important;
  }

  .card,
  .card * {
    color: #111827 !important;
    background: white !important;
  }

  h1 {
    font-size: 1.5rem !important;
    margin-bottom: 0.25rem !important;
  }

  h2 {
    font-size: 1.1rem !important;
    margin-bottom: 0.5rem !important;
  }

  h3 {
    font-size: 1rem !important;
  }

  p,
  span,
  div {
    font-size: 0.85rem !important;
    line-height: 1.3 !important;
  }

  img {
    max-height: 120px !important;
    object-fit: cover !important;
    margin-bottom: 0.5rem !important;
  }

  .space-y-6 > * + * {
    margin-top: 0.75rem !important;
  }

  .space-y-4 > * + * {
    margin-top: 0.5rem !important;
  }

  .space-y-3 > * + * {
    margin-top: 0.375rem !important;
  }

  .p-6 {
    padding: 0.75rem !important;
  }

  .gap-6 {
    gap: 0.75rem !important;
  }

  .gap-4 {
    gap: 0.5rem !important;
  }

  .gap-3 {
    gap: 0.375rem !important;
  }

  .gap-2 {
    gap: 0.25rem !important;
  }

  .rounded-2xl,
  .rounded-xl {
    border-radius: 0.25rem !important;
  }

  .grid {
    gap: 0.5rem !important;
  }

  .flex {
    gap: 0.375rem !important;
  }

  :global(header),
  :global(nav),
  :global(footer) {
    display: none !important;
  }
}
</style>
