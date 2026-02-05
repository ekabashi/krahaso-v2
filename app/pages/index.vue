<script setup lang="ts">
const localePath = useLocalePath()

useSeo({ title: 'Krahaso – Ballina' })
</script>

<template>
  <div>
    <UContainer class="py-8 sm:py-12">
      <div class="mb-10 text-center sm:mb-12">
        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
          Krahaso v2
        </h1>
        <p class="mt-2 text-muted">
          Shared Header/Footer duhet me u pa në çdo faqe.
        </p>
      </div>

      <section
        class="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-gray-50/50 p-6 dark:border-gray-700 dark:bg-gray-800/30 sm:p-8"
      >
        <div class="mb-6 text-center sm:mb-8">
          <h2 class="text-2xl font-bold sm:text-3xl">
            {{ $t('cars.title') }}
          </h2>
          <p class="mt-2 text-sm text-muted sm:text-base">
            {{ $t('cars.description') }}
          </p>
          <NuxtLink
            :to="localePath('/makina')"
            class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {{ $t('nav.cars') }}
            <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>
        <CarSearchForm embedded />
      </section>
    </UContainer>
  </div>
</template>
