<script setup lang="ts">
definePageMeta({
  layout: 'superadmin',
  title: 'Settlement Requests',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('superadmin.settledRequests.title') }}
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ t('superadmin.settledRequests.subtitle') }}
      </p>
    </div>
    <UCard>
      <p class="text-gray-600 dark:text-gray-400">
        {{ t('superadmin.settledRequests.emptyState.title') }}
      </p>
    </UCard>
  </div>
</template>
