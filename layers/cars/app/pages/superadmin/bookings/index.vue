<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { SuperadminBooking } from '../../../types'  
import { useAuthStore } from '../../../stores/authStore'
import { useSuperadminBookingStore } from '../../../stores/superadminBookingStore'

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

const UBadge = resolveComponent('UBadge')

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
  if (
    ['completed', 'settled', 'active', 'upcoming', 'cancelled', 'confirmed', 'pending'].includes(
      normalized,
    )
  ) {
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

const columns: TableColumn<SuperadminBooking>[] = [
  {
    accessorKey: 'booking_number',
    header: () => {
      return h(
        'span',
        { class: 'font-semibold text-gray-900 dark:text-white' },
        t('superadmin.bookings.table.bookingNumber'),
      )
    },
    cell: ({ row }) => {
      const booking = row.original
      return h(
        'span',
        { class: 'font-semibold text-gray-900 dark:text-white' },
        booking.booking_number,
      )
    },
    meta: {
      class: {
        td: 'min-w-[180px]',
      },
    },
  },
  {
    accessorKey: 'tenant',
    header: t('superadmin.bookings.table.tenant'),
    cell: ({ row }) => {
      const booking = row.original
      const tenantName = booking.tenant
        ? booking.tenant.company_name ||
          booking.tenant.name ||
          booking.tenant.subdomain ||
          `Tenant #${booking.tenant.id}`
        : '-'
      return h(
        UBadge,
        {
          variant: 'subtle',
          color: 'neutral',
          size: 'md',
        },
        () => tenantName,
      )
    },
    meta: {
      class: {
        td: 'min-w-[200px]',
      },
    },
  },
  {
    accessorKey: 'status',
    header: t('superadmin.bookings.table.status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string | null
      return h(
        UBadge,
        {
          class: 'capitalize',
          variant: 'subtle',
          color: getStatusColor(status),
          size: 'md',
        },
        () => getStatusLabel(status),
      )
    },
    meta: {
      class: {
        td: 'w-[140px]',
      },
    },
  },
  {
    accessorKey: 'total_price',
    header: t('superadmin.bookings.table.totalPrice'),
    cell: ({ row }) => {
      const price = row.getValue('total_price') as number
      return h(
        'span',
        { class: 'font-medium text-gray-900 dark:text-white' },
        formatCurrency(price),
      )
    },
    meta: {
      class: {
        td: 'w-[140px] text-right',
      },
    },
  },
  {
    accessorKey: 'fee',
    header: t('superadmin.bookings.table.fee'),
    cell: ({ row }) => {
      const fee = row.getValue('fee') as number
      return h(
        'span',
        { class: 'font-medium text-gray-900 dark:text-white' },
        formatCurrency(fee),
      )
    },
    meta: {
      class: {
        td: 'w-[140px] text-right',
      },
    },
  },
  {
    accessorKey: 'startDateTime',
    header: t('superadmin.bookings.table.rentalPeriod'),
    cell: ({ row }) => {
      const booking = row.original
      return h(
        'div',
        { class: 'flex flex-col text-sm text-gray-600 dark:text-gray-400' },
        [
          h('span', formatDate(booking.startDateTime, 'DD MMM YYYY HH:mm') || '-'),
          h('span', formatDate(booking.endDateTime, 'DD MMM YYYY HH:mm') || '-'),
        ],
      )
    },
    meta: {
      class: {
        td: 'min-w-[220px]',
      },
    },
  },
]

const table = useTemplateRef('table')
const globalFilter = ref('')
const selectedStatus = ref<string | undefined>(undefined)
const selectedPartner = ref<string | number | undefined>(undefined)
const sorting = ref([{ id: 'startDateTime', desc: true }])
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
})

const isReportModalOpen = ref(false)
const reportTenant = ref<number | string | undefined>(undefined)
const reportStatus = ref<string | undefined>(undefined)
const reportStartDate = ref('')
const reportEndDate = ref('')
const isGeneratingReport = ref(false)

const uniquePartners = computed(() => {
  const partnersMap = new Map<number, { id: number; name: string }>()
  ;(bookings.value || []).forEach((booking) => {
    if (booking.tenant) {
      const tenantId = booking.tenant.id
      if (!partnersMap.has(tenantId)) {
        const tenantName =
          booking.tenant.company_name ||
          booking.tenant.name ||
          booking.tenant.subdomain ||
          `Tenant #${tenantId}`
        partnersMap.set(tenantId, { id: tenantId, name: tenantName })
      }
    }
  })
  return Array.from(partnersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const partnerOptions = computed(() => [
  { label: t('superadmin.bookings.filter.all'), value: 'all' },
  ...uniquePartners.value.map((partner) => ({
    label: partner.name,
    value: partner.id,
  })),
])

const statusOptions = computed(() => [
  { label: t('superadmin.bookings.filter.all'), value: 'all' },
  { label: t('superadmin.bookings.status.upcoming'), value: 'upcoming' },
  { label: t('superadmin.bookings.status.confirmed'), value: 'confirmed' },
  { label: t('superadmin.bookings.status.pending'), value: 'pending' },
  { label: t('superadmin.bookings.status.completed'), value: 'completed' },
  { label: t('superadmin.bookings.status.settled'), value: 'settled' },
  { label: t('superadmin.bookings.status.cancelled'), value: 'cancelled' },
])

watch(selectedPartner, (newValue) => {
  if (newValue === 'all') {
    selectedPartner.value = undefined
  }
})

watch(selectedStatus, (newValue) => {
  if (newValue === 'all') {
    selectedStatus.value = undefined
  }
})

const filteredData = computed(() => {
  let result = [...(bookings.value || [])]

  if (selectedPartner.value !== undefined && selectedPartner.value !== 'all') {
    result = result.filter((booking) => booking.tenant?.id === selectedPartner.value)
  }

  if (selectedStatus.value !== undefined && selectedStatus.value !== 'all') {
    result = result.filter(
      (booking) => booking.status?.toLowerCase() === selectedStatus.value?.toLowerCase(),
    )
  }

  if (globalFilter.value) {
    const query = globalFilter.value.toLowerCase().trim()
    result = result.filter((booking) => {
      const bookingNumber = booking.booking_number.toLowerCase()
      const tenantName =
        booking.tenant?.company_name ||
        booking.tenant?.name ||
        booking.tenant?.subdomain ||
        ''
      const status = (booking.status || '').toLowerCase()
      return (
        bookingNumber.includes(query) ||
        tenantName.toLowerCase().includes(query) ||
        status.includes(query)
      )
    })
  }

  return result
})

const openReportModal = () => {
  isReportModalOpen.value = true
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  reportStartDate.value = startDate.toISOString().split('T')[0] || ''
  reportEndDate.value = endDate.toISOString().split('T')[0] || ''
}

const closeReportModal = () => {
  isReportModalOpen.value = false
  reportTenant.value = undefined
  reportStatus.value = undefined
  reportStartDate.value = ''
  reportEndDate.value = ''
}

const generatePDFReport = async () => {
  if (!reportStartDate.value || !reportEndDate.value) {
    toast.add({
      title: t('superadmin.bookings.report.error.title'),
      description: t('superadmin.bookings.report.error.dateRequired'),
      color: 'error',
    })
    return
  }

  isGeneratingReport.value = true

  try {
    const { generateBookingsReportPDF } = await import('../../../utils/reportTemplate')

    const pdfBytes = await generateBookingsReportPDF(
      bookings.value || [],
      {
        tenantId: reportTenant.value,
        status: reportStatus.value,
        startDate: reportStartDate.value,
        endDate: reportEndDate.value,
      },
      {
        title: t('superadmin.bookings.report.titlePDF'),
        partnerLabel: t('superadmin.bookings.report.partner'),
        statusLabel: t('superadmin.bookings.report.status'),
        createdDateRangeLabel: t('superadmin.bookings.report.createdDateRange'),
        totalBookingsLabel: t('superadmin.bookings.report.totalBookings'),
        totalRevenueLabel: t('superadmin.bookings.report.totalRevenue'),
        totalFeeLabel: t('superadmin.bookings.report.totalFee'),
        tableHeaders: {
          bookingNumber: t('superadmin.bookings.report.bookingNr'),
          tenant: t('superadmin.bookings.table.tenant'),
          status: t('superadmin.bookings.table.status'),
          totalPrice: t('superadmin.bookings.table.totalPrice'),
          fee: t('superadmin.bookings.table.fee'),
          rentalPeriod: t('superadmin.bookings.table.rentalPeriod'),
        },
        formatCurrency,
        formatDate,
        getStatusLabel,
        getPartnerName: (tenantId: number | string) => {
          const tenant = uniquePartners.value.find(
            (p) => p.id === (typeof tenantId === 'string' ? parseInt(tenantId) : tenantId),
          )
          return tenant?.name ?? null
        },
        getStatusName: (status: string) => {
          const statusOption = statusOptions.value.find((s) => s.value === status)
          return statusOption?.label ?? null
        },
      },
    )

    let filteredBookings = [...(bookings.value || [])]
    if (reportTenant.value && reportTenant.value !== 'all') {
      const tenantIdNum =
        typeof reportTenant.value === 'string' ? parseInt(reportTenant.value) : reportTenant.value
      filteredBookings = filteredBookings.filter((booking) => booking.tenant?.id === tenantIdNum)
    }
    if (reportStatus.value && reportStatus.value !== 'all') {
      filteredBookings = filteredBookings.filter(
        (booking) =>
          booking.status?.toLowerCase() === reportStatus.value?.toLowerCase(),
      )
    }
    const startDateObj = new Date(reportStartDate.value)
    startDateObj.setHours(0, 0, 0, 0)
    const endDateObj = new Date(reportEndDate.value)
    endDateObj.setHours(23, 59, 59, 999)
    filteredBookings = filteredBookings.filter((booking) => {
      const bookingCreatedDate = new Date(booking.created_at)
      return bookingCreatedDate >= startDateObj && bookingCreatedDate <= endDateObj
    })

    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Raporti i Rezervimeve-${formatDate(new Date().toISOString(), 'YYYY-MM-DD')}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      title: t('superadmin.bookings.report.success.title'),
      description: t('superadmin.bookings.report.success.description', {
        count: filteredBookings.length,
      }),
      color: 'success',
    })

    closeReportModal()
  } catch (err) {
    console.error('Error generating PDF:', err)
    toast.add({
      title: t('superadmin.bookings.report.error.title'),
      description:
        err instanceof Error
          ? err.message
          : t('superadmin.bookings.report.error.generationFailed'),
      color: 'error',
    })
  } finally {
    isGeneratingReport.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t('superadmin.bookings.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ t('superadmin.bookings.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-download"
          :label="t('superadmin.bookings.actions.generateReport')"
          color="primary"
          variant="solid"
          size="sm"
          @click="openReportModal"
        />
      </div>
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
      <template #header>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <UInput
              v-model="globalFilter"
              :placeholder="t('superadmin.bookings.searchPlaceholder')"
              icon="i-lucide-search"
              class="w-full sm:w-2/4"
            />
          </div>
          <div class="w-full sm:w-auto">
            <USelectMenu
              v-model="selectedPartner"
              :items="partnerOptions"
              :placeholder="t('superadmin.bookings.filterByPartner')"
              value-key="value"
              label-key="label"
              searchable
              class="w-full sm:w-[200px]"
            />
          </div>
          <div class="w-full sm:w-auto">
            <USelectMenu
              v-model="selectedStatus"
              :items="statusOptions"
              :placeholder="t('superadmin.bookings.filterByStatus')"
              value-key="value"
              label-key="label"
              class="w-full sm:w-[200px]"
            />
          </div>
        </div>
      </template>

      <UTable
        ref="table"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        v-model:global-filter="globalFilter"
        :data="filteredData"
        :columns="columns"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        :loading="pending"
        class="w-full"
      >
        <template #empty>
          <div class="text-center py-12">
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
        </template>
      </UTable>

      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('superadmin.bookings.footer.showing') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{
                (table?.tableApi?.getState().pagination.pageIndex || 0) *
                  (table?.tableApi?.getState().pagination.pageSize || 10) +
                (filteredData.length ? 1 : 0)
              }}
            </span>
            {{ t('superadmin.bookings.footer.to') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{
                Math.min(
                  ((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) *
                    (table?.tableApi?.getState().pagination.pageSize || 10),
                  table?.tableApi?.getFilteredRowModel().rows.length || 0,
                )
              }}
            </span>
            {{ t('superadmin.bookings.footer.of') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
            </span>
            {{ t('superadmin.bookings.footer.bookings') }}
          </p>

          <UPagination
            :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize || 10"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </template>
    </UCard>

    <UModal
      v-model:open="isReportModalOpen"
      :title="t('superadmin.bookings.report.title')"
      :ui="{
        content: 'w-[calc(100vw-2rem)] sm:max-w-2xl',
      }"
    >
      <template #body>
        <div class="space-y-6">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t('superadmin.bookings.report.partner') }}
            </label>
            <USelectMenu
              v-model="reportTenant"
              :items="partnerOptions"
              :placeholder="t('superadmin.bookings.report.partnerPlaceholder')"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t('superadmin.bookings.report.status') }}
            </label>
            <USelectMenu
              v-model="reportStatus"
              :items="statusOptions"
              :placeholder="t('superadmin.bookings.report.statusPlaceholder')"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {{ t('superadmin.bookings.report.startDate') }}
              </label>
              <UInput
                v-model="reportStartDate"
                type="date"
                class="w-full"
              />
            </div>
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {{ t('superadmin.bookings.report.endDate') }}
              </label>
              <UInput
                v-model="reportEndDate"
                type="date"
                class="w-full"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            :label="t('superadmin.bookings.report.cancel')"
            color="neutral"
            variant="ghost"
            @click="closeReportModal"
          />
          <UButton
            :label="t('superadmin.bookings.report.generate')"
            icon="i-lucide-download"
            color="primary"
            :loading="isGeneratingReport"
            @click="generatePDFReport"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
