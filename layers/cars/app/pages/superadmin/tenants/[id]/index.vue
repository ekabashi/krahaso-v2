<script setup lang="ts">
definePageMeta({
  layout: 'superadmin',
  title: 'Tenant Details',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const tenantId = computed(() => Number(route.params.id))
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center gap-4">
      <NuxtLink
        :to="localePath('/superadmin/tenants')"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('superadmin.tenants.title') }}
      </NuxtLink>
    </div>
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('superadmin.tenants.details.title') }} #{{ tenantId }}
      </h1>
    </div>
    <UCard>
      <p class="text-gray-600 dark:text-gray-400">
        Tenant detail page – stats and reconciliation can be wired here.
      </p>
    </UCard>
  </div>
</template>
