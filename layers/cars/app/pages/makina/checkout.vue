<script setup lang="ts">
import type { Vehicle } from '~/types'
import { useCheckout } from '~/composables/useCheckout'
import CheckoutStepVehicleReview from '~/components/checkout/CheckoutStepVehicleReview.vue'
import CheckoutStepDriverInfo from '~/components/checkout/CheckoutStepDriverInfo.vue'
import CheckoutStepExtras from '~/components/checkout/CheckoutStepExtras.vue'
import CheckoutStepSummary from '~/components/checkout/CheckoutStepSummary.vue'
import CheckoutStepConfirmation from '~/components/checkout/CheckoutStepConfirmation.vue'
import CheckoutPriceSummary from '~/components/checkout/CheckoutPriceSummary.vue'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const localePath = useLocalePath()
const { formatDate } = useFormatDate()
const { calculateRentalDays } = useRentalPricing()
const { trackLeadStarted } = useAnalytics()
const {
  state,
  bookingOptions,
  initializeCheckout,
  loadBookingData,
  nextStep,
  prevStep,
  goToStep,
  customer,
  vehicle,
} = useCheckout()

const vehicleId = computed(() => {
  const id = route.query.vehicle_id ?? route.query.vehicleId
  return id ? parseInt(String(id)) : null
})

const isLoadingVehicle = ref(false)
const { t } = useI18n()

useSeoPage({
  title: () => `${t('checkout.title')} | Krahaso.co`,
  description: () => t('checkout.completeBooking', { count: 5 }),
  noindex: true,
})

const steps = computed(() => [
  { number: 1, title: t('checkout.steps.shortTitles.vehicleReview'), icon: 'i-lucide-truck' },
  { number: 2, title: t('checkout.steps.shortTitles.driverInfo'), icon: 'i-lucide-user' },
  { number: 3, title: t('checkout.steps.shortTitles.extras'), icon: 'i-lucide-sparkles' },
  { number: 4, title: t('checkout.steps.shortTitles.summary'), icon: 'i-lucide-clipboard-check' },
  { number: 5, title: t('checkout.steps.shortTitles.confirmation'), icon: 'i-lucide-check-circle' },
])

async function loadVehicle() {
  if (!vehicleId.value) {
    toast.add({
      title: t('checkout.errors.error'),
      description: t('checkout.errors.noVehicleSelected'),
      color: 'error',
    })
    void router.push(localePath('makina'))
    return
  }

  const startDate = route.query.startDate as string | undefined
  const endDate = route.query.endDate as string | undefined
  const startTime = route.query.startTime as string | undefined
  const endTime = route.query.endTime as string | undefined

  if (!startDate || !endDate || !startTime || !endTime) {
    toast.add({
      title: t('checkout.errors.missingInformation'),
      description: t('checkout.errors.pleaseSelectDates'),
      color: 'error',
    })
    void router.push(localePath('makina'))
    return
  }

  isLoadingVehicle.value = true
  vehicle.resetVehicle()
  customer.resetCustomerForm()

  try {
    const response = await $fetch<{ cars: Vehicle[] }>('/api/cars/search', {
      params: {
        vehicle_id: vehicleId.value,
        startDate,
        endDate,
        startTime,
        endTime,
      },
    })

    if (response.cars.length > 0) {
      const vehicleData = response.cars[0]
      if (!vehicleData) {
        toast.add({
          title: t('checkout.errors.error'),
          description: t('checkout.errors.vehicleNotFound'),
          color: 'error',
        })
        void router.push(localePath('makina'))
        return
      }
      const parsedStartDate = startDate ? new Date(startDate) : null
      const parsedEndDate = endDate ? new Date(endDate) : null

      initializeCheckout(vehicleData, {
        start: parsedStartDate,
        end: parsedEndDate,
      }, {
        start: startTime ?? '',
        end: endTime ?? '',
      })
      await loadBookingData(vehicleData.tenant_id)

      const rentalDaysInfo = calculateRentalDays(startDate, endDate, startTime, endTime)
      const pickupQuery = typeof route.query.pickup === 'string' ? route.query.pickup : null
      const dropoffQuery = typeof route.query.return === 'string' ? route.query.return : null

      trackLeadStarted(String(vehicleData.id), 'car', {
        pagePath: route.path,
        tenantId: vehicleData.tenant_id,
        vehicleMake: vehicleData.make,
        vehicleModel: vehicleData.model,
        vehicleCategory: vehicleData.category ?? null,
        dailyRate: vehicleData.daily_rate,
        pickup: pickupQuery,
        dropoff: dropoffQuery,
        rentalDays: rentalDaysInfo.days,
        checkoutStep: 1,
      })
    } else {
      toast.add({
        title: t('checkout.errors.error'),
        description: t('checkout.errors.vehicleNotFound'),
        color: 'error',
      })
      void router.push(localePath('makina'))
    }
  } catch {
    toast.add({
      title: t('checkout.errors.error'),
      description: t('checkout.errors.failedToLoadVehicle'),
      color: 'error',
    })
    void router.push(localePath('makina'))
  } finally {
    isLoadingVehicle.value = false
  }
}

onMounted(() => {
  void loadVehicle()
})

watch(vehicleId, (newVehicleId, oldVehicleId) => {
  if (newVehicleId && newVehicleId !== oldVehicleId) {
    void loadVehicle()
  }
})

const isStepComplete = (stepNumber: number) => {
  if (stepNumber === 2 && state.value.isCustomerExist) {
    return state.value.step > 3
  }
  return state.value.step > stepNumber
}

const isStepActive = (stepNumber: number) => state.value.step === stepNumber
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ $t('checkout.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ $t('checkout.completeBooking', { count: steps.length }) }}
        </p>
      </div>

      <div
        class="sticky top-(--ui-header-height) z-40 -mx-4 sm:-mx-6 lg:-mx-8 mb-8 flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-4 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          v-for="(step, index) in steps"
          :key="step.number"
          class="flex items-center shrink-0"
        >
          <div class="flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              :disabled="!isStepComplete(step.number - 1) && step.number !== 1"
              :class="[
                'flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-semibold text-xs transition-all',
                isStepActive(step.number)
                  ? 'bg-primary-600 text-white shadow-lg scale-110'
                  : isStepComplete(step.number)
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
              ]"
              @click="goToStep(step.number)"
            >
              <UIcon
                v-if="isStepComplete(step.number) && !isStepActive(step.number)"
                name="i-lucide-check"
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
              />
              <span v-else class="text-[10px] sm:text-xs">{{ step.number }}</span>
            </button>
            <div
              class="text-xs sm:text-sm font-medium max-w-[60px] sm:max-w-none text-center sm:text-left"
            >
              <div
                :class="[
                  isStepActive(step.number)
                    ? 'text-primary-600 dark:text-primary-400'
                    : isStepComplete(step.number)
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500',
                ]"
              >
                {{ step.title }}
              </div>
            </div>
          </div>
          <div
            v-if="index < steps.length - 1"
            :class="[
              'mx-2 sm:mx-3 h-0.5 w-8 sm:w-12 shrink-0',
              isStepComplete(step.number)
                ? 'bg-primary-600 dark:bg-primary-400'
                : 'bg-gray-200 dark:bg-gray-700',
            ]"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8"
          >
            <div
              v-if="isLoadingVehicle || !state.vehicle"
              class="flex items-center justify-center py-16"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="w-8 h-8 animate-spin text-primary mb-3"
              />
              <span class="text-sm text-gray-600 dark:text-gray-400 ml-3">{{
                $t('checkout.loadingVehicle')
              }}</span>
            </div>

            <div v-else>
              <CheckoutStepVehicleReview
                v-if="state.step === 1"
                :vehicle="state.vehicle"
                @next="nextStep"
              />
              <CheckoutStepDriverInfo
                v-else-if="state.step === 2"
                @next="nextStep"
                @back="prevStep"
              />
              <CheckoutStepExtras
                v-else-if="state.step === 3"
                @next="nextStep"
                @back="prevStep"
              />
              <CheckoutStepSummary
                v-else-if="state.step === 4"
                :vehicle="state.vehicle"
                @next="nextStep"
                @back="prevStep"
              />
              <CheckoutStepConfirmation
                v-else-if="state.step === 5"
                :vehicle="state.vehicle"
              />
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8"
          >
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {{ $t('checkout.bookingSummary') }}
            </h3>
            <span class="text-gray-500 dark:text-gray-400">
              {{ $t('carCard.providedBy') }}
              <strong class="text-gray-700 dark:text-gray-300">
                {{ state.vehicle?.company_name }}
              </strong>
            </span>
            <div v-if="!isLoadingVehicle && state.vehicle" class="space-y-4 mt-4">
              <div
                class="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700"
              >
                <img
                  :src="
                    state.vehicle.images ||
                    'https://placehold.co/100x100?text=No+Image'
                  "
                  :alt="state.vehicle.make + ' ' + state.vehicle.model"
                  class="w-20 h-20 object-cover rounded-lg"
                />
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-gray-900 dark:text-white truncate">
                    {{ state.vehicle.make }} {{ state.vehicle.model }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ state.vehicle.year }} ·
                    {{ state.vehicle.category || 'Standard' }}
                  </p>
                </div>
              </div>

              <div
                v-if="state.pickupPoint"
                class="space-y-2 text-sm pb-4 border-b border-gray-200 dark:border-gray-700"
              >
                <div class="flex items-start gap-2">
                  <UIcon
                    name="i-lucide-map-pin"
                    class="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5"
                  />
                  <div class="flex-1 min-w-0">
                    <div
                      v-if="!state.samePickupReturn"
                      class="font-medium text-gray-900 dark:text-white"
                    >
                      {{ state.pickupPoint }} → {{ state.returnPoint }}
                    </div>
                    <div v-else class="font-medium text-gray-900 dark:text-white">
                      {{ state.pickupPoint }}
                    </div>
                  </div>
                </div>
                <div
                  v-if="state.selectedDates.start && state.selectedDates.end"
                  class="flex items-start gap-2 text-gray-600 dark:text-gray-400"
                >
                  <UIcon
                    name="i-lucide-calendar-days"
                    class="w-5 h-5 shrink-0 mt-0.5"
                  />
                  <div>
                    <div>
                      <span class="font-medium">{{ $t('checkout.pickup') }}:</span>
                      {{
                        formatDate(state.selectedDates.start, 'DD MMM YYYY') +
                        ', ' +
                        state.selectedTimes.start
                      }}
                    </div>
                    <div>
                      <span class="font-medium">{{ $t('checkout.return') }}:</span>
                      {{
                        formatDate(state.selectedDates.end, 'DD MMM YYYY') +
                        ', ' +
                        state.selectedTimes.end
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <CheckoutPriceSummary
                :vehicle="state.vehicle"
                :booking-options="bookingOptions"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
