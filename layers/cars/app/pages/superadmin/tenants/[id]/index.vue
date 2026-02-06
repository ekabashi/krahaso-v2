<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TenantBookingStats } from '../../../../types'
import { useTenantStore } from '../../../../stores/tenantStore'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const toast = useToast()
const { t } = useI18n()
const { formatDate } = useFormatDate()

useHead({
  title: computed(() => t('superadmin.tenants.details.title')),
})

const tenantId = computed(() => Number(route.params.id))
const stats = ref<TenantBookingStats | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    loading.value = true
    stats.value = await tenantStore.fetchTenantStats(tenantId.value)
  } catch (error) {
    toast.add({
      title: t('superadmin.tenants.details.error.title'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.tenants.details.error.failedToLoad'),
      color: 'error',
    })
    router.push(localePath('/superadmin/tenants'))
  } finally {
    loading.value = false
  }
})

const handleReconcile = () => {
  router.push(localePath(`/superadmin/tenants/${tenantId.value}/reconcile`))
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

const getStatusColor = (
  status: string
): 'success' | 'warning' | 'error' | 'neutral' => {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    completed: 'success',
    upcoming: 'warning',
    active: 'success',
    cancelled: 'error',
  }
  return colors[status] || 'neutral'
}

type BookingData = TenantBookingStats['bookings'][number]

const columns = computed<TableColumn<BookingData>[]>(() => [
  {
    accessorKey: 'booking_number',
    header: t('superadmin.tenants.details.table.bookingNumber'),
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-hash size-4 text-gray-400' }),
        h(
          'code',
          {
            class:
              'text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded',
          },
          row.original.booking_number
        ),
      ])
    },
  },
  {
    accessorKey: 'vehicle',
    header: t('superadmin.tenants.details.table.vehicle'),
    cell: ({ row }) => {
      const vehicle = row.original.vehicle
      return h('div', { class: 'flex flex-col' }, [
        h(
          'span',
          { class: 'font-medium text-gray-900 dark:text-white' },
          `${vehicle.make} ${vehicle.model}`
        ),
        h(
          'span',
          { class: 'text-xs text-gray-500 dark:text-gray-400' },
          vehicle.year.toString()
        ),
      ])
    },
  },
  {
    accessorKey: 'customer',
    header: t('superadmin.tenants.details.table.customer'),
    cell: ({ row }) => {
      const customer = row.original.customer
      return h('div', { class: 'flex flex-col' }, [
        h(
          'span',
          { class: 'font-medium text-gray-900 dark:text-white' },
          `${customer.name} ${customer.surname}`
        ),
        h(
          'span',
          { class: 'text-xs text-gray-500 dark:text-gray-400' },
          customer.email
        ),
      ])
    },
  },
  {
    accessorKey: 'startDateTime',
    header: t('superadmin.tenants.details.table.rentalPeriod'),
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col text-sm' }, [
        h(
          'div',
          {
            class: 'flex items-center gap-1.5 text-gray-600 dark:text-gray-300',
          },
          [
            h('span', { class: 'i-lucide-calendar size-3.5' }),
            h('span', {}, formatDate(row.original.startDateTime, 'DD MMM YYYY HH:mm') || '-'),
          ]
        ),
        h(
          'div',
          {
            class: 'flex items-center gap-1.5 text-gray-600 dark:text-gray-300',
          },
          [
            h('span', { class: 'i-lucide-calendar size-3.5' }),
            h('span', {}, formatDate(row.original.endDateTime, 'DD MMM YYYY HH:mm') || '-'),
          ]
        ),
      ])
    },
  },
  {
    accessorKey: 'total_price',
    header: t('superadmin.tenants.details.table.totalPrice'),
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'font-semibold text-gray-900 dark:text-white' },
        formatCurrency(row.original.total_price)
      )
    },
  },
  {
    accessorKey: 'status',
    header: t('superadmin.tenants.details.table.status'),
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      return h(
        UBadge,
        {
          color: getStatusColor(row.original.status),
          variant: 'subtle',
          class: 'capitalize',
        },
        () => row.original.status
      )
    },
  },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Back Button -->
    <div>
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        :label="$t('superadmin.tenants.details.backToTenants')"
        @click="router.push(localePath('/superadmin/tenants'))"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-4">
        <UIcon
          name="i-lucide-loader-2"
          class="size-10 text-primary-600 dark:text-primary-400 animate-spin"
        />
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ $t('superadmin.tenants.details.loadingStatistics') }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="stats">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{
              stats.tenant.company_name ||
              stats.tenant.name ||
              $t('superadmin.tenants.details.title')
            }}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{
              $t('superadmin.tenants.details.partnershipStatistics', {
                percentage: stats.percentage,
              })
            }}
          </p>
        </div>
        <div>
          <UButton
            icon="i-lucide-wallet"
            color="primary"
            variant="solid"
            :label="$t('superadmin.tenants.details.reconcile')"
            @click="handleReconcile"
          />
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Bookings -->
        <UCard>
          <div class="flex items-center gap-4">
            <div
              class="flex items-center justify-center size-12 rounded-lg bg-blue-100 dark:bg-blue-900/20"
            >
              <UIcon
                name="i-lucide-calendar-check"
                class="size-6 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('superadmin.tenants.details.totalBookings') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.totalBookings }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Total Revenue -->
        <UCard>
          <div class="flex items-center gap-4">
            <div
              class="flex items-center justify-center size-12 rounded-lg bg-green-100 dark:bg-green-900/20"
            >
              <UIcon
                name="i-lucide-euro"
                class="size-6 text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('superadmin.tenants.details.totalRevenue') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(stats.totalRevenue) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Marketplace Share -->
        <UCard>
          <div class="flex items-center gap-4">
            <div
              class="flex items-center justify-center size-12 rounded-lg bg-purple-100 dark:bg-purple-900/20"
            >
              <UIcon
                name="i-lucide-trending-up"
                class="size-6 text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('superadmin.tenants.details.marketplaceShare') }} ({{
                  stats.percentage
                }}%)
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(stats.marketplaceShare) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Tenant Share -->
        <UCard>
          <div class="flex items-center gap-4">
            <div
              class="flex items-center justify-center size-12 rounded-lg bg-orange-100 dark:bg-orange-900/20"
            >
              <UIcon
                name="i-lucide-wallet"
                class="size-6 text-orange-600 dark:text-orange-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('superadmin.tenants.details.tenantShare') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(stats.tenantShare) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Bookings Table -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t('superadmin.tenants.details.autopikaBookings') }}
            </h2>
            <UBadge color="primary" variant="subtle">
              {{ stats.bookings.length }}
              {{
                stats.bookings.length === 1
                  ? $t('superadmin.tenants.details.booking')
                  : $t('superadmin.tenants.details.bookings')
              }}
            </UBadge>
          </div>
        </template>

        <UTable :data="stats.bookings" :columns="columns">
          <template #empty>
            <div class="text-center py-12">
              <div class="flex flex-col items-center gap-4">
                <div
                  class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
                >
                  <UIcon name="i-lucide-inbox" class="size-8 text-gray-400" />
                </div>
                <div>
                  <p
                    class="text-lg font-medium text-gray-900 dark:text-white mb-1"
                  >
                    {{
                      $t(
                        'superadmin.tenants.details.emptyState.noBookingsFound'
                      )
                    }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{
                      $t(
                        'superadmin.tenants.details.emptyState.noBookingsDescription'
                      )
                    }}
                  </p>
                </div>
              </div>
            </div>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>
