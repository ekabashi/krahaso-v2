<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const localePath = useLocalePath()

const statusCode = computed(() => props.error?.statusCode || 500)
const isNotFound = computed(() => statusCode.value === 404)

useHead(() => ({
  title: isNotFound.value ? '404 – Not Found' : t('shared.common.error'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
}))
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <div class="w-full max-w-2xl text-center">
      <!-- Animated 404 or Status Code -->
      <div class="relative mb-8">
        <h1
          class="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600 animate-pulse"
          :class="{
            'error-animation': isNotFound
          }"
        >
          {{ isNotFound ? '404' : statusCode }}
        </h1>
        <!-- Decorative circles -->
        <div class="absolute -top-4 -left-4 w-24 h-24 bg-primary-200 dark:bg-primary-800 rounded-full opacity-20 blur-2xl animate-pulse" />
        <div class="absolute -bottom-4 -right-4 w-32 h-32 bg-primary-300 dark:bg-primary-700 rounded-full opacity-20 blur-2xl animate-pulse delay-300" />
      </div>

      <!-- Error Message -->
      <div class="space-y-4 mb-8">
        <h2 class="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {{ isNotFound ? $t('shared.errors.notFound') : $t('shared.errors.generic') }}
        </h2>

        <p
          v-if="!isNotFound"
          class="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto"
        >
          {{ error?.message }}
        </p>

        <p
          v-else
          class="text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto"
        >
          {{ $t('shared.errors.notFound') }}
        </p>
      </div>

      <!-- Action Button -->
      <div class="flex justify-center gap-3">
        <UButton
          :to="localePath('/')"
          color="primary"
          size="lg"
          icon="i-lucide-home"
          class="px-6 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          {{ $t('shared.errors.backHome') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-animation {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

.delay-300 {
  animation-delay: 300ms;
}
</style>
