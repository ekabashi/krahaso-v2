<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/stores/authStore'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const authStore = useAuthStore()
const toast = useToast()

const navigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: t('superadmin.navigation.dashboard'),
    icon: 'i-lucide-layout-dashboard',
    to: localePath('/superadmin'),
  },
  {
    label: t('superadmin.navigation.partnershipRequests'),
    icon: 'i-lucide-handshake',
    to: localePath('/superadmin/partnership-requests'),
  },
  {
    label: t('superadmin.navigation.tenants'),
    icon: 'i-lucide-building-2',
    to: localePath('/superadmin/tenants'),
  },
  {
    label: t('superadmin.navigation.bookings'),
    icon: 'i-lucide-calendar',
    to: localePath('/superadmin/bookings'),
  },
  {
    label: t('superadmin.navigation.settledRequest'),
    icon: 'i-lucide-arrow-left-right',
    to: localePath('/superadmin/settled-requests'),
    active: route.path.includes('/superadmin/settled-requests'),
  },
])

const user = computed(() => ({
  name: authStore.user?.name ?? 'Super Admin',
  email: authStore.user?.email ?? '',
  avatar:
    authStore.user?.avatar ??
    'https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin',
}))

const userMenuItems = computed(() => [
  [
    {
      label: t('superadmin.profile'),
      icon: 'i-lucide-user',
      onSelect: () => {
        toast.add({
          title: t('superadmin.profile'),
          description: 'Profile page coming soon',
          color: 'info',
        })
      },
    },
    {
      label: t('superadmin.settings'),
      icon: 'i-lucide-settings',
      onSelect: () => {
        toast.add({
          title: t('superadmin.settings'),
          description: 'Settings page coming soon',
          color: 'info',
        })
      },
    },
  ],
  [
    {
      label: t('superadmin.logout'),
      icon: 'i-lucide-log-out',
      color: 'error' as const,
      onSelect: async () => {
        try {
          await authStore.logout()
          toast.add({
            title: t('superadmin.logout'),
            description: 'You have been logged out successfully',
            color: 'success',
          })
        } catch (error) {
          toast.add({
            title: 'Error',
            description:
              error instanceof Error ? error.message : 'Failed to log out',
            color: 'error',
          })
        }
      },
    },
  ],
])
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
    :min-size="16"
    :default-size="18"
    :max-size="24"
    :ui="{
      root: 'bg-gray-100 dark:bg-gray-900/50 backdrop-blur-sm border-r border-gray-400/50 dark:border-gray-800/50',
      header: 'px-3 py-4 border-b border-gray-400/50 dark:border-gray-800/50',
      body: 'px-0 py-4',
      footer: 'px-3 py-4 border-t border-gray-400/50 dark:border-gray-800/50',
    }"
  >
    <template #header="{ collapsed }">
      <NuxtLink
        :to="localePath('/superadmin')"
        class="flex items-center gap-3 transition-opacity hover:opacity-80"
      >
        <div v-if="!collapsed" class="flex items-center gap-3 w-full">
          <div
            class="flex items-center justify-center size-10 rounded-xl overflow-hidden"
          >
            <img
              src="/logoRed.png"
              alt="Krahaso Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <div class="flex flex-col min-w-0">
            <span
              class="font-bold text-sm text-gray-900 dark:text-white truncate"
            >
              Krahaso
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
              Dashboard Management
            </span>
          </div>
        </div>
        <div
          v-else
          class="flex items-center justify-center size-10 rounded-xl overflow-hidden mx-auto"
        >
          <img
            src="/logoRed.png"
            alt="Krahaso Logo"
            class="w-full h-full object-contain"
          />
        </div>
      </NuxtLink>
    </template>

    <template #default="{ collapsed }">
      <ClientOnly>
        <div class="sticky top-0 z-10">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="navigationItems"
            orientation="vertical"
            :highlight="false"
            class="mt-4 space-y-1"
          >
            <template #item="{ item }">
              <ULink
                :to="item.to"
                :exact="item.to === localePath('/superadmin')"
                class="flex w-full items-center gap-3 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                active-class="bg-red-500 text-white shadow-sm"
                inactive-class="text-gray-700 hover:bg-red-500/10 hover:text-red-600"
              >
                <UIcon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
                <span v-if="!collapsed" class="truncate">
                  {{ item.label }}
                </span>
              </ULink>
            </template>
          </UNavigationMenu>
        </div>
        <template #fallback>
          <div class="sticky top-0 z-10 mt-4 space-y-1">
            <div
              v-for="item in navigationItems"
              :key="String(item.to)"
              class="flex w-full items-center gap-3 px-6 py-2 rounded-lg text-sm font-medium text-gray-700"
            >
              <UIcon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
              <span v-if="!collapsed" class="truncate">
                {{ item.label }}
              </span>
            </div>
          </div>
        </template>
      </ClientOnly>
    </template>

    <template #footer="{ collapsed }">
      <UDropdownMenu :items="userMenuItems">
        <UButton
          :avatar="{ src: user.avatar }"
          :label="collapsed ? undefined : user.name"
          :description="collapsed ? undefined : user.email"
          color="neutral"
          variant="ghost"
          class="w-full justify-start h-auto py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
          :block="collapsed"
        >
          <template #trailing>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180"
            />
          </template>
        </UButton>
      </UDropdownMenu>
    </template>
  </UDashboardSidebar>
</template>
