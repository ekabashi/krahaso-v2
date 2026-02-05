<script setup lang="ts">
import type { SuperadminBooking } from '~/types'

definePageMeta({
  layout: 'superadmin',
  title: 'Bookings',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const toast = useToast()
const { formatDate } = useFormatDate()
const bookingStore = useSuperadminBookingStore()
const localePath = useLocalePath()

const getStatusColor = (
  status: string | null,
): 'success' | 'warning' | 'error' | 'neutral' => {
  if (!status) return 'neutral'
  const normalized = status.toLowerCase()
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    completed: 'success',
    settled: 'success',
    active: 'success',
    upcoming: 'warning',
    pending: 'warning',
    cancelled: 'error',
  }
  return colors[normalized] ?? 'neutral'
}

const getStatusLabel = (status: string | null) => {
  if (!status) return t('superadmin.bookings.status.unknown')
  const normalized = status.toLowerCase()
  if (['completed', 'settled', 'active', 'upcoming', 'cancelled'].includes(normalized)) {
    return t(`superadmin.bookings.status.${normalized}`)
  }
  return status
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const bookings = computed(() => bookingStore.allBookings)
const pending = computed(() => bookingStore.loading)
const error = computed(() => bookingStore.error)

onMounted(async () => {
  try {
    await bookingStore.fetchBookings()
  } catch (err: unknown) {
    const e = err as { status?: number; statusCode?: number }
    if (e?.status === 401 || e?.statusCode === 401) {
      const authStore = useAuthStore()
      authStore.clear()
      navigateTo(localePath('/superadmin/login'))
      return
    }
    if (bookingStore.error) {
      toast.add({
        title: t('superadmin.bookings.error.fetchFailed'),
        description: bookingStore.error,
        color: 'error',
      })
    }
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('superadmin.bookings.title') }}
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ t('superadmin.bookings.subtitle') }}
      </p>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-4">
        <UIcon
          name="i-lucide-loader-2"
          class="size-10 text-primary-600 dark:text-primary-400 animate-spin"
        />
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('superadmin.bookings.loading') }}
        </p>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="flex flex-col items-center gap-4">
        <div
          class="flex items-center justify-center size-16 rounded-full bg-red-100 dark:bg-red-900/20"
        >
          <UIcon name="i-lucide-alert-circle" class="size-8 text-red-500" />
        </div>
        <div>
          <p class="text-lg font-medium text-red-600 dark:text-red-400 mb-1">
            {{ t('superadmin.bookings.error.fetchFailed') }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ String(error) }}
          </p>
        </div>
      </div>
    </div>

    <UCard v-else class="overflow-hidden">
      <div v-if="!bookings.length" class="text-center py-12">
        <div class="flex flex-col items-center gap-4">
          <div
            class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <UIcon name="i-lucide-inbox" class="size-8 text-gray-400" />
          </div>
          <div>
            <p class="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {{ t('superadmin.bookings.empty.title') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('superadmin.bookings.empty.description') }}
            </p>
          </div>
        </div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ t('superadmin.bookings.table.bookingNumber') }}
              </th>
              <th class="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ t('superadmin.bookings.table.tenant') }}
              </th>
              <th class="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ t('superadmin.bookings.table.status') }}
              </th>
              <th class="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ t('superadmin.bookings.table.totalPrice') }}
              </th>
              <th class="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ t('superadmin.bookings.table.fee') }}
              </th>
              <th class="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ t('superadmin.bookings.table.rentalPeriod') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in bookings"
              :key="booking.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                {{ booking.booking_number }}
              </td>
              <td class="py-3 px-4">
                <UBadge
                  v-if="booking.tenant"
                  variant="subtle"
                  color="neutral"
                  size="md"
                >
                  {{
                    booking.tenant.company_name ||
                    booking.tenant.name ||
                    booking.tenant.subdomain ||
                    `Tenant #${booking.tenant.id}`
                  }}
                </UBadge>
                <span v-else>-</span>
              </td>
              <td class="py-3 px-4">
                <UBadge
                  :color="getStatusColor(booking.status)"
                  variant="subtle"
                  size="md"
                  class="capitalize"
                >
                  {{ getStatusLabel(booking.status) }}
                </UBadge>
              </td>
              <td class="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(booking.total_price) }}
              </td>
              <td class="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(booking.fee) }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                <div class="flex flex-col">
                  <span>{{ formatDate(booking.startDateTime, 'DD MMM YYYY HH:mm') || '-' }}</span>
                  <span>{{ formatDate(booking.endDateTime, 'DD MMM YYYY HH:mm') || '-' }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
