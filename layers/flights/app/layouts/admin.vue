<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const localePath = useLocalePath()
const { user, signOut } = useAuth()

const analyticsPath = computed(() => localePath('/admin/analytics'))
const routesPath = computed(() => localePath('/admin/routes'))
const providersPath = computed(() => localePath('/admin/providers'))
const botPath = computed(() => localePath('/admin/bot'))
const settingsPath = computed(() => localePath('/admin/settings'))

const navigationItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: analyticsPath.value,
      active: route.path === analyticsPath.value
    },
    {
      label: 'Routen',
      icon: 'i-lucide-map-pin',
      to: routesPath.value,
      active: route.path === routesPath.value
    },
    {
      label: 'Provider',
      icon: 'i-lucide-building-2',
      to: providersPath.value,
      active: route.path === providersPath.value
    },
    {
      label: 'WhatsApp Bot',
      icon: 'i-lucide-message-circle',
      to: botPath.value,
      active: route.path === botPath.value
    }
  ],
  [
    {
      label: 'Einstellungen',
      icon: 'i-lucide-settings',
      to: settingsPath.value,
      active: route.path === settingsPath.value
    },
    {
      label: 'Zur Website',
      icon: 'i-lucide-external-link',
      to: localePath('/'),
      target: '_blank'
    }
  ]
])

const userName = computed(() => user.value?.name || user.value?.email || 'Admin')
const userEmail = computed(() => user.value?.email || '')

</script>

<template>
  <NuxtLoadingIndicator color="var(--ui-primary)" :height="3" />

  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      :min-size="12"
      :max-size="20"
      :default-size="15"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          :to="analyticsPath"
          class="flex items-center gap-2"
        >
          <UIcon
            name="i-lucide-plane"
            class="size-6 text-primary"
          />
          <span
            v-if="!collapsed"
            class="text-lg font-bold"
          >Krahaso Flights</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems[1]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <div class="flex items-center gap-2">
              <UColorModeButton />

              <UDropdownMenu
                :items="[
                  [{
                    label: userEmail || 'User',
                    type: 'label'
                  }],
                  [{
                    label: 'Logout',
                    icon: 'i-lucide-log-out',
                    onSelect: signOut
                  }]
                ]"
              >
                <UButton
                  icon="i-lucide-user"
                  color="neutral"
                  variant="ghost"
                  :label="userName"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <Suspense>
          <slot />

          <template #fallback>
            <div class="p-6 space-y-6">
              <div class="flex items-center justify-between">
                <USkeleton class="h-8 w-48" />
                <USkeleton class="h-10 w-32" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <USkeleton
                  v-for="i in 4"
                  :key="i"
                  class="h-24 rounded-lg"
                />
              </div>

              <div class="space-y-4">
                <USkeleton class="h-10 w-full" />
                <USkeleton class="h-64 w-full rounded-lg" />
              </div>
            </div>
          </template>
        </Suspense>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
