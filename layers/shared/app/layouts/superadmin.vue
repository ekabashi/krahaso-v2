<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <UDashboardGroup storage-key="superadmin-sidebar">
    <SuperadminSidebar />

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="t('superadmin.HeaderTitle')">
          <template #right>
            <div class="flex items-end justify-end gap-2">
              <LocaleSwitcher />
              <UColorModeButton />
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
