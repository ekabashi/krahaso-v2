<script setup lang="ts">
import type { Vehicle } from '~/types'
import { useCheckout } from '~/composables/useCheckout'
import { useBookingStore } from '~/stores/bookingStore'
import { useCarStore } from '~/stores/carStore'

const { vehicle } = defineProps<{
  vehicle: Vehicle
}>()

const emit = defineEmits<{
  next: []
  back: []
}>()

const { state, submitBooking, vehicle: vehicleComposable } = useCheckout()
const { trackLeadSubmitted } = useAnalytics()
const { formatDate } = useFormatDate()
const route = useRoute()
const bookingStore = useBookingStore()
const carStore = useCarStore()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  try {
    const bookingData = submitBooking()
    if (!bookingData) return

    const formData = new FormData()
    formData.append('payload', JSON.stringify(bookingData))
    if (state.value.customerForm.frontIdFile)
      formData.append('frontIdFile', state.value.customerForm.frontIdFile)
    if (state.value.customerForm.backIdFile)
      formData.append('backIdFile', state.value.customerForm.backIdFile)
    if (state.value.customerForm.passportFile)
      formData.append('passportFile', state.value.customerForm.passportFile)
    if (state.value.customerForm.patentShoferFile)
      formData.append(
        'patentShoferFile',
        state.value.customerForm.patentShoferFile,
      )

    const response = await bookingStore.createBooking(formData)
    vehicleComposable.setBookingResponse(response)
    trackLeadSubmitted(String(vehicle.id), 'car', {
      pagePath: route.path,
      tenantId: vehicle.tenant_id,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleCategory: vehicle.category ?? null,
      dailyRate: vehicle.daily_rate,
      pickup: state.value.pickupPoint,
      dropoff: state.value.returnPoint,
      checkoutStep: 5,
      bookingNumber: response.booking_number,
    })

    toast.add({
      title: t('checkout.steps.summary.success'),
      description: t('checkout.steps.summary.successDescription', {
        bookingNumber: response.booking_number,
      }),
      color: 'success',
    })
    emit('next')
  } catch (error: unknown) {
    const responseMessage =
      typeof error === 'object' &&
      error !== null &&
      'data' in error &&
      typeof (error as { data?: { message?: unknown } }).data?.message === 'string'
        ? (error as { data?: { message?: string } }).data?.message
        : error instanceof Error
          ? error.message
          : undefined
    const message = responseMessage ?? 'Failed to create booking'
    toast.add({
      title: t('checkout.steps.summary.error'),
      description: message || t('checkout.steps.summary.errorDescription'),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {{ $t('checkout.steps.summary.title') }}
    </h2>

    <div class="space-y-6">
      <div
        class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ $t('checkout.steps.summary.vehicleDetails') }}
        </h3>
        <span class="text-gray-500 dark:text-gray-400">
          {{ $t('carCard.providedBy') }}
          <strong class="text-gray-700 dark:text-gray-300">{{
            vehicle.company_name
          }}</strong>
        </span>
        <div class="flex gap-4">
          <img
            :src="
              vehicle.images || 'https://placehold.co/150x100?text=No+Image'
            "
            :alt="vehicle.make + ' ' + vehicle.model"
            class="w-32 h-24 object-cover rounded-lg"
          />
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 dark:text-white">
              {{ vehicle.make }} {{ vehicle.model }}
            </h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ vehicle.year }} ·
              {{
                vehicle.category
                  ? carStore.formatCategoryDisplay(vehicle.category)
                  : 'Standard'
              }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ $t('checkout.steps.summary.pickupReturn') }}
        </h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-start gap-2">
            <UIcon
              name="i-lucide-map-pin"
              class="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5"
            />
            <div>
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
                <span class="font-medium">{{
                  $t('checkout.steps.summary.pickup')
                }}:</span>
                {{
                  formatDate(state.selectedDates.start, 'DD MMM YYYY') +
                  ', ' +
                  state.selectedTimes.start
                }}
              </div>
              <div>
                <span class="font-medium">{{
                  $t('checkout.steps.summary.return')
                }}:</span>
                {{
                  formatDate(state.selectedDates.end, 'DD MMM YYYY') +
                  ', ' +
                  state.selectedTimes.end
                }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ $t('checkout.steps.summary.driverInformation') }}
        </h3>
        <div class="space-y-2 text-sm">
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-400">{{
              $t('checkout.steps.summary.name')
            }}:</span>
            <span class="ml-2 text-gray-900 dark:text-white">
              {{ state.customerForm.name }} {{ state.customerForm.surname }}
            </span>
          </div>
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-400">{{
              $t('checkout.steps.summary.email')
            }}:</span>
            <span class="ml-2 text-gray-900 dark:text-white">
              {{ state.customerForm.email }}
            </span>
          </div>
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-400">{{
              $t('checkout.steps.summary.phone')
            }}:</span>
            <span class="ml-2 text-gray-900 dark:text-white">
              {{ state.customerForm.phone }}
            </span>
          </div>
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-400">{{
              $t('checkout.steps.summary.address')
            }}:</span>
            <span class="ml-2 text-gray-900 dark:text-white">
              {{ state.customerForm.address.street }},
              {{ state.customerForm.address.city }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="Object.values(state.options).some(Boolean)"
        class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ $t('checkout.steps.summary.additionalOptions') }}
        </h3>
        <div class="space-y-2 text-sm">
          <div
            v-if="state.options.secondDriver"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.secondDriver') }}</span>
          </div>
          <div
            v-if="state.options.gps"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.gpsNavigation') }}</span>
          </div>
          <div
            v-if="state.options.maksikos"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.maksikos') }}</span>
          </div>
          <div
            v-if="state.options.greenCard"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.greenCard') }}</span>
          </div>
          <div
            v-if="state.options.europeanCard"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.europeanCard') }}</span>
          </div>
          <div
            v-if="state.options.roadAssistance"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.roadAssistance') }}</span>
          </div>
          <div
            v-if="state.options.outOfKosovo"
            class="flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-primary-600" />
            <span>{{ $t('checkout.steps.extras.outOfKosovo') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <UButton variant="outline" type="button" size="lg" @click="emit('back')">
        {{ $t('checkout.steps.summary.back') }}
      </UButton>
      <UButton
        type="button"
        variant="solid"
        color="primary"
        size="lg"
        :loading="loading"
        @click="handleSubmit"
      >
        {{ $t('checkout.steps.summary.confirmBooking') }}
      </UButton>
    </div>
  </div>
</template>
