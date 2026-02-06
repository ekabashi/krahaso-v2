<script setup lang="ts">
import type { SuperadminTenant } from '../../types'
import { useTenantStore } from '../../stores/tenantStore'
import { useSuperadminDashboardStore } from '../../stores/superadminDashboardStore'

definePageMeta({
  layout: 'superadmin',
  title: 'Dashboard',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const toast = useToast()

const isPartnersModalOpen = ref(false)
const searchQuery = ref('')
const dashboardStore = useSuperadminDashboardStore()

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('sq-AL', {
    maximumFractionDigits: 0,
  }).format(num)
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const partnersAndCarsCard = computed(() => ({
  label: t('superadmin.dashboard.stats.partnersAndCars'),
  items: [
    {
      label: t('superadmin.dashboard.stats.totalPartners'),
      value: dashboardStore.stats
        ? formatNumber(dashboardStore.stats.totalPartners)
        : '-',
      icon: 'i-lucide-building-2',
    },
    {
      label: t('superadmin.dashboard.stats.activeCars'),
      value: dashboardStore.stats
        ? formatNumber(dashboardStore.stats.activeCars)
        : '-',
      icon: 'i-lucide-car',
    },
  ],
}))

const totalBookingsCard = computed(() => ({
  label: t('superadmin.dashboard.stats.totalBookings'),
  value: dashboardStore.stats
    ? formatNumber(dashboardStore.stats.totalBookings)
    : '-',
  icon: 'i-lucide-calendar-check',
  color: 'primary',
}))

const secondRowStats = computed(() => [
  {
    label: t('superadmin.dashboard.stats.totalFee'),
    value: dashboardStore.stats
      ? formatCurrency(dashboardStore.stats.totalFee)
      : '-',
    icon: 'i-lucide-coins',
    color: 'info',
  },
  {
    label: t('superadmin.dashboard.stats.revenue'),
    value: dashboardStore.stats
      ? formatCurrency(dashboardStore.stats.totalRevenue)
      : '-',
    icon: 'i-lucide-euro',
    color: 'warning',
  },
])

const actionItems = computed(() => [
  {
    label: t('superadmin.dashboard.actions.partnershipRequests'),
    icon: 'i-lucide-handshake',
    route: localePath('/superadmin/partnership-requests'),
    pendingCount: dashboardStore.stats?.pendingPartnershipRequests ?? 0,
  },
  {
    label: t('superadmin.dashboard.actions.settlementRequests'),
    icon: 'i-lucide-file-check',
    route: localePath('/superadmin/settled-requests'),
    pendingCount: dashboardStore.stats?.pendingSettlementRequests ?? 0,
  },
  {
    label: t('superadmin.dashboard.actions.viewReports'),
    icon: 'i-lucide-file-text',
    action: 'openReportsModal',
    pendingCount: 0,
  },
])

const isReportsModalOpen = ref(false)
const selectedTenantForReport = ref<number | null>(null)

onMounted(() => {
  dashboardStore.fetchDashboardStats()
  dashboardStore.fetchMonthlyRevenue()
})

const openReportsModal = async () => {
  isReportsModalOpen.value = true
  try {
    if (tenantStore.tenants.length === 0) {
      await tenantStore.fetchTenants()
    }
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
}

const closeReportsModal = () => {
  isReportsModalOpen.value = false
  selectedTenantForReport.value = null
}

const handleTenantSelectForReport = (tenant: SuperadminTenant) => {
  selectedTenantForReport.value = tenant.id
  closeReportsModal()
  navigateTo(localePath(`/superadmin/tenants/${tenant.id}/reconciliation-history`))
}

const openPartnersModal = async () => {
  isPartnersModalOpen.value = true
  try {
    if (tenantStore.tenants.length === 0) {
      await tenantStore.fetchTenants()
    }
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
}

const closePartnersModal = () => {
  isPartnersModalOpen.value = false
  searchQuery.value = ''
}

const filteredTenants = computed(() => {
  if (!searchQuery.value.trim()) {
    return tenantStore.tenants
  }
  const query = searchQuery.value.toLowerCase().trim()
  return tenantStore.tenants.filter((tenant: SuperadminTenant) => {
    const companyName = (tenant.company_name ?? '').toLowerCase()
    const name = (tenant.name ?? '').toLowerCase()
    const email = (tenant.public_email ?? '').toLowerCase()
    const subdomain = (tenant.subdomain ?? '').toLowerCase()
    return (
      companyName.includes(query) ||
      name.includes(query) ||
      email.includes(query) ||
      subdomain.includes(query)
    )
  })
})

const handleTenantClick = (tenant: SuperadminTenant) => {
  closePartnersModal()
  navigateTo(localePath(`/superadmin/tenants/${tenant.id}`))
}

const getTenantStatusColor = (
  status: string | null,
): 'success' | 'warning' | 'error' | 'neutral' => {
  if (!status) return 'neutral'
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    suspended: 'error',
  }
  return colors[status] ?? 'neutral'
}

const getStatusLabelForTenant = (status: string | null) => {
  if (!status) return t('superadmin.tenants.status.unknown')
  return t(`superadmin.tenants.status.${status}`)
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-6">
      <!-- First row: Partners & Cars + Total Bookings -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard
          :ui="{ body: 'p-6' }"
          class="cursor-pointer transition-all hover:border-primary-500 hover:shadow-md"
          @click="openPartnersModal"
        >
          <div class="flex flex-col gap-4">
            <h3 class="text-sm text-gray-600 dark:text-gray-400">
              {{ partnersAndCarsCard.label }}
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="item in partnersAndCarsCard.items"
                :key="item.label"
                class="flex flex-col gap-2"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                  >
                    <UIcon
                      :name="item.icon"
                      class="size-5 text-gray-700 dark:text-gray-300"
                    />
                  </div>
                  <div class="flex font-medium flex-col">
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ item.label }}
                    </p>
                    <div
                      v-if="dashboardStore.loading"
                      class="flex items-center gap-2"
                    >
                      <UIcon
                        name="i-lucide-loader-2"
                        class="size-4 text-gray-400 animate-spin"
                      />
                    </div>
                    <p
                      v-else
                      class="text-xl font-semibold text-gray-900 dark:text-white"
                    >
                      {{ item.value }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-6' }">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ totalBookingsCard.label }}
              </p>
              <div v-if="dashboardStore.loading" class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-loader-2"
                  class="size-5 text-gray-400 animate-spin"
                />
              </div>
              <p
                v-else
                class="text-3xl font-semibold text-gray-900 dark:text-white"
              >
                {{ totalBookingsCard.value }}
              </p>
            </div>
            <div
              class="flex size-14 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20"
            >
              <UIcon
                :name="totalBookingsCard.icon"
                class="size-7 text-primary-600 dark:text-primary-400"
              />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Second row: Fee + Total Revenue -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard
          v-for="stat in secondRowStats"
          :key="stat.label"
          :ui="{ body: 'p-6' }"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ stat.label }}
              </p>
              <div v-if="dashboardStore.loading" class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-loader-2"
                  class="size-5 text-gray-400 animate-spin"
                />
              </div>
              <p
                v-else
                class="text-3xl font-semibold text-gray-900 dark:text-white"
              >
                {{ stat.value }}
              </p>
            </div>
            <div
              class="flex size-14 items-center justify-center rounded-lg"
              :class="
                stat.color === 'info'
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'bg-amber-50 dark:bg-amber-900/20'
              "
            >
              <UIcon
                :name="stat.icon"
                class="size-7"
                :class="
                  stat.color === 'info'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-amber-600 dark:text-amber-400'
                "
              />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Quick Actions -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ t('superadmin.dashboard.quickActions') }}
          </h3>
        </template>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <template v-for="action in actionItems" :key="action.label">
            <NuxtLink
              v-if="action.route"
              :to="action.route"
              class="group relative flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:shadow-md cursor-pointer"
            >
              <div
                class="flex size-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors"
              >
                <UIcon
                  :name="action.icon"
                  class="size-6 text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                />
              </div>
              <div class="flex-1">
                <p
                  class="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                >
                  {{ action.label }}
                </p>
              </div>
              <!-- Pending counter badge -->
              <div
                v-if="action.pendingCount > 0"
                class="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900"
              >
                {{ action.pendingCount }}
              </div>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-5 text-gray-400 group-hover:text-primary-500 transition-colors"
              />
            </NuxtLink>

            <div
              v-else
              class="group relative flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:shadow-md cursor-pointer"
              @click="action.action ? openReportsModal() : null"
            >
              <div
                class="flex size-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors"
              >
                <UIcon
                  :name="action.icon"
                  class="size-6 text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                />
              </div>
              <div class="flex-1">
                <p
                  class="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                >
                  {{ action.label }}
                </p>
              </div>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-5 text-gray-400 group-hover:text-primary-500 transition-colors"
              />
            </div>
          </template>
        </div>
      </UCard>

      <!-- Charts grid -->
      <div
        v-if="dashboardStore.monthlyRevenue.length > 0"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">
                  {{ t('superadmin.dashboard.stats.revenue') }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('superadmin.dashboard.stats.revenueHistory') }}
                </p>
              </div>
            </div>
          </template>
          <div class="h-80">
            <SuperadminRevenueChart :data="dashboardStore.monthlyRevenue" />
          </div>
        </UCard>

        <UCard class="lg:col-span-1">
          <template #header>
            <div>
              <h3 class="text-lg font-semibold">
                {{ t('superadmin.dashboard.stats.totalBookings') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ t('superadmin.dashboard.stats.bookingsHistory') }}
              </p>
            </div>
          </template>
          <div class="h-80">
            <SuperadminBookingsChart :data="dashboardStore.monthlyRevenue" />
          </div>
        </UCard>
      </div>
    </div>

    <!-- Partners modal (list + search, click -> tenant detail) -->
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
          v-if="isPartnersModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closePartnersModal"
        >
          <div
            class="fixed inset-0 bg-black/50 backdrop-blur-sm"
            @click="closePartnersModal"
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
              v-if="isPartnersModalOpen"
              class="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col"
              :ui="{ body: 'flex-1 overflow-hidden flex flex-col' }"
            >
              <template #header>
                <div class="flex flex-col gap-4">
                  <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                      {{ t('superadmin.tenants.title') }}
                    </h2>
                    <UButton
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      @click="closePartnersModal"
                    />
                  </div>
                  <UInput
                    v-model="searchQuery"
                    :placeholder="t('superadmin.tenants.searchPlaceholder')"
                    icon="i-lucide-search"
                    autofocus
                  />
                </div>
              </template>
              <div class="flex-1 overflow-y-auto">
                <div
                  v-if="tenantStore.loading"
                  class="flex items-center justify-center py-12"
                >
                  <div class="flex flex-col items-center gap-4">
                    <UIcon
                      name="i-lucide-loader-2"
                      class="size-8 text-primary-600 dark:text-primary-400 animate-spin"
                    />
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ t('superadmin.tenants.loadingPartners') }}
                    </p>
                  </div>
                </div>
                <div
                  v-else-if="tenantStore.error"
                  class="text-center py-12"
                >
                  <div class="flex flex-col items-center gap-4">
                    <div
                      class="flex items-center justify-center size-16 rounded-full bg-red-100 dark:bg-red-900/20"
                    >
                      <UIcon name="i-lucide-alert-circle" class="size-8 text-red-500" />
                    </div>
                    <div>
                      <p class="text-lg font-medium text-red-600 dark:text-red-400 mb-1">
                        {{ t('superadmin.tenants.errorLoadingPartners') }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ tenantStore.error }}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="filteredTenants.length > 0"
                  class="space-y-2"
                >
                  <div
                    v-for="tenant in filteredTenants"
                    :key="tenant.id"
                    class="flex items-center gap-4 p-4 rounded-lg border border-default transition-colors hover:bg-muted/50 cursor-pointer"
                    @click="handleTenantClick(tenant)"
                  >
                    <div
                      :class="
                        tenant.logo_url
                          ? 'flex items-center justify-center size-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          : 'flex items-center justify-center size-12 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0'
                      "
                    >
                      <img
                        v-if="tenant.logo_url"
                        :src="tenant.logo_url"
                        :alt="tenant.company_name || tenant.name || 'Company logo'"
                        class="w-full h-full object-contain p-1"
                      />
                      <UIcon v-else name="i-lucide-building-2" class="size-6" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                          {{ tenant.company_name || tenant.name || t('superadmin.tenants.unnamedTenant') }}
                        </h3>
                        <UBadge
                          v-if="tenant.status"
                          :label="getStatusLabelForTenant(tenant.status)"
                          :color="getTenantStatusColor(tenant.status)"
                          variant="subtle"
                          size="xs"
                        />
                      </div>
                      <div class="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <div
                          v-if="tenant.name && tenant.name !== tenant.company_name"
                          class="truncate"
                        >
                          {{ tenant.name }}
                        </div>
                        <div
                          v-if="tenant.public_email"
                          class="flex items-center gap-1.5 truncate"
                        >
                          <UIcon name="i-lucide-mail" class="size-3.5 shrink-0" />
                          <span class="truncate">{{ tenant.public_email }}</span>
                        </div>
                        <div
                          v-if="tenant.subdomain"
                          class="flex items-center gap-1.5 truncate"
                        >
                          <UIcon name="i-lucide-globe" class="size-3.5 shrink-0" />
                          <code
                            class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                          >
                            {{ tenant.subdomain }}
                          </code>
                        </div>
                      </div>
                    </div>
                    <UIcon name="i-lucide-arrow-right" class="size-5 text-gray-400 shrink-0" />
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div class="flex flex-col items-center gap-4">
                    <div
                      class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon name="i-lucide-building-2" class="size-8 text-gray-400" />
                    </div>
                    <div>
                      <p class="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {{ searchQuery ? t('superadmin.tenants.noPartnersFoundSearch') : t('superadmin.tenants.noTenantsFound') }}
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ searchQuery ? t('superadmin.tenants.tryAdjustingSearch') : t('superadmin.tenants.noPartnersAvailable') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Reports Modal -->
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
          v-if="isReportsModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeReportsModal"
        >
          <div
            class="fixed inset-0 bg-black/50 backdrop-blur-sm"
            @click="closeReportsModal"
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
              v-if="isReportsModalOpen"
              class="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col"
              :ui="{ body: 'flex-1 overflow-hidden flex flex-col' }"
            >
              <template #header>
                <div class="flex flex-col gap-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                        {{ t('superadmin.dashboard.actions.viewReports') }}
                      </h2>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {{ t('superadmin.dashboard.reportsModal.subtitle') }}
                      </p>
                    </div>
                    <UButton
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      @click="closeReportsModal"
                    />
                  </div>
                  <UInput
                    v-model="searchQuery"
                    :placeholder="t('superadmin.tenants.searchPlaceholder')"
                    icon="i-lucide-search"
                    autofocus
                  />
                </div>
              </template>
              <div class="flex-1 overflow-y-auto">
                <div
                  v-if="tenantStore.loading"
                  class="flex items-center justify-center py-12"
                >
                  <div class="flex flex-col items-center gap-4">
                    <UIcon
                      name="i-lucide-loader-2"
                      class="size-8 text-primary-600 dark:text-primary-400 animate-spin"
                    />
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ t('superadmin.tenants.loadingPartners') }}
                    </p>
                  </div>
                </div>
                <div
                  v-else-if="tenantStore.error"
                  class="text-center py-12"
                >
                  <div class="flex flex-col items-center gap-4">
                    <div
                      class="flex items-center justify-center size-16 rounded-full bg-red-100 dark:bg-red-900/20"
                    >
                      <UIcon name="i-lucide-alert-circle" class="size-8 text-red-500" />
                    </div>
                    <div>
                      <p class="text-lg font-medium text-red-600 dark:text-red-400 mb-1">
                        {{ t('superadmin.tenants.errorLoadingPartners') }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ tenantStore.error }}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="filteredTenants.length > 0"
                  class="space-y-2"
                >
                  <div
                    v-for="tenant in filteredTenants"
                    :key="tenant.id"
                    class="flex items-center gap-4 p-4 rounded-lg border border-default transition-colors hover:bg-muted/50 cursor-pointer"
                    @click="handleTenantSelectForReport(tenant)"
                  >
                    <div
                      :class="
                        tenant.logo_url
                          ? 'flex items-center justify-center size-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          : 'flex items-center justify-center size-12 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-md shrink-0'
                      "
                    >
                      <img
                        v-if="tenant.logo_url"
                        :src="tenant.logo_url"
                        :alt="tenant.company_name || tenant.name || 'Company logo'"
                        class="w-full h-full object-contain p-1"
                      />
                      <UIcon v-else name="i-lucide-building-2" class="size-6" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                          {{ tenant.company_name || tenant.name || t('superadmin.tenants.unnamedTenant') }}
                        </h3>
                        <UBadge
                          v-if="tenant.status"
                          :label="getStatusLabelForTenant(tenant.status)"
                          :color="getTenantStatusColor(tenant.status)"
                          variant="subtle"
                          size="xs"
                        />
                      </div>
                      <div
                        v-if="tenant.subdomain"
                        class="flex items-center gap-1.5 truncate text-sm text-gray-600 dark:text-gray-400"
                      >
                        <UIcon name="i-lucide-globe" class="size-3.5 shrink-0" />
                        <code class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {{ tenant.subdomain }}
                        </code>
                      </div>
                    </div>
                    <UIcon name="i-lucide-file-text" class="size-5 text-gray-400 shrink-0" />
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div class="flex flex-col items-center gap-4">
                    <div
                      class="flex items-center justify-center size-16 rounded-full bg-gray-100 dark:bg-gray-800"
                    >
                      <UIcon name="i-lucide-building-2" class="size-8 text-gray-400" />
                    </div>
                    <div>
                      <p class="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {{ searchQuery ? t('superadmin.tenants.noPartnersFoundSearch') : t('superadmin.tenants.noTenantsFound') }}
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ searchQuery ? t('superadmin.tenants.tryAdjustingSearch') : t('superadmin.tenants.noPartnersAvailable') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
