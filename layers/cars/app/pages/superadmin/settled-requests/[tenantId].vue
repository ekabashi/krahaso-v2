<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useSettlementRequestStore } from '../../../stores/settlementRequestStore'
import type { SettlementRequest } from '~/types'

definePageMeta({
  layout: 'superadmin',
  title: 'Tenant Settlement Requests',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const settlementRequestStore = useSettlementRequestStore()
const toast = useToast()
const { formatDate } = useFormatDate()
const { formatPrice } = useFormatPrice()

const tenantId = computed(() => {
  const id = route.params.tenantId as string | undefined
  if (!id) return null
  const numId = parseInt(id, 10)
  return isNaN(numId) ? null : numId
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
})

const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const selectedRows = ref<string[]>([])
const isSettleModalOpen = ref(false)
const isSettling = ref(false)

const isButtonDisabled = computed(() => selectedRows.value.length === 0)

const selectedRequests = computed(() => {
  return settlementRequestStore.requests.filter((req) =>
    selectedRows.value.includes(req.id)
  )
})

const settlementSummary = computed(() => {
  const requests = selectedRequests.value
  let totalPrice = 0
  let totalFee = 0
  const allBookings: Array<{
    booking_number: string
    vehicle: string
    customer: string
    total_price: number
    fee: number
    transfer_amount: number
  }> = []

  requests.forEach((request) => {
    if (request.bookings && request.bookings.length > 0) {
      request.bookings.forEach((booking) => {
        totalPrice += booking.total_price
        totalFee += booking.fee
        const vehicleText = booking.vehicle
          ? `${booking.vehicle.make} ${booking.vehicle.model}${booking.vehicle.license_plate ? ` (${booking.vehicle.license_plate})` : ''}`
          : '-'
        const customerText = booking.customer
          ? `${booking.customer.name} ${booking.customer.surname}`
          : '-'
        allBookings.push({
          booking_number: booking.booking_number,
          vehicle: vehicleText,
          customer: customerText,
          total_price: booking.total_price,
          fee: booking.fee,
          transfer_amount: booking.total_price - booking.fee,
        })
      })
    }
  })

  return {
    totalPrice,
    totalFee,
    transferAmount: totalPrice - totalFee,
    bookings: allBookings,
    requestCount: requests.length,
  }
})

const openSettleModal = () => {
  if (selectedRows.value.length === 0) {
    toast.add({
      title: t('superadmin.settledRequests.details.errors.title'),
      description: t('superadmin.settledRequests.details.settleModal.noSelection'),
      color: 'warning',
    })
    return
  }
  isSettleModalOpen.value = true
}

const closeSettleModal = () => {
  isSettleModalOpen.value = false
}

const handleSettle = async () => {
  if (selectedRows.value.length === 0) {
    return
  }

  isSettling.value = true
  try {
    const requestIds = [...selectedRows.value]
    const requestsToSettle = [...selectedRequests.value]
    
    await settlementRequestStore.updateRequestStatuses(requestIds, 'completed')

    toast.add({
      title: t('superadmin.settledRequests.details.settleModal.success.title'),
      description: t('superadmin.settledRequests.details.settleModal.success.description', {
        count: requestIds.length,
      }),
      color: 'success',
    })

    selectedRows.value = []
    closeSettleModal()
    await fetchRequests()
  } catch (error) {
    toast.add({
      title: t('superadmin.settledRequests.details.errors.title'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.settledRequests.details.settleModal.error.description'),
      color: 'error',
    })
  } finally {
    isSettling.value = false
  }
}

const fetchRequests = async () => {
  if (!tenantId.value) {
    toast.add({
      title: t('superadmin.settledRequests.details.errors.title'),
      description: t('superadmin.settledRequests.details.errors.tenantIdRequired'),
      color: 'error',
    })
    return
  }

  try {
    await settlementRequestStore.fetchRequestsByTenant(tenantId.value, {
      page: pagination.value.pageIndex + 1,
      limit: pagination.value.pageSize,
    })
  } catch (error) {
    toast.add({
      title: t('superadmin.settledRequests.details.errors.title'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.settledRequests.details.errors.fetchFailed'),
      color: 'error',
    })
  }
}

watch(
  () => pagination.value.pageIndex,
  () => {
    fetchRequests()
  }
)

watch(
  () => pagination.value.pageSize,
  () => {
    pagination.value.pageIndex = 0
    fetchRequests()
  }
)

watch(
  () => route.params.tenantId,
  () => {
    if (tenantId.value) {
      pagination.value.pageIndex = 0
      fetchRequests()
    }
  }
)

watch(
  () => settlementRequestStore.requests,
  () => {
    selectedRows.value = selectedRows.value.filter((id) =>
      settlementRequestStore.requests.some((req) => req.id === id)
    )
  }
)

onMounted(() => {
  if (tenantId.value) {
    fetchRequests()
  } else {
    toast.add({
      title: t('superadmin.settledRequests.details.errors.title'),
      description: t('superadmin.settledRequests.details.errors.tenantIdRequired'),
      color: 'error',
    })
    void router.push(localePath('/superadmin/settled-requests'))
  }
})

const goBack = () => {
  void router.push(localePath('/superadmin/settled-requests'))
}

const tenantInfo = computed(() => {
  const firstRequest = settlementRequestStore.requests[0]
  return firstRequest?.tenant
})

const columns: TableColumn<SettlementRequest>[] = [
  {
    id: 'select',
    header: () => {
      return h(UCheckbox, {
        modelValue: selectedRows.value.length === settlementRequestStore.requests.length && settlementRequestStore.requests.length > 0,
        indeterminate: selectedRows.value.length > 0 && selectedRows.value.length < settlementRequestStore.requests.length,
        'onUpdate:modelValue': (value: boolean) => {
          if (value) {
            selectedRows.value = settlementRequestStore.requests.map((req) => req.id)
          } else {
            selectedRows.value = []
          }
        },
      })
    },
    cell: ({ row }) => {
      const rowId = row.original.id
      return h(UCheckbox, {
        modelValue: selectedRows.value.includes(rowId),
        'onUpdate:modelValue': (value: boolean) => {
          if (value) {
            if (!selectedRows.value.includes(rowId)) {
              selectedRows.value = [...selectedRows.value, rowId]
            }
          } else {
            selectedRows.value = selectedRows.value.filter((id) => id !== rowId)
          }
        },
      })
    },
    meta: {
      class: {
        td: 'w-[50px]',
        th: 'w-[50px]',
      },
    },
  },
  {
    accessorKey: 'status',
    header: t('superadmin.settledRequests.details.table.status'),
    cell: ({ row }) => {
      const status = row.original.status
      const colorMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
        completed: 'success',
        approved: 'success',
        pending: 'warning',
        rejected: 'error',
      }
      const labelMap: Record<string, string> = {
        completed: t('superadmin.settledRequests.details.status.completed'),
        approved: t('superadmin.settledRequests.details.status.approved'),
        pending: t('superadmin.settledRequests.details.status.pending'),
        rejected: t('superadmin.settledRequests.details.status.rejected'),
      }
      return h(UBadge, {
        label: labelMap[status] || status,
        color: colorMap[status] || 'neutral',
        variant: 'solid',
        size: 'md',
      })
    },
    meta: {
      class: {
        td: 'w-[120px]',
      },
    },
  },
  {
    accessorKey: 'booking_numbers',
    header: t('superadmin.settledRequests.details.table.bookingNumbers'),
    cell: ({ row }) => {
      const bookingNumbers = row.original.booking_numbers
      if (!bookingNumbers || bookingNumbers.length === 0) {
        return h('span', { class: 'text-sm text-gray-400' }, '-')
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...bookingNumbers.map((num) =>
          h('code', {
            class: 'text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded',
          }, num)
        ),
      ])
    },
    meta: {
      class: {
        td: 'min-w-[200px]',
      },
    },
  },
  {
    accessorKey: 'vehicle',
    header: t('superadmin.settledRequests.details.table.vehicle'),
    cell: ({ row }) => {
      const bookings = row.original.bookings
      if (!bookings || bookings.length === 0) {
        return h('span', { class: 'text-sm text-gray-400' }, '-')
      }
      
      const vehicles = bookings
        .map((booking) => {
          if (!booking?.vehicle) return null
          const vehicle = booking.vehicle
          return `${vehicle.make} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}`
        })
        .filter((v) => v !== null)
      
      if (vehicles.length === 0) {
        return h('span', { class: 'text-sm text-gray-400' }, '-')
      }
      
      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...vehicles.map((vehicleText) =>
          h('span', {
            class: 'text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded',
          }, vehicleText)
        ),
      ])
    },
    meta: {
      class: {
        td: 'min-w-[200px]',
      },
    },
  },
  {
    accessorKey: 'total_price',
    header: t('superadmin.settledRequests.details.table.totalPrice'),
    cell: ({ row }) => {
      const bookings = row.original.bookings
      if (!bookings || bookings.length === 0) {
        return h('span', { class: 'text-sm text-gray-400' }, '-')
      }
      const total = bookings.reduce((sum, booking) => sum + booking.total_price, 0)
      return h('span', { class: 'font-medium text-gray-900 dark:text-white' }, formatCurrency(total))
    },
    meta: {
      class: {
        td: 'w-[140px] text-right',
      },
    },
  },
  {
    accessorKey: 'fee',
    header: t('superadmin.settledRequests.details.table.fee'),
    cell: ({ row }) => {
      const bookings = row.original.bookings
      if (!bookings || bookings.length === 0) {
        return h('span', { class: 'text-sm text-gray-400' }, '-')
      }
      const totalFee = bookings.reduce((sum, booking) => sum + booking.fee, 0)
      return h('span', { class: 'font-medium text-gray-900 dark:text-white' }, formatCurrency(totalFee))
    },
    meta: {
      class: {
        td: 'w-[140px] text-right',
      },
    },
  },
  {
    accessorKey: 'notes',
    header: t('superadmin.settledRequests.details.table.notes'),
    cell: ({ row }) => {
      const notes = row.original.notes
      return notes
        ? h('span', { class: 'text-sm text-gray-700 dark:text-gray-300' }, notes)
        : h('span', { class: 'text-sm text-gray-400 italic' }, '-')
    },
    meta: {
      class: {
        td: 'min-w-[200px]',
      },
    },
  },
  {
    accessorKey: 'created_at',
    header: t('superadmin.settledRequests.details.table.createdAt'),
    cell: ({ row }) => {
      const date = row.original.created_at
      return h('div', {
        class: 'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400',
      }, [
        h('span', { class: 'i-lucide-calendar size-3.5' }),
        h('span', formatDate(date, 'DD MMM YYYY HH:mm') || '-'),
      ])
    },
    meta: {
      class: {
        td: 'w-[160px]',
      },
    },
  },
]

const table = useTemplateRef('table')
</script>

<template>
  <div class="flex flex-col gap-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div class="flex w-full justify-between items-center gap-4">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          @click="goBack"
        >
          {{ t('superadmin.settledRequests.details.back') }}
        </UButton>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ t('superadmin.settledRequests.details.title') }}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <span v-if="selectedRows.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
            {{ selectedRows.length }} {{ t('superadmin.settledRequests.details.settleModal.table.request') }}(a) {{ t('superadmin.settledRequests.details.settleModal.table.selected') }}
          </span>
          <UButton
            icon="i-heroicons-arrow-right"
            variant="solid"
            color="primary"
            :disabled="isButtonDisabled"
            @click="openSettleModal"
          >
            {{ t('superadmin.settledRequests.details.settleButton') }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="settlementRequestStore.loading" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary-600 mx-auto mb-4" />
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('superadmin.settledRequests.details.loading') }}</p>
    </div>

    <div v-else-if="!settlementRequestStore.loading && settlementRequestStore.requests.length === 0 && settlementRequestStore.total === 0" class="text-center py-12">
      <p class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {{ t('superadmin.settledRequests.details.emptyState.title') }}
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('superadmin.settledRequests.details.emptyState.description', { tenantId: tenantId || '' }) }}
      </p>
    </div>

    <UCard v-else-if="!settlementRequestStore.loading" class="overflow-hidden">
      <UTable
        ref="table"
        v-model:pagination="pagination"
        :data="settlementRequestStore.requests"
        :columns="columns"
        :loading="settlementRequestStore.loading"
        class="w-full"
      >
        <template #empty>
          <div class="text-center py-12">
            <div class="flex flex-col items-center gap-4">
              <div
                class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <UIcon
                  name="i-lucide-file-text"
                  class="size-8 text-gray-400"
                />
              </div>
              <div>
                <p
                  class="text-lg font-medium text-gray-900 dark:text-white mb-1"
                >
                  {{ t('superadmin.settledRequests.details.emptyState.title') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('superadmin.settledRequests.details.emptyState.descriptionGeneric') }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('superadmin.settledRequests.details.pagination.showing') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{
                settlementRequestStore.total === 0
                  ? 0
                  : pagination.pageIndex * pagination.pageSize + 1
              }}
            </span>
            {{ t('superadmin.settledRequests.details.pagination.to') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{
                Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  settlementRequestStore.total
                )
              }}
            </span>
            {{ t('superadmin.settledRequests.details.pagination.of') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ settlementRequestStore.total }}
            </span>
            {{ t('superadmin.settledRequests.details.pagination.requests') }}
          </p>

          <UPagination
            :page="pagination.pageIndex + 1"
            :items-per-page="pagination.pageSize"
            :total="settlementRequestStore.total"
            @update:page="(p) => (pagination.pageIndex = p - 1)"
          />
        </div>
      </template>
    </UCard>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isSettleModalOpen"
          class="fixed inset-0 flex items-center justify-center z-50"
          @click.self="closeSettleModal"
        >
          <div
            class="fixed inset-0 bg-black/50 backdrop-blur-sm"
            @click="closeSettleModal"
          />

          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <UCard
              v-if="isSettleModalOpen"
              class="relative w-full max-w-4xl max-h-[90vh] flex flex-col z-10"
              :ui="{ body: 'flex-1 flex flex-col p-6 overflow-y-auto' }"
            >
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ t('superadmin.settledRequests.details.settleModal.title') }}
                  </h3>
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="closeSettleModal"
                  />
                </div>
              </template>

              <div class="space-y-6 flex-1 min-h-0">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {{ t('superadmin.settledRequests.details.settleModal.description', {
                      count: selectedRequests.length,
                    }) }}
                  </p>
                </div>

                <div v-if="settlementSummary.bookings.length > 0" class="space-y-4">
                  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden overflow-x-auto">
                    <table class="w-full min-w-[800px]">
                      <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {{ t('superadmin.settledRequests.details.settleModal.table.bookingNumber') }}
                          </th>
                          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {{ t('superadmin.settledRequests.details.settleModal.table.vehicle') }}
                          </th>
                          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {{ t('superadmin.settledRequests.details.settleModal.table.customer') }}
                          </th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {{ t('superadmin.settledRequests.details.settleModal.table.totalPrice') }}
                          </th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {{ t('superadmin.settledRequests.details.settleModal.table.fee') }}
                          </th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {{ t('superadmin.settledRequests.details.settleModal.table.transferAmount') }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr
                          v-for="(booking, index) in settlementSummary.bookings"
                          :key="index"
                          class="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            <code class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {{ booking.booking_number }}
                            </code>
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {{ booking.vehicle }}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {{ booking.customer }}
                          </td>
                          <td class="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(booking.total_price) }}
                          </td>
                          <td class="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(booking.fee) }}
                          </td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-primary-600 dark:text-primary-400">
                            {{ formatCurrency(booking.transfer_amount) }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <td colspan="3" class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                            {{ t('superadmin.settledRequests.details.settleModal.table.total') }}
                          </td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                            {{ formatCurrency(settlementSummary.totalPrice) }}
                          </td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                            {{ formatCurrency(settlementSummary.totalFee) }}
                          </td>
                          <td class="px-4 py-3 text-right font-bold text-primary-600 dark:text-primary-400 text-lg">
                            {{ formatCurrency(settlementSummary.transferAmount) }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-primary-900 dark:text-primary-100">
                        {{ t('superadmin.settledRequests.details.settleModal.summary.title') }}
                      </p>
                      <p class="text-xs text-primary-700 dark:text-primary-300 mt-1">
                        {{ t('superadmin.settledRequests.details.settleModal.summary.description') }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {{ formatCurrency(settlementSummary.transferAmount) }}
                      </p>
                      <p class="text-xs text-primary-700 dark:text-primary-300 mt-1">
                        {{ t('superadmin.settledRequests.details.settleModal.summary.transferAmount') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex items-center justify-end gap-3">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    :disabled="isSettling"
                    @click="closeSettleModal"
                  >
                    {{ t('superadmin.settledRequests.details.settleModal.cancel') }}
                  </UButton>
                  <UButton
                    variant="solid"
                    color="primary"
                    :loading="isSettling"
                    @click="handleSettle"
                  >
                    {{ t('superadmin.settledRequests.details.settleModal.confirm') }}
                  </UButton>
                </div>
              </template>
            </UCard>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
