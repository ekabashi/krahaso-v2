<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { SuperadminTenant } from '../../../types'
import { useTenantStore } from '../../../stores/tenantStore'

definePageMeta({
  layout: 'superadmin',
  title: 'Tenants',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const toast = useToast()
const { formatDate } = useFormatDate()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

onMounted(async () => {
  try {
    await tenantStore.fetchTenants()
  } catch (error) {
    toast.add({
      title: t('superadmin.tenants.error.fetchFailed'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.tenants.error.unknown'),
      color: 'error',
    })
  }
})

const getStatusColor = (
  status: string | null,
): 'success' | 'warning' | 'error' | 'neutral' => {
  if (!status) return 'neutral'
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    suspended: 'error',
  }
  return colors[status] || 'neutral'
}

const getStatusLabel = (status: string | null) => {
  if (!status) return t('superadmin.tenants.status.unknown')
  return t(`superadmin.tenants.status.${status}`)
}

const getTenantActions = (tenant: SuperadminTenant) => {
  return [
    {
      type: 'label',
      label: t('superadmin.tenants.actions.viewDetails'),
    },
    {
      label: t('superadmin.tenants.actions.viewDetails'),
      icon: 'i-lucide-eye',
      onSelect: () => {
        navigateTo(localePath(`/superadmin/tenants/${tenant.id}`))
      },
    },
    {
      label: t('superadmin.tenants.actions.viewClosedBookings'),
      icon: 'i-lucide-archive',
      onSelect: () => {
        navigateTo(localePath(`/superadmin/tenants/${tenant.id}/reconciliation-history`))
      },
    },
    {
      type: 'separator',
    },
    {
      label: t('superadmin.tenants.actions.suspend'),
      icon: 'i-lucide-ban',
      onSelect: () => {
        toast.add({
          title: t('superadmin.tenants.actions.suspend'),
          description: `${t('superadmin.tenants.actions.suspend')} ${tenant.company_name || tenant.name}`,
          color: 'warning',
        })
      },
    },
    {
      label: t('superadmin.tenants.actions.delete'),
      icon: 'i-lucide-trash-2',
      onSelect: () => {
        toast.add({
          title: t('superadmin.tenants.actions.delete'),
          description: `${t('superadmin.tenants.actions.delete')} ${tenant.company_name || tenant.name}`,
          color: 'error',
        })
      },
    },
  ]
}

const columns: TableColumn<SuperadminTenant>[] = [
  {
    accessorKey: 'company_name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Company',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      })
    },
    cell: ({ row }) => {
      const tenant = row.original
      return h(
        'div',
        { class: 'flex items-center gap-3' },
        [
          h('div', {
            class: tenant.logo_url
              ? 'flex items-center justify-center size-10 rounded-lg overflow-hidden flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              : 'flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md flex-shrink-0',
          }, [
            tenant.logo_url
              ? h('img', {
                  src: tenant.logo_url,
                  alt: tenant.company_name || tenant.name || 'Company logo',
                  class: 'w-full h-full object-contain p-1',
                })
              : h('span', { class: 'i-lucide-building-2 size-5' }),
          ]),
          h('div', { class: 'flex flex-col min-w-0' }, [
            h('span', { class: 'font-semibold text-gray-900 dark:text-white truncate' }, tenant.company_name || tenant.name || 'Unnamed Tenant'),
            tenant.name && tenant.name !== tenant.company_name
              ? h('span', { class: 'text-xs text-gray-500 dark:text-gray-400 truncate' }, tenant.name)
              : null,
          ]),
        ]
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
    header: 'Status',
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
        () => getStatusLabel(status)
      )
    },
    meta: {
      class: {
        td: 'w-[120px]',
      },
    },
  },
  {
    accessorKey: 'public_email',
    header: 'Contact',
    cell: ({ row }) => {
      const tenant = row.original
      return h('div', { class: 'flex flex-col gap-1.5' }, [
        tenant.public_email
          ? h(
              'a',
              {
                href: `mailto:${tenant.public_email}`,
                class:
                  'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
              },
              [
                h('span', { class: 'i-lucide-mail size-3.5 flex-shrink-0' }),
                h('span', { class: 'truncate' }, tenant.public_email),
              ]
            )
          : h('span', { class: 'text-sm text-gray-400 italic' }, 'No email'),
        tenant.public_phone
          ? h(
              'a',
              {
                href: `tel:${tenant.public_phone}`,
                class:
                  'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
              },
              [
                h('span', { class: 'i-lucide-phone size-3.5 flex-shrink-0' }),
                h('span', tenant.public_phone),
              ]
            )
          : null,
      ])
    },
    meta: {
      class: {
        td: 'min-w-[220px]',
      },
    },
  },
  {
    accessorKey: 'subdomain',
    header: 'Subdomain',
    cell: ({ row }) => {
      const subdomain = row.getValue('subdomain') as string | null
      return subdomain
        ? h('div', { class: 'flex items-center gap-1.5' }, [
            h('span', { class: 'i-lucide-globe size-4 text-gray-400' }),
            h(
              'code',
              {
                class:
                  'text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded',
              },
              subdomain
            ),
          ])
        : h('span', { class: 'text-sm text-gray-400' }, '-')
    },
    meta: {
      class: {
        td: 'w-[180px]',
      },
    },
  },
  {
    accessorKey: 'isPartnership',
    header: 'Partnership',
    cell: ({ row }) => {
      const tenant = row.original
      return tenant.isPartnership && tenant.percentage
        ? h('div', { class: 'flex items-center gap-1.5' }, [
            h('span', { class: 'i-lucide-handshake size-4 text-primary-500' }),
            h(
              'span',
              { class: 'text-sm font-medium text-gray-700 dark:text-gray-300' },
              `${tenant.percentage}%`
            ),
          ])
        : h('span', { class: 'text-sm text-gray-400' }, '-')
    },
    meta: {
      class: {
        td: 'w-[130px]',
      },
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Created',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      })
    },
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      return h(
        'div',
        {
          class:
            'flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400',
        },
        [
          h('span', { class: 'i-lucide-calendar size-3.5' }),
          h('span', formatDate(date, 'DD MMM YYYY HH:mm') || '-'),
        ]
      )
    },
    meta: {
      class: {
        td: 'w-[180px]',
      },
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          content: { align: 'end' },
          items: getTenantActions(row.original),
          'aria-label': 'Actions dropdown',
        },
        () =>
          h(UButton, {
            icon: 'i-lucide-more-vertical',
            color: 'neutral',
            variant: 'ghost',
            size: 'sm',
            'aria-label': 'Actions',
          })
      )
    },
    meta: {
      class: {
        td: 'text-right w-[60px]',
      },
    },
  },
]

const table = useTemplateRef('table')
const globalFilter = ref('')
const selectedStatus = ref<string | null>(null)
const sorting = ref([{ id: 'created_at', desc: true }])
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
})

const filteredData = computed(() => {
  let result = [...tenantStore.tenants]

  if (selectedStatus.value) {
    result = result.filter(
      (tenant: SuperadminTenant) => tenant.status === selectedStatus.value
    )
  }

  return result
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('superadmin.tenants.title') }}
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ t('superadmin.tenants.subtitle') }}
      </p>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="tenantStore.loading"
      class="flex items-center justify-center py-20"
    >
      <div class="flex flex-col items-center gap-4">
        <UIcon
          name="i-lucide-loader-2"
          class="size-10 text-primary-600 dark:text-primary-400 animate-spin"
        />
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Loading tenants...
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="tenantStore.error" class="text-center py-12">
      <div class="flex flex-col items-center gap-4">
        <div
          class="flex items-center justify-center size-16 rounded-full bg-red-100 dark:bg-red-900/20"
        >
          <UIcon name="i-lucide-alert-circle" class="size-8 text-red-500" />
        </div>
        <div>
          <p class="text-lg font-medium text-red-600 dark:text-red-400 mb-1">
            Error loading tenants
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ tenantStore.error }}
          </p>
        </div>
      </div>
    </div>

    <!-- Table -->
    <ClientOnly v-else>
      <UCard class="overflow-hidden">
      <template #header>
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
        <UInput
                v-model="globalFilter"
          :placeholder="t('superadmin.tenants.searchPlaceholder')"
          icon="i-lucide-search"
                class="w-2/4"
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
          :loading="tenantStore.loading"
          class="w-full"
        >
          <template #empty>
            <div class="text-center py-12">
              <div class="flex flex-col items-center gap-4">
                <div
                  class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
                >
        <UIcon
                    name="i-lucide-building-2"
                    class="size-8 text-gray-400"
        />
      </div>
                <div>
                  <p
                    class="text-lg font-medium text-gray-900 dark:text-white mb-1"
      >
        {{ t('superadmin.tenants.noTenantsFound') }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{
                      globalFilter || selectedStatus
                        ? 'Try adjusting your filters'
                        : 'No tenants in the system yet'
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
              Showing
              <span class="font-semibold text-gray-900 dark:text-white">
                {{
                  (table?.tableApi?.getState().pagination.pageIndex || 0) *
                    (table?.tableApi?.getState().pagination.pageSize || 10) +
                  1
                }}
              </span>
              to
              <span class="font-semibold text-gray-900 dark:text-white">
                {{
                  Math.min(
                    ((table?.tableApi?.getState().pagination.pageIndex || 0) +
                      1) *
                      (table?.tableApi?.getState().pagination.pageSize || 10),
                    table?.tableApi?.getFilteredRowModel().rows.length || 0
                  )
                }}
              </span>
              of
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
              </span>
              tenants
            </p>

            <UPagination
              :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
              :items-per-page="table?.tableApi?.getState().pagination.pageSize"
              :total="table?.tableApi?.getFilteredRowModel().rows.length"
              @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
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
                Loading tenants...
            </p>
          </div>
      </div>
    </UCard>
      </template>
    </ClientOnly>
  </div>
</template>
