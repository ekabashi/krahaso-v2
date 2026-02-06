<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { PartnershipRequest } from '~/types'
import { usePartnershipRequestStore } from '../../stores/partnershipRequestStore'

definePageMeta({
  layout: 'superadmin',
  title: 'Partnership Requests',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const partnershipRequestStore = usePartnershipRequestStore()
const toast = useToast()
const { formatDate } = useFormatDate()

const isApproveModalOpen = ref(false)
const isRejectModalOpen = ref(false)
const isEditPartnershipModalOpen = ref(false)
const selectedRequest = ref<PartnershipRequest | null>(null)
const percentage = ref<number>(10)
const isPartnershipActive = ref(false)
const isApproving = ref(false)
const isRejecting = ref(false)
const isUpdating = ref(false)
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
})
const globalFilter = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const openApproveModal = (request: PartnershipRequest) => {
  selectedRequest.value = request
  percentage.value = 10
  isApproveModalOpen.value = true
}

const closeApproveModal = () => {
  isApproveModalOpen.value = false
  selectedRequest.value = null
  percentage.value = 10
}

const openRejectModal = (request: PartnershipRequest) => {
  selectedRequest.value = request
  isRejectModalOpen.value = true
}

const closeRejectModal = () => {
  isRejectModalOpen.value = false
  selectedRequest.value = null
}

const openEditPartnershipModal = (request: PartnershipRequest) => {
  selectedRequest.value = request
  percentage.value = request.percentage ?? 10
  isPartnershipActive.value = request.is_partnership
  isEditPartnershipModalOpen.value = true
}

const closeEditPartnershipModal = () => {
  isEditPartnershipModalOpen.value = false
  selectedRequest.value = null
  percentage.value = 10
  isPartnershipActive.value = false
}

const handleApprove = async () => {
  if (!selectedRequest.value) return

  if (percentage.value < 0 || percentage.value > 100) {
    toast.add({
      title: t('superadmin.partnershipRequests.errors.invalidPercentage'),
      description: t('superadmin.partnershipRequests.errors.percentageRange'),
      color: 'error',
    })
    return
  }

  isApproving.value = true
  try {
    await partnershipRequestStore.approveRequest(
      selectedRequest.value.id,
      percentage.value,
    )
    toast.add({
      title: t('superadmin.partnershipRequests.approve.success'),
      description: t(
        'superadmin.partnershipRequests.approve.successDescription',
        {
          company:
            selectedRequest.value.tenant.company_name ??
            selectedRequest.value.tenant.name,
        },
      ),
      color: 'success',
    })
    closeApproveModal()
    await fetchRequests()
  } catch (error) {
    toast.add({
      title: t('superadmin.partnershipRequests.approve.error'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.partnershipRequests.approve.errorDescription'),
      color: 'error',
    })
  } finally {
    isApproving.value = false
  }
}

const handleReject = async () => {
  if (!selectedRequest.value) return

  isRejecting.value = true
  try {
    await partnershipRequestStore.rejectRequest(selectedRequest.value.id)
    toast.add({
      title: t('superadmin.partnershipRequests.reject.success'),
      description: t(
        'superadmin.partnershipRequests.reject.successDescription',
        {
          company:
            selectedRequest.value.tenant.company_name ??
            selectedRequest.value.tenant.name,
        },
      ),
      color: 'success',
    })
    closeRejectModal()
    await fetchRequests()
  } catch (error) {
    toast.add({
      title: t('superadmin.partnershipRequests.reject.error'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.partnershipRequests.reject.errorDescription'),
      color: 'error',
    })
  } finally {
    isRejecting.value = false
  }
}

const handleEditPartnership = async () => {
  if (!selectedRequest.value) return

  if (percentage.value < 0 || percentage.value > 100) {
    toast.add({
      title: t('superadmin.partnershipRequests.errors.invalidPercentage'),
      description: t('superadmin.partnershipRequests.errors.percentageRange'),
      color: 'error',
    })
    return
  }

  const originalPercentage = selectedRequest.value.percentage ?? 10
  const percentageChanged = percentage.value !== originalPercentage
  const partnershipStatusChanged =
    isPartnershipActive.value !== selectedRequest.value.is_partnership

  if (!percentageChanged && !partnershipStatusChanged) {
    toast.add({
      title: t('superadmin.partnershipRequests.editPartnership.noChanges'),
      description: t(
        'superadmin.partnershipRequests.editPartnership.noChangesDescription',
      ),
      color: 'warning',
    })
    return
  }

  isUpdating.value = true
  try {
    if (percentageChanged) {
      await partnershipRequestStore.updatePercentage(
        selectedRequest.value.id,
        percentage.value,
      )
    }

    if (partnershipStatusChanged) {
      await partnershipRequestStore.updatePartnershipStatus(
        selectedRequest.value.id,
        isPartnershipActive.value,
      )
    }

    const messages: string[] = []
    if (partnershipStatusChanged) {
      if (isPartnershipActive.value) {
        messages.push(
          t('superadmin.partnershipRequests.activatePartnership.success'),
        )
      } else {
        messages.push(
          t('superadmin.partnershipRequests.deactivatePartnership.success'),
        )
      }
    }
    if (percentageChanged) {
      messages.push(
        t('superadmin.partnershipRequests.updatePercentage.success'),
      )
    }

    toast.add({
      title: t('superadmin.partnershipRequests.editPartnership.success'),
      description: messages.join(' '),
      color: 'success',
    })

    closeEditPartnershipModal()
    await fetchRequests()
  } catch (error) {
    toast.add({
      title: t('superadmin.partnershipRequests.editPartnership.error'),
      description:
        error instanceof Error
          ? error.message
          : t(
              'superadmin.partnershipRequests.editPartnership.errorDescription',
            ),
      color: 'error',
    })
  } finally {
    isUpdating.value = false
  }
}

const fetchRequests = async () => {
  try {
    await partnershipRequestStore.fetchRequests({
      page: pagination.value.pageIndex + 1,
      limit: pagination.value.pageSize,
      search: globalFilter.value,
    })
  } catch (error) {
    toast.add({
      title: t('superadmin.partnershipRequests.errors.fetchFailed'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.partnershipRequests.errors.unknown'),
      color: 'error',
    })
  }
}

watch(globalFilter, () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    pagination.value.pageIndex = 0
    fetchRequests()
  }, 500)
})

watch(
  () => pagination.value.pageIndex,
  () => {
    fetchRequests()
  },
)

watch(
  () => pagination.value.pageSize,
  () => {
    pagination.value.pageIndex = 0
    fetchRequests()
  },
)

onMounted(() => {
  fetchRequests()
})

const columns: TableColumn<PartnershipRequest>[] = [
  {
    accessorKey: 'partnership_status',
    header: t('superadmin.partnershipRequests.table.status'),
    cell: ({ row }) => {
      const status = row.original.partnership_status
      const colorMap: Record<
        string,
        'success' | 'warning' | 'error' | 'neutral'
      > = {
        approved: 'success',
        pending: 'warning',
        rejected: 'error',
      }
      const labelMap: Record<string, string> = {
        approved: t('superadmin.partnershipRequests.status.approved'),
        pending: t('superadmin.partnershipRequests.status.pending'),
        rejected: t('superadmin.partnershipRequests.status.rejected'),
      }
      return h(UBadge, {
        label: labelMap[status] ?? status,
        color: colorMap[status] ?? 'neutral',
        variant: 'subtle',
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
    accessorKey: 'tenant.company_name',
    header: t('superadmin.partnershipRequests.table.companyName'),
    cell: ({ row }) => {
      const request = row.original
      return h(
        'div',
        { class: 'flex items-center gap-3' },
        [
          h('div', {
            class: request.tenant.logo_url
              ? 'flex items-center justify-center size-10 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              : 'flex items-center justify-center size-10 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0',
          }, [
            request.tenant.logo_url
              ? h('img', {
                  src: request.tenant.logo_url,
                  alt:
                    request.tenant.company_name ??
                    request.tenant.name ??
                    'Company logo',
                  class: 'w-full h-full object-contain p-1',
                })
              : h('span', { class: 'i-lucide-building-2 size-5' }),
          ]),
          h('div', { class: 'flex flex-col min-w-0' }, [
            h('span', {
              class: 'font-semibold text-gray-900 dark:text-white truncate',
            }, request.tenant.company_name ?? request.tenant.name ?? 'Unnamed Tenant'),
            request.tenant.name &&
            request.tenant.name !== request.tenant.company_name
              ? h('span', {
                  class: 'text-xs text-gray-500 dark:text-gray-400 truncate',
                }, request.tenant.name)
              : null,
          ]),
        ],
      )
    },
    meta: {
      class: {
        td: 'min-w-[200px]',
      },
    },
  },
  {
    accessorKey: 'tenant.public_email',
    header: t('superadmin.partnershipRequests.table.email'),
    cell: ({ row }) => {
      const email = row.original.tenant.public_email
      return email
        ? h('a', {
            href: `mailto:${email}`,
            class:
              'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
          }, [
            h('span', { class: 'i-lucide-mail size-3.5 shrink-0' }),
            h('span', { class: 'truncate' }, email),
          ])
        : h('span', { class: 'text-sm text-gray-400 italic' }, '-')
    },
    meta: {
      class: {
        td: 'min-w-[180px]',
      },
    },
  },
  {
    accessorKey: 'tenant.public_phone',
    header: t('superadmin.partnershipRequests.table.phone'),
    cell: ({ row }) => {
      const phone = row.original.tenant.public_phone
      return phone
        ? h('a', {
            href: `tel:${phone}`,
            class:
              'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
          }, [
            h('span', { class: 'i-lucide-phone size-3.5 shrink-0' }),
            h('span', phone),
          ])
        : h('span', { class: 'text-sm text-gray-400' }, '-')
    },
    meta: {
      class: {
        td: 'w-[140px]',
      },
    },
  },
  {
    accessorKey: 'tenant.subdomain',
    header: t('superadmin.partnershipRequests.table.subdomain'),
    cell: ({ row }) => {
      const subdomain = row.original.tenant.subdomain
      return subdomain
        ? h('div', { class: 'flex items-center gap-1.5' }, [
            h('span', { class: 'i-lucide-globe size-4 text-gray-400' }),
            h('code', {
              class:
                'text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded',
            }, subdomain),
          ])
        : h('span', { class: 'text-sm text-gray-400' }, '-')
    },
    meta: {
      class: {
        td: 'w-[150px]',
      },
    },
  },
  {
    accessorKey: 'created_at',
    header: t('superadmin.partnershipRequests.table.createdAt'),
    cell: ({ row }) => {
      const date = row.original.created_at
      return h(
        'div',
        {
          class:
            'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400',
        },
        [
          h('span', { class: 'i-lucide-calendar size-3.5' }),
          h('span', formatDate(date, 'DD MMM YYYY HH:mm') ?? '-'),
        ],
      )
    },
    meta: {
      class: {
        td: 'w-[160px]',
      },
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const request = row.original
      const buttons: ReturnType<typeof h>[] = []

      if (request.partnership_status === 'pending') {
        buttons.push(
          h(UButton, {
            label: t('superadmin.partnershipRequests.actions.approve'),
            icon: 'i-lucide-check',
            color: 'success',
            size: 'sm',
            onClick: () => {
              openApproveModal(request)
            },
          }),
        )
        buttons.push(
          h(UButton, {
            label: t('superadmin.partnershipRequests.actions.reject'),
            icon: 'i-lucide-x',
            color: 'error',
            size: 'sm',
            variant: 'outline',
            onClick: () => {
              openRejectModal(request)
            },
          }),
        )
      } else if (
        request.partnership_status === 'approved' ||
        request.partnership_status === 'rejected'
      ) {
        buttons.push(
          h(UButton, {
            label: t('superadmin.partnershipRequests.actions.editPartnership'),
            icon: 'i-lucide-edit',
            color: 'primary',
            size: 'sm',
            onClick: () => {
              openEditPartnershipModal(request)
            },
          }),
        )
      }

      if (buttons.length === 0) {
        return null
      }

      return h('div', { class: 'flex items-center gap-2 justify-end' }, buttons)
    },
    meta: {
      class: {
        td: 'text-right min-w-[200px]',
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
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t('superadmin.partnershipRequests.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ t('superadmin.partnershipRequests.subtitle') }}
        </p>
      </div>
    </div>

    <ClientOnly>
      <UCard class="overflow-hidden">
        <template #header>
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <UInput
                v-model="globalFilter"
                :placeholder="t('superadmin.partnershipRequests.searchPlaceholder')"
                icon="i-lucide-search"
                class="w-full sm:max-w-sm"
              />
            </div>
          </div>
        </template>

        <UTable
          ref="table"
          v-model:pagination="pagination"
          :data="partnershipRequestStore.requests"
          :columns="columns"
          :loading="partnershipRequestStore.loading"
          class="w-full"
        >
          <template #empty>
            <div class="text-center py-12">
              <div class="flex flex-col items-center gap-4">
                <div
                  class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
                >
                  <UIcon
                    name="i-lucide-handshake"
                    class="size-8 text-gray-400"
                  />
                </div>
                <div>
                  <p
                    class="text-lg font-medium text-gray-900 dark:text-white mb-1"
                  >
                    {{ t('superadmin.partnershipRequests.emptyState.title') }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{
                      t('superadmin.partnershipRequests.emptyState.description')
                    }}
                  </p>
                </div>
              </div>
            </div>
          </template>
        </UTable>

        <template #footer>
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t('superadmin.partnershipRequests.table.showing') }}
              <span class="font-semibold text-gray-900 dark:text-white">
                {{
                  partnershipRequestStore.total === 0
                    ? 0
                    : pagination.pageIndex * pagination.pageSize + 1
                }}
              </span>
              {{ t('superadmin.partnershipRequests.table.to') }}
              <span class="font-semibold text-gray-900 dark:text-white">
                {{
                  Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    partnershipRequestStore.total,
                  )
                }}
              </span>
              {{ t('superadmin.partnershipRequests.table.of') }}
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ partnershipRequestStore.total }}
              </span>
              {{ t('superadmin.partnershipRequests.table.requests') }}
            </p>

            <UPagination
              :page="pagination.pageIndex + 1"
              :items-per-page="pagination.pageSize"
              :total="partnershipRequestStore.total"
              @update:page="(p) => (pagination.pageIndex = p - 1)"
            />
          </div>
        </template>
      </UCard>
      <template #fallback>
        <UCard class="overflow-hidden">
          <div class="flex items-center justify-center py-20">
            <div class="flex flex-col items-center gap-4">
              <UIcon
                name="i-lucide-loader-2"
                class="size-10 text-primary-600 dark:text-primary-400 animate-spin"
              />
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('superadmin.partnershipRequests.loading') }}
              </p>
            </div>
          </div>
        </UCard>
      </template>
    </ClientOnly>

    <UModal
      v-model:open="isApproveModalOpen"
      :title="t('superadmin.partnershipRequests.approveModal.title')"
      :ui="{
        content: 'w-[calc(100vw-2rem)] sm:max-w-md',
      }"
    >
      <template #body>
        <div v-if="selectedRequest" class="flex flex-col gap-4">
          <div
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div
              :class="
                selectedRequest.tenant.logo_url
                  ? 'flex items-center justify-center size-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  : 'flex items-center justify-center size-12 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0'
              "
            >
              <img
                v-if="selectedRequest.tenant.logo_url"
                :src="selectedRequest.tenant.logo_url"
                :alt="
                  selectedRequest.tenant.company_name ??
                  selectedRequest.tenant.name ??
                  'Company logo'
                "
                class="w-full h-full object-contain p-1"
              >
              <UIcon
                v-else
                name="i-lucide-building-2"
                class="size-6"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="font-semibold text-gray-900 dark:text-white truncate"
              >
                {{
                  selectedRequest.tenant.company_name ??
                  selectedRequest.tenant.name ??
                  'Unnamed Tenant'
                }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('superadmin.partnershipRequests.approveModal.subtitle') }}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label
              class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {{
                t('superadmin.partnershipRequests.approveModal.percentageLabel')
              }}
            </label>
            <UInput
              v-model.number="percentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              :placeholder="
                t('superadmin.partnershipRequests.approveModal.percentagePlaceholder')
              "
              icon="i-lucide-percent"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{
                t('superadmin.partnershipRequests.approveModal.percentageHint')
              }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            :label="t('superadmin.partnershipRequests.approveModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="closeApproveModal"
          />
          <UButton
            :label="t('superadmin.partnershipRequests.approveModal.confirm')"
            icon="i-lucide-check"
            color="success"
            :loading="isApproving"
            :disabled="isApproving"
            @click="handleApprove"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isRejectModalOpen"
      :title="t('superadmin.partnershipRequests.rejectModal.title')"
      :ui="{
        content: 'w-[calc(100vw-2rem)] sm:max-w-md',
      }"
    >
      <template #body>
        <div v-if="selectedRequest" class="flex flex-col gap-4">
          <div
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div
              :class="
                selectedRequest.tenant.logo_url
                  ? 'flex items-center justify-center size-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  : 'flex items-center justify-center size-12 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0'
              "
            >
              <img
                v-if="selectedRequest.tenant.logo_url"
                :src="selectedRequest.tenant.logo_url"
                :alt="
                  selectedRequest.tenant.company_name ??
                  selectedRequest.tenant.name ??
                  'Company logo'
                "
                class="w-full h-full object-contain p-1"
              >
              <UIcon
                v-else
                name="i-lucide-building-2"
                class="size-6"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="font-semibold text-gray-900 dark:text-white truncate"
              >
                {{
                  selectedRequest.tenant.company_name ??
                  selectedRequest.tenant.name ??
                  'Unnamed Tenant'
                }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('superadmin.partnershipRequests.rejectModal.subtitle') }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            :label="t('superadmin.partnershipRequests.rejectModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="closeRejectModal"
          />
          <UButton
            :label="t('superadmin.partnershipRequests.rejectModal.confirm')"
            icon="i-lucide-x"
            color="error"
            :loading="isRejecting"
            :disabled="isRejecting"
            @click="handleReject"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isEditPartnershipModalOpen"
      :title="t('superadmin.partnershipRequests.editPartnershipModal.title')"
      :ui="{
        content: 'w-[calc(100vw-2rem)] sm:max-w-md',
      }"
    >
      <template #body>
        <div v-if="selectedRequest" class="flex flex-col gap-4">
          <div
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div
              :class="
                selectedRequest.tenant.logo_url
                  ? 'flex items-center justify-center size-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  : 'flex items-center justify-center size-12 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0'
              "
            >
              <img
                v-if="selectedRequest.tenant.logo_url"
                :src="selectedRequest.tenant.logo_url"
                :alt="
                  selectedRequest.tenant.company_name ??
                  selectedRequest.tenant.name ??
                  'Company logo'
                "
                class="w-full h-full object-contain p-1"
              >
              <UIcon
                v-else
                name="i-lucide-building-2"
                class="size-6"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="font-semibold text-gray-900 dark:text-white truncate"
              >
                {{
                  selectedRequest.tenant.company_name ??
                  selectedRequest.tenant.name ??
                  'Unnamed Tenant'
                }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{
                  t(
                    'superadmin.partnershipRequests.editPartnershipModal.subtitle',
                  )
                }}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {{
                  t(
                    'superadmin.partnershipRequests.editPartnershipModal.percentageLabel',
                  )
                }}
              </label>
              <UInput
                v-model.number="percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                :placeholder="
                  t(
                    'superadmin.partnershipRequests.editPartnershipModal.percentagePlaceholder',
                  )
                "
                icon="i-lucide-percent"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{
                  t(
                    'superadmin.partnershipRequests.editPartnershipModal.percentageHint',
                  )
                }}
              </p>
            </div>

            <div
              class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <USwitch
                v-model="isPartnershipActive"
                :label="
                  t(
                    'superadmin.partnershipRequests.editPartnershipModal.partnershipLabel',
                  )
                "
                color="primary"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            :label="
              t(
                'superadmin.partnershipRequests.editPartnershipModal.cancel',
              )
            "
            color="neutral"
            variant="ghost"
            @click="closeEditPartnershipModal"
          />
          <UButton
            :label="
              t(
                'superadmin.partnershipRequests.editPartnershipModal.confirm',
              )
            "
            icon="i-lucide-check"
            color="primary"
            :loading="isUpdating"
            :disabled="isUpdating"
            @click="handleEditPartnership"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
