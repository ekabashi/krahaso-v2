<script setup lang="ts">
interface Props {
  title: string
  description: string
  /** 'hero' = homepage (larger text, no rounded card), 'section' = product pages (smaller text, rounded card) */
  variant?: 'hero' | 'section'
}

withDefaults(defineProps<Props>(), {
  variant: 'section'
})
</script>

<template>
  <UPageSection
    :class="[
      'bg-linear-to-br from-primary-600 to-primary-700 text-white',
      variant === 'section' && 'rounded-2xl p-6 sm:p-8'
    ]"
  >
    <div class="mx-auto max-w-2xl px-4 text-center sm:px-6">
      <h2
        :class="[
          'font-bold mb-3 sm:mb-4',
          variant === 'hero' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
        ]"
      >
        {{ title }}
      </h2>
      <p
        :class="[
          'text-primary-100',
          variant === 'hero' ? 'text-base sm:text-lg mb-6 sm:mb-8' : 'text-sm sm:text-base mb-4 sm:mb-6'
        ]"
      >
        {{ description }}
      </p>
      <div class="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
        <slot />
      </div>
    </div>
  </UPageSection>
</template>
