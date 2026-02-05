<script setup lang="ts">
import type { SuperadminTenant } from '~/types'
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

const searchQuery = ref('')

const filteredTenants = computed(() => {
  if (!searchQuery.value.trim()) return tenantStore.tenants
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

const getStatusLabel = (status: string | null) => {
  if (!status) return t('superadmin.tenants.status.unknown')
  return t(`superadmin.tenants.status.${status}`)
}

onMounted(async () => {
  try {
    await tenantStore.fetchTenants()
  } catch (error) {
    toast.add({
      title: t('superadmin.tenants.error.fetchFailed'),
      description:
        error instanceof Error ? error.message : t('superadmin.tenants.error.unknown'),
      color: 'error',
    })
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('superadmin.tenants.title') }}
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ t('superadmin.tenants.subtitle') }}
      </p>
    </div>

    <UCard>
      <template #header>
        <UInput
          v-model="searchQuery"
          :placeholder="t('superadmin.tenants.searchPlaceholder')"
          icon="i-lucide-search"
          class="max-w-sm"
        />
      </template>

      <div v-if="tenantStore.loading" class="flex justify-center py-12">
        <UIcon
          name="i-lucide-loader-2"
          class="size-8 text-primary-600 dark:text-primary-400 animate-spin"
        />
      </div>

      <div
        v-else-if="!filteredTenants.length"
        class="text-center py-12 text-gray-600 dark:text-gray-400"
      >
        {{ t('superadmin.tenants.noTenantsFound') }}
      </div>

      <div v-else class="space-y-2">
        <NuxtLink
          v-for="tenant in filteredTenants"
          :key="tenant.id"
          :to="localePath(`/superadmin/tenants/${tenant.id}`)"
          class="flex items-center gap-4 p-4 rounded-lg border border-default hover:bg-muted/50 transition-colors"
        >
          <div
            :class="
              tenant.logo_url
                ? 'flex items-center justify-center size-12 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-800 border'
                : 'flex items-center justify-center size-12 rounded-lg bg-primary-500 text-white shrink-0'
            "
          >
            <img
              v-if="tenant.logo_url"
              :src="tenant.logo_url"
              :alt="tenant.company_name || tenant.name || 'Logo'"
              class="w-full h-full object-contain p-1"
            />
            <UIcon v-else name="i-lucide-building-2" class="size-6" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-white truncate">
                {{ tenant.company_name || tenant.name || 'Unnamed' }}
              </span>
              <UBadge
                v-if="tenant.status"
                :label="getStatusLabel(tenant.status)"
                :color="getTenantStatusColor(tenant.status)"
                variant="subtle"
                size="xs"
              />
            </div>
            <p v-if="tenant.public_email" class="text-sm text-gray-500 truncate">
              {{ tenant.public_email }}
            </p>
            <p v-if="tenant.subdomain" class="text-xs text-gray-400">
              {{ tenant.subdomain }}
            </p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-5 text-gray-400" />
        </NuxtLink>
      </div>
    </UCard>
  </div>
</template>
