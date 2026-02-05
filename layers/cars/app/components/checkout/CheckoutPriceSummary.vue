<script setup lang="ts">
import type { Vehicle, BookingOptions } from '~/types'
import { useCheckout } from '~/composables/useCheckout'
import { useRentalPricing } from '~/composables/useRentalPricing'

const props = defineProps<{
  vehicle: Vehicle
  bookingOptions?: BookingOptions
}>()

useI18n()
const { state } = useCheckout()
const { formatPrice } = useFormatPrice()
const { calculateRentalDays, calculateTotalPrice } = useRentalPricing()

const rentalDaysInfo = computed(() =>
  calculateRentalDays(
    state.value.selectedDates.start,
    state.value.selectedDates.end,
    state.value.selectedTimes.start,
    state.value.selectedTimes.end,
  ),
)

const rentalDays = computed(() => rentalDaysInfo.value.days)

const basePrice = computed(() => {
  const dailyRate = props.vehicle.daily_rate || 0
  return calculateTotalPrice(dailyRate, rentalDays.value)
})

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseFloat(value)
  return 0
}

const totalPrice = computed(() => {
  if (!props.bookingOptions) return basePrice.value
  let total = basePrice.value
  const options = props.bookingOptions
  if (state.value.options.secondDriver && options.second_driver)
    total += toNumber(options.second_driver_price) * rentalDays.value
  if (state.value.options.gps && options.gps_navigation)
    total += toNumber(options.gps_navigation_price) * rentalDays.value
  if (state.value.options.maksikos && options.maksikos)
    total += toNumber(options.maksikos_price) * rentalDays.value
  if (state.value.options.greenCard && options.green_card)
    total += toNumber(options.green_card_price) * rentalDays.value
  if (state.value.options.europeanCard && options.european_card)
    total += toNumber(options.european_card_price) * rentalDays.value
  if (state.value.options.roadAssistance && options.road_assistance)
    total += toNumber(options.road_assistance_price) * rentalDays.value
  if (state.value.options.outOfKosovo && options.out_of_kosovo)
    total += toNumber(options.out_of_kosovo_price) * rentalDays.value
  return total
})

const pricePerDay = computed(() => props.vehicle.daily_rate || 0)

const hasOptions = computed(() =>
  Object.values(state.value.options).some(Boolean),
)
</script>

<template>
  <div class="space-y-2.5 text-sm">
    <div class="flex justify-between items-center">
      <div class="flex flex-col">
        <span class="text-gray-600 dark:text-gray-400">
          {{ rentalDays }}
          {{
            rentalDays === 1
              ? $t('checkout.priceSummary.day')
              : $t('checkout.priceSummary.days')
          }}
          × {{ formatPrice(pricePerDay) }}/{{ $t('checkout.priceSummary.day') }}
        </span>
        <span
          v-if="rentalDaysInfo.hasExtraDay"
          class="text-xs text-primary-600 dark:text-primary-400 mt-0.5 font-medium"
        >
          +1 {{ $t('checkout.priceSummary.day') }} ({{
            Math.round(rentalDaysInfo.extraHours * 10) / 10
          }}h {{ $t('checkout.priceSummary.extraHours') }})
        </span>
      </div>
      <span class="font-semibold text-gray-900 dark:text-white">{{
        formatPrice(basePrice)
      }}</span>
    </div>
    <template v-if="hasOptions && bookingOptions">
      <div
        v-if="state.options.secondDriver && bookingOptions.second_driver"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.secondDriver') }} ({{
            formatPrice(Number(bookingOptions.second_driver_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(
            Number(bookingOptions.second_driver_price || 0) * rentalDays,
          )
        }}</span>
      </div>
      <div
        v-if="state.options.gps && bookingOptions.gps_navigation"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.gpsNavigation') }} ({{
            formatPrice(Number(bookingOptions.gps_navigation_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(
            Number(bookingOptions.gps_navigation_price || 0) * rentalDays,
          )
        }}</span>
      </div>
      <div
        v-if="state.options.maksikos && bookingOptions.maksikos"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.maksikos') }} ({{
            formatPrice(Number(bookingOptions.maksikos_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(Number(bookingOptions.maksikos_price || 0) * rentalDays)
        }}</span>
      </div>
      <div
        v-if="state.options.greenCard && bookingOptions.green_card"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.greenCard') }} ({{
            formatPrice(Number(bookingOptions.green_card_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(
            Number(bookingOptions.green_card_price || 0) * rentalDays,
          )
        }}</span>
      </div>
      <div
        v-if="state.options.europeanCard && bookingOptions.european_card"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.europeanCard') }} ({{
            formatPrice(Number(bookingOptions.european_card_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(
            Number(bookingOptions.european_card_price || 0) * rentalDays,
          )
        }}</span>
      </div>
      <div
        v-if="state.options.roadAssistance && bookingOptions.road_assistance"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.roadAssistance') }} ({{
            formatPrice(Number(bookingOptions.road_assistance_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(
            Number(bookingOptions.road_assistance_price || 0) * rentalDays,
          )
        }}</span>
      </div>
      <div
        v-if="state.options.outOfKosovo && bookingOptions.out_of_kosovo"
        class="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          {{ $t('checkout.steps.extras.outOfKosovo') }} ({{
            formatPrice(Number(bookingOptions.out_of_kosovo_price || 0))
          }}/{{ $t('checkout.priceSummary.day') }})
        </span>
        <span class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{
          formatPrice(
            Number(bookingOptions.out_of_kosovo_price || 0) * rentalDays,
          )
        }}</span>
      </div>
    </template>
    <div
      class="border-t-2 border-gray-300 dark:border-gray-600 pt-3 mt-3 flex justify-between items-center"
    >
      <span
        class="font-semibold text-base sm:text-lg text-gray-900 dark:text-white"
        >{{ $t('checkout.priceSummary.total') }}</span
      >
      <span
        class="font-bold text-lg sm:text-xl text-primary-600 dark:text-primary-400"
        >{{ formatPrice(totalPrice) }}</span
      >
    </div>
  </div>
</template>
