<script setup lang="ts">
const { t, locale } = useI18n()
const config = useRuntimeConfig()

useSeoPage({
  title: () => `${t('terms.title')} - Krahaso.co`,
  description: () => t('terms.description'),
  canonical: '/terms-of-service',
  ogImage: () => `${(config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'}/logoRed.png`,
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': t('terms.title'),
        'description': t('terms.description'),
        'url': 'https://krahaso.co/terms-of-service'
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': t('nav.home'),
            'item': 'https://krahaso.co'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': t('terms.title'),
            'item': 'https://krahaso.co/terms-of-service'
          }
        ]
      })
    }
  ]
})
</script>

<template>
  <div>
    <UContainer class="py-8 sm:py-12">
      <UBreadcrumb
        :items="[
          { label: $t('nav.home'), to: '/' },
          { label: $t('terms.title') }
        ]"
        class="mb-6 sm:mb-8"
      />

      <!-- Hero Section -->
      <div class="mb-8 sm:mb-12 text-center">
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 sm:mb-6">
          {{ t('terms.title').toUpperCase() }}
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-4xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ t('terms.subtitle') }}
        </h1>
        <p class="text-md sm:text-lg text-muted max-w-3xl mx-auto">
          {{ t('terms.description') }}
        </p>
      </div>

      <!-- Content Section -->
      <div class="max-w-4xl mx-auto">
        <div class="relative">
          <div class="absolute -left-4 top-0 bottom-0 w-1 bg-linear-to-b from-primary-500 to-primary-600 rounded-full" />
          <div class="pl-6 space-y-8 sm:space-y-12">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {{ t('terms.section1.title') }}
              </h2>
              <p class="text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {{ t('terms.section1.content') }}
              </p>
            </div>

            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {{ t('terms.section2.title') }}
              </h2>
              <p class="text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {{ t('terms.section2.content') }}
              </p>
            </div>

            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {{ t('terms.section3.title') }}
              </h2>
              <p class="text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {{ t('terms.section3.content') }}
              </p>
            </div>

            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {{ t('terms.section4.title') }}
              </h2>
              <p class="text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {{ t('terms.section4.content') }}
              </p>
            </div>

            <div class="pt-8 border-t border-neutral-200 dark:border-neutral-800">
              <p class="text-base sm:text-sm text-neutral-500 dark:text-neutral-400">
                {{ t('terms.lastUpdated') }}: {{ new Date().toLocaleDateString(locale) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
