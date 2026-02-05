<script setup lang="ts">
import type { Vehicle } from '~/types'
import { useCarStore } from '../stores/carStore'

const props = defineProps<{
  car: Vehicle
  viewMode?: 'grid' | 'list'
}>()

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { formatPrice } = useFormatPrice()
const { calculateRentalDays, calculateTotalPrice } = useRentalPricing()
const carStore = useCarStore()
const { t } = useI18n()

const effectiveQuery = computed(() => route.query as Record<string, string>)

function handleBookClick(_car: Vehicle) {
  const q = effectiveQuery.value
  if (!q.startDate || !q.endDate || !q.startTime || !q.endTime) return
  const query: Record<string, string> = {
    vehicle_id: props.car.id.toString(),
    startDate: q.startDate,
    endDate: q.endDate,
    startTime: q.startTime,
    endTime: q.endTime,
    pickup: q.pickup || q.location || '',
    return: q.return || q.dropoffLocation || '',
  }
  void router.push({ path: localePath('makina-checkout'), query })
}

const features = computed(() => [
  { icon: 'i-lucide-cog', label: props.car.transmission, title: t('carCard.transmission') },
  { icon: 'i-lucide-fuel', label: props.car.fuel, title: t('carCard.fuelType') },
  { icon: 'i-lucide-users', label: `${props.car.seats} ${t('carCard.seats')}`, title: t('carCard.seatingCapacity') },
  { icon: 'i-lucide-door-open', label: `${props.car.doors} ${t('carCard.doors')}`, title: t('carCard.doors') },
  {
    icon: 'i-lucide-gauge',
    label: props.car.kmPerDay
      ? `${props.car.kmPerDay} ${t('carCard.kmPerDay')}${props.car.pricePerKm ? ` · ${formatPrice(props.car.pricePerKm)}/km` : ''}`
      : t('carCard.noKmLimit'),
    title: t('carCard.dailyKmLimit'),
  },
])

const rentalDaysInfo = computed(() => {
  const q = effectiveQuery.value
  const startDate = q.startDate as string | undefined
  const endDate = q.endDate as string | undefined
  const startTime = q.startTime as string | undefined
  const endTime = q.endTime as string | undefined
  if (!startDate || !endDate) return null
  return calculateRentalDays(startDate, endDate, startTime, endTime)
})

const totalPrice = computed(() => {
  if (!rentalDaysInfo.value) return null
  return calculateTotalPrice(props.car.daily_rate, rentalDaysInfo.value.days)
})

const hasDateSelection = computed(
  () =>
    !!(
      effectiveQuery.value.startDate &&
      effectiveQuery.value.endDate &&
      effectiveQuery.value.startTime &&
      effectiveQuery.value.endTime
    ),
)
</script>

<template>
  <div
    :class="[
      'group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700',
      viewMode === 'list' ? 'flex' : '',
    ]"
  >
    <div
      :class="[
        'relative overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer',
        viewMode === 'list' ? 'w-100 shrink-0' : 'h-64',
      ]"
      @click="handleBookClick(car)"
    >
      <img
        :src="car.images || 'https://placehold.co/600x400?text=No+Image'"
        :alt="car.make + ' ' + car.model"
        class="w-full h-full object-cover scale-98 group-hover:scale-105 transition-transform duration-500"
      >
      <div class="absolute top-3 right-3 flex flex-col gap-2">
        <UBadge
          v-if="car.category"
          color="neutral"
          variant="solid"
          class="shadow-md font-semibold text-gray-900 bg-white/95 backdrop-blur-sm"
        >
          {{ carStore.formatCategoryDisplay(car.category) }}
        </UBadge>
      </div>
    </div>

    <div :class="['flex flex-col', viewMode === 'list' ? 'flex-1 p-6' : 'p-6']">
      <div class="flex-1">
        <div
          :class="[
            'flex justify-between items-start mb-3',
            viewMode === 'list' ? 'flex-row' : 'flex-col sm:flex-row',
          ]"
        >
          <div class="flex-1 min-w-0">
            <h3
              :class="[
                'font-bold text-gray-900 dark:text-white mb-1 truncate',
                viewMode === 'list' ? 'text-2xl' : 'text-xl',
              ]"
            >
              {{ car.make }} {{ car.model }}
            </h3>
            <p class="text-sm text-muted mb-2">
              {{ car.year }} ·
              {{ car.category ? carStore.formatCategoryDisplay(car.category) : t('carCard.standard') }}
            </p>
          </div>
          <div
            :class="[
              'text-right shrink-0',
              viewMode === 'list' ? 'ml-4' : 'mt-2 sm:mt-0',
            ]"
          >
            <div class="flex flex-col items-end gap-0.5">
              <p
                :class="[
                  'font-bold text-primary-600 dark:text-primary-400 leading-tight',
                  viewMode === 'list' ? 'text-2xl' : 'text-xl',
                ]"
              >
                {{ formatPrice(car.daily_rate) }}
                <span class="font-normal text-muted text-sm ml-0.5">
                  {{ t('carCard.perDay') }}
                </span>
              </p>
              <p
                v-if="hasDateSelection && totalPrice && rentalDaysInfo"
                class="text-xs text-muted leading-tight mt-1"
              >
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatPrice(totalPrice) }}</span>
                <span class="text-gray-500"> · {{ rentalDaysInfo.days }} {{ rentalDaysInfo.days === 1 ? t('carCard.day') : t('carCard.days') }}</span>
              </p>
            </div>
          </div>
        </div>

        <div
          :class="[
            'flex flex-wrap gap-4 my-4 text-sm',
            viewMode === 'list' ? 'mb-6' : '',
          ]"
        >
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex items-center gap-2 text-muted"
            :title="feature.title"
          >
            <UIcon :name="feature.icon" class="w-4 h-4 text-gray-400" />
            <span class="font-medium">{{ feature.label }}</span>
          </div>
        </div>

        <div
          v-if="car.company_name"
          class="flex items-center gap-2 mb-4 text-sm"
        >
          <UAvatar
            :src="car.logo_url || ''"
            :alt="car.company_name"
            size="xs"
          />
          <span class="text-muted">
            {{ t('carCard.providedBy') }}
            <strong class="text-gray-700 dark:text-gray-300">{{ car.company_name }}</strong>
          </span>
        </div>
      </div>

      <div
        class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-lucide-shield-check" class="w-4 h-4 shrink-0" />
          <span>{{ t('carCard.verified') }}</span>
        </div>
        <UButton
          color="primary"
          variant="solid"
          trailing-icon="i-lucide-arrow-right"
          :size="viewMode === 'list' ? 'md' : 'sm'"
          class="font-semibold"
          @click="handleBookClick(car)"
        >
          {{ t('carCard.bookNow') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
