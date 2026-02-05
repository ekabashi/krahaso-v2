<script setup lang="ts">
import type { Vehicle } from '~/types'
import { useCheckout } from '~/composables/useCheckout'
import { useBookingStore } from '~/stores/bookingStore'

defineProps<{
  vehicle: Vehicle
}>()

useI18n()
const { state, resetCheckout } = useCheckout()
const { formatDate } = useFormatDate()
const router = useRouter()
const localePath = useLocalePath()
const bookingStore = useBookingStore()

const bookingNumber = computed(() => {
  const latestBooking = bookingStore.bookings[bookingStore.bookings.length - 1]
  if (latestBooking?.booking_number) return latestBooking.booking_number
  return ''
})

function handleBackToCars() {
  resetCheckout()
  void router.push(localePath('makina'))
}

function handlePrint() {
  if (import.meta.client && typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div class="space-y-6 text-center">
    <div class="flex flex-col items-center">
      <div
        class="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4"
      >
        <UIcon
          name="i-lucide-check-circle"
          class="w-12 h-12 text-primary-600 dark:text-primary-400"
        />
      </div>
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('checkout.steps.confirmation.title') }}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {{ $t('checkout.steps.confirmation.description') }}
      </p>
    </div>

    <div
      class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6 mb-6"
    >
      <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {{ $t('checkout.steps.confirmation.bookingNumber') }}
      </div>
      <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
        {{ bookingNumber }}
      </div>
    </div>

    <div
      class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-left space-y-4"
    >
      <div>
        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('checkout.steps.confirmation.vehicle') }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          {{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.year }})
        </p>
      </div>

      <div>
        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('checkout.steps.confirmation.pickupReturn') }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          <span class="font-medium">{{ state.pickupPoint }}</span>
          <span v-if="!state.samePickupReturn"> → {{ state.returnPoint }}</span>
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
          {{
            formatDate(state.selectedDates.start, 'DD MMM YYYY') +
            ', ' +
            state.selectedTimes.start
          }}
          →
          {{
            formatDate(state.selectedDates.end, 'DD MMM YYYY') +
            ', ' +
            state.selectedTimes.end
          }}
        </p>
      </div>

      <div>
        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('checkout.steps.confirmation.driver') }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          {{ state.customerForm.name }} {{ state.customerForm.surname }}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-500">
          {{ state.customerForm.email }} · {{ state.customerForm.phone }}
        </p>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center pt-6">
      <UButton
        variant="outline"
        size="lg"
        icon="i-lucide-printer"
        @click="handlePrint"
      >
        {{ $t('checkout.steps.confirmation.printConfirmation') }}
      </UButton>
      <UButton
        variant="solid"
        color="primary"
        size="lg"
        @click="handleBackToCars"
      >
        {{ $t('checkout.steps.confirmation.backToCars') }}
      </UButton>
    </div>
  </div>
</template>
