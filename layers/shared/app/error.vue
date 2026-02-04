<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()

const statusCode = computed(() => props.error?.statusCode || 500)
const isNotFound = computed(() => statusCode.value === 404)

useHead(() => ({
  title: isNotFound.value ? '404 – Not Found' : t('shared.common.error'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
}))

function handleBackHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-xl text-center">
      <h1 class="text-4xl font-semibold">
        {{ isNotFound ? '404' : statusCode }}
      </h1>

      <p class="mt-3 text-lg">
        {{ isNotFound ? $t('shared.errors.notFound') : $t('shared.errors.generic') }}
      </p>

      <p v-if="!isNotFound" class="mt-2 text-sm opacity-80">
        {{ error?.message }}
      </p>

      <div class="mt-6 flex justify-center gap-3">
        <button class="px-4 py-2 border rounded" @click="handleBackHome">
          {{ $t('shared.errors.backHome') }}
        </button>
      </div>
    </div>
  </div>
</template>
