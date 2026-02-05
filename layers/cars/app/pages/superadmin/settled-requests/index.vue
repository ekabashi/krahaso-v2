<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useSettlementRequestStore } from '../../../stores/settlementRequestStore'
import type { TenantSettlementSummary } from '~/types'

definePageMeta({
  layout: 'superadmin',
  title: 'Settlement Requests',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const settlementRequestStore = useSettlementRequestStore()
const toast = useToast()
const router = useRouter()

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
})
const globalFilter = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const UButton = resolveComponent('UButton')

const fetchSummaries = async () => {
  try {
    await settlementRequestStore.fetchSummaries({
      page: pagination.value.pageIndex + 1,
      limit: pagination.value.pageSize,
      search: globalFilter.value,
    })
  } catch (error) {
    toast.add({
      title: t('superadmin.settledRequests.errors.title'),
      description:
        error instanceof Error
          ? error.message
          : t('superadmin.settledRequests.errors.fetchFailed'),
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
    fetchSummaries()
  }, 500)
})

watch(
  () => pagination.value.pageIndex,
  () => {
    fetchSummaries()
  }
)

watch(
  () => pagination.value.pageSize,
  () => {
    pagination.value.pageIndex = 0
    fetchSummaries()
  }
)

onMounted(() => {
  fetchSummaries()
})

const columns: TableColumn<TenantSettlementSummary>[] = [
  {
    accessorKey: 'tenant.company_name',
    header: t('superadmin.settledRequests.table.company'),
    cell: ({ row }) => {
      const summary = row.original
      const tenantId = summary.tenant_id
      return h(
        'div',
        { class: 'flex items-center gap-3' },
        [
          h('div', {
            class: summary.tenant.logo_url
              ? 'flex items-center justify-center size-10 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              : 'flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0',
          }, [
            summary.tenant.logo_url
              ? h('img', {
                  src: summary.tenant.logo_url,
                  alt: summary.tenant.company_name || summary.tenant.name || t('superadmin.settledRequests.errors.unnamedTenant'),
                  class: 'w-full h-full object-contain p-1',
                })
              : h('span', { class: 'i-lucide-building-2 size-5' }),
          ]),
          h(
            'div',
            {
              onClick: () => {
                void router.push(localePath(`/superadmin/settled-requests/${tenantId}`))
              },
              class: 'flex flex-col min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer',
            },
            [
              h('span', {
                class: 'font-semibold text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400',
              }, summary.tenant.company_name || summary.tenant.name || t('superadmin.settledRequests.errors.unnamedTenant')),
              summary.tenant.name && summary.tenant.name !== summary.tenant.company_name
                ? h('span', {
                    class: 'text-xs text-gray-500 dark:text-gray-400 truncate',
                  }, summary.tenant.name)
                : null,
            ]
          ),
        ]
      )
    },
  },
  {
    accessorKey: 'subdomain',
    header: t('superadmin.settledRequests.table.subdomain'),
    cell: ({ row }) => {
      const subdomain = row.original.subdomain
      return subdomain
        ? h('div', { class: 'flex items-center gap-1.5' }, [
            h('span', { class: 'i-lucide-globe size-4 text-gray-400' }),
            h('code', {
              class: 'text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded',
            }, subdomain),
          ])
        : h('span', { class: 'text-sm text-gray-400' }, '-')
    },
  },
  {
    accessorKey: 'request_count',
    header: t('superadmin.settledRequests.table.requestCount'),
    cell: ({ row }) => {
      const count = row.original.request_count
      const tenantId = row.original.tenant_id
      return h(
        UButton,
        {
          variant: 'ghost',
          color: 'primary',
          size: 'sm',
          icon: 'i-heroicons-arrow-top-right-on-square',
          onClick: (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            void router.push(localePath(`/superadmin/settled-requests/${tenantId}`))
          },
          class: 'font-semibold hover:underline',
        },
        {
          default: () => `${count} - ${t('superadmin.settledRequests.table.request')}`,
        }
      )
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
          {{ t('superadmin.settledRequests.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ t('superadmin.settledRequests.subtitle') }}
        </p>
      </div>
    </div>

    <UCard class="overflow-hidden">
      <template #header>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <UInput
              v-model="globalFilter"
              :placeholder="t('superadmin.settledRequests.searchPlaceholder')"
              icon="i-lucide-search"
              class="w-full sm:max-w-sm"
            />
          </div>
        </div>
      </template>

      <UTable
        ref="table"
        v-model:pagination="pagination"
        :data="settlementRequestStore.summaries"
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
                  {{ t('superadmin.settledRequests.emptyState.title') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('superadmin.settledRequests.emptyState.description') }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('superadmin.settledRequests.pagination.showing') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{
                settlementRequestStore.total === 0
                  ? 0
                  : pagination.pageIndex * pagination.pageSize + 1
              }}
            </span>
            {{ t('superadmin.settledRequests.pagination.to') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{
                Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  settlementRequestStore.total
                )
              }}
            </span>
            {{ t('superadmin.settledRequests.pagination.of') }}
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ settlementRequestStore.total }}
            </span>
            {{ t('superadmin.settledRequests.pagination.tenants') }}
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
  </div>
</template>
