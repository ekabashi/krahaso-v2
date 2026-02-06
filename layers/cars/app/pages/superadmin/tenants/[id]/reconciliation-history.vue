<script setup lang="ts">
import { h, resolveComponent, computed, ref, onMounted } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ReconciliationHistoryEntry } from '~/types'
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
const { formatPrice } = useFormatPrice()

const UIcon = resolveComponent('UIcon')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

useHead({
  title: computed(() => t('superadmin.tenants.reconciliationHistory.title')),
})

const tenantId = computed(() => Number(route.params.id))
const loading = ref(true)
const isGeneratingReport = ref(false)
const expanded = ref({})

const columns = computed<TableColumn<ReconciliationHistoryEntry>[]>(() => [
  {
    accessorKey: 'created_at',
    header: t('superadmin.tenants.reconciliationHistory.table.rentalPeriod'),
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: 'i-lucide-calendar', class: 'size-4 text-gray-400' }),
        h(
          'span',
          { class: 'text-sm text-gray-600 dark:text-gray-400' },
          formatDate(row.original.created_at, 'DD MMM YYYY HH:mm')
        ),
      ])
    },
  },
  {
    accessorKey: 'settled_count',
    header: t('superadmin.tenants.reconciliationHistory.bookings'),
    cell: ({ row }) => {
      return h(
        UButton,
        {
          color: 'primary',
          variant: 'soft',
          size: 'xs',
          to: `/superadmin/tenants/${tenantId.value}/reconciliation/${row.original.id}`,
        },
        () => [
          h(UIcon, { name: 'i-heroicons-arrow-top-right-on-square', class: 'mr-1 size-4' }),
          `${row.original.settled_count} ${
            row.original.settled_count === 1
              ? t('superadmin.tenants.reconciliationHistory.booking')
              : t('superadmin.tenants.reconciliationHistory.bookings')
          }`,
        ]
      )
    },
  },
  {
    accessorKey: 'total_revenue',
    header: t('superadmin.tenants.reconciliationHistory.totalRevenue'),
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, {
          name: 'i-lucide-euro',
          class: 'size-3.5 text-green-600 dark:text-green-400',
        }),
        h(
          'span',
          { class: 'font-semibold text-gray-900 dark:text-white' },
          new Intl.NumberFormat('sq-AL', {
            style: 'currency',
            currency: 'EUR',
          }).format(row.original.total_revenue)
        ),
      ])
    },
  },
  {
    accessorKey: 'marketplace_share',
    header: t('superadmin.tenants.reconciliationHistory.marketplaceShare'),
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('div', { class: 'flex items-center gap-1.5' }, [
          h(UIcon, {
            name: 'i-lucide-trending-up',
            class: 'size-3.5 text-purple-600 dark:text-purple-400',
          }),
          h(
            'span',
            { class: 'font-semibold text-gray-900 dark:text-white' },
            new Intl.NumberFormat('sq-AL', {
              style: 'currency',
              currency: 'EUR',
            }).format(row.original.marketplace_share)
          ),
        ]),
        h(
          'span',
          { class: 'text-xs text-gray-500' },
          `${row.original.percentage}%`
        ),
      ])
    },
  },
  {
    accessorKey: 'tenant_share',
    header: t('superadmin.tenants.reconciliationHistory.tenantShare'),
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, {
          name: 'i-lucide-wallet',
          class: 'size-3.5 text-orange-600 dark:text-orange-400',
        }),
        h(
          'span',
          { class: 'font-semibold text-gray-900 dark:text-white' },
          new Intl.NumberFormat('sq-AL', {
            style: 'currency',
            currency: 'EUR',
          }).format(row.original.tenant_share)
        ),
      ])
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          items: [
            [
              {
                label: t(
                  'superadmin.tenants.reconciliationHistory.actions.generateReport'
                ),
                icon: 'i-lucide-file-text',
                loading: isGeneratingReport.value,
                onSelect: () => handleGenerateReport(row.original),
              },
            ],
          ],
        },
        () =>
          h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost',
            size: 'sm',
          })
      )
    },
  },
])

const handleGenerateReport = async (reconciliation: ReconciliationHistoryEntry) => {
  if (isGeneratingReport.value) return
  isGeneratingReport.value = true

  try {
    const details = await tenantStore.fetchReconciliationDetails(
      tenantId.value,
      reconciliation.id
    )

    const { generateSettlementReportPDF } = await import(
      '../../../../utils/reportTemplate'
    )

    const percentage = details.percentage || 0
    const convertedRequests = [{
      id: String(details.id),
      tenant_id: details.tenant_id,
      booking_numbers: details.bookings.map((b) => b.booking_number),
      booking_ids: details.booking_ids,
      status: 'completed' as const,
      requested_by: details.created_by,
      notes: details.notes,
      created_at: details.created_at,
      updated_at: details.created_at,
      tenant: tenantStore.reconciliationHistory?.tenant,
      bookings: details.bookings.map((booking) => {
        const totalPrice = Number(booking.total_price) || 0
        const fee = percentage > 0
          ? Math.round((totalPrice * percentage) * 100) / 10000
          : 0
        
        return {
          id: booking.id,
          booking_number: booking.booking_number,
          total_price: totalPrice,
          fee,
          vehicle: booking.vehicle ? {
            make: booking.vehicle.make,
            model: booking.vehicle.model,
            license_plate: null,
          } : null,
          customer: booking.customer ? {
            name: booking.customer.name,
            surname: booking.customer.surname,
          } : null,
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime,
        }
      }),
    }]

    const pdfBytes = await generateSettlementReportPDF(
      convertedRequests,
      {
        title: t('superadmin.settledRequests.report.titlePDF'),
        partnerLabel: t('superadmin.bookings.report.partner'),
        createdDateLabel: t('superadmin.settledRequests.report.createdDate'),
        totalRevenueLabel: t('superadmin.settledRequests.report.totalRevenue'),
        totalFeeLabel: t('superadmin.settledRequests.report.totalFee'),
        transferAmountLabel: t('superadmin.settledRequests.report.transferAmount'),
        partnerName: tenantStore.reconciliationHistory?.tenant?.company_name || tenantStore.reconciliationHistory?.tenant?.name || '-',
        tableHeaders: {
          bookingNumber: t('superadmin.settledRequests.report.table.bookingNumber'),
          vehicle: t('superadmin.settledRequests.report.table.vehicle'),
          totalPrice: t('superadmin.settledRequests.report.table.totalPrice'),
          fee: t('superadmin.settledRequests.report.table.fee'),
          rentalPeriod: t('superadmin.settledRequests.report.table.rentalPeriod'),
        },
        formatCurrency: (amount) => formatPrice(amount).replace('€', '').trim() + ' €',
        formatDate,
      }
    )

    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Raporti-Barazimit-${formatDate(
      new Date().toISOString(),
      'YYYY-MM-DD'
    )}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      title: 'Success',
      description: 'Report generated successfully',
      color: 'success',
    })
  } catch (error) {
    console.error('Error generating report:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to generate report',
      color: 'error',
    })
  } finally {
    isGeneratingReport.value = false
  }
}

onMounted(async () => {
  try {
    loading.value = true
    await tenantStore.fetchTenantReconciliationHistory(tenantId.value)
  } catch (error) {
    toast.add({
      title: t('superadmin.tenants.reconciliationHistory.error.title'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.tenants.reconciliationHistory.error.failedToLoad'),
      color: 'error',
    })
    router.push(localePath(`/superadmin/tenants/${tenantId.value}`))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Back Button -->
    <div>
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        :label="t('superadmin.tenants.reconciliationHistory.backToTenants')"
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
          {{ t('superadmin.tenants.reconciliationHistory.loading') }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="tenantStore.reconciliationHistory">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{
              tenantStore.reconciliationHistory.tenant.company_name ||
              tenantStore.reconciliationHistory.tenant.name ||
              t('superadmin.tenants.reconciliationHistory.title')
            }}
            -
            {{ t('superadmin.tenants.reconciliationHistory.subtitle') }}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{
              t('superadmin.tenants.reconciliationHistory.description', {
                count: tenantStore.reconciliationHistory.history.length,
              })
            }}
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="tenantStore.reconciliationHistory.history.length === 0"
        class="text-center py-12"
      >
        <div class="flex flex-col items-center gap-4">
          <div
            class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <UIcon name="i-lucide-archive-x" class="size-8 text-gray-400" />
          </div>
          <div>
            <p class="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {{
                t(
                  'superadmin.tenants.reconciliationHistory.emptyState.noHistory'
                )
              }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{
                t(
                  'superadmin.tenants.reconciliationHistory.emptyState.noHistoryDescription'
                )
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- History Table -->
      <UCard v-else class="overflow-hidden">
        <UTable
          v-model:expanded="expanded"
          :data="tenantStore.reconciliationHistory.history"
          :columns="columns"
          class="w-full"
        >
          <template #expanded="{ row }">
            <div class="p-4 bg-gray-50 dark:bg-gray-800/50">
              <!-- Notes -->
              <div v-if="row.original.notes" class="mb-4">
                <div
                  class="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4"
                >
                  <div class="flex items-start gap-3">
                    <UIcon
                      name="i-lucide-info"
                      class="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
                    />
                    <div class="flex-1">
                      <p
                        class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1"
                      >
                        {{
                          t('superadmin.tenants.reconciliationHistory.notes')
                        }}
                      </p>
                      <p class="text-sm text-blue-800 dark:text-blue-300">
                        {{ row.original.notes }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>
