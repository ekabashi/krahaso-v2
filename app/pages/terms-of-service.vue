<script setup lang="ts">
const { t } = useI18n()
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
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ t('terms.subtitle') }}
        </h1>
        <p class="text-lg sm:text-xl text-muted max-w-3xl mx-auto">
          {{ t('terms.description') }}
        </p>
      </div>

      <!-- Content Section -->
      <div class="max-w-4xl mx-auto">
        <UCard :ui="{ body: 'p-6 sm:p-8 lg:p-10' }">
          <div class="prose prose-sm sm:prose-base max-w-none">
            <h2 class="text-xl sm:text-2xl font-bold mb-4 text-foreground">
              {{ t('terms.section1.title') }}
            </h2>
            <p class="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              {{ t('terms.section1.content') }}
            </p>

            <h2 class="text-xl sm:text-2xl font-bold mb-4 text-foreground">
              {{ t('terms.section2.title') }}
            </h2>
            <p class="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              {{ t('terms.section2.content') }}
            </p>

            <h2 class="text-xl sm:text-2xl font-bold mb-4 text-foreground">
              {{ t('terms.section3.title') }}
            </h2>
            <p class="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              {{ t('terms.section3.content') }}
            </p>

            <h2 class="text-xl sm:text-2xl font-bold mb-4 text-foreground">
              {{ t('terms.section4.title') }}
            </h2>
            <p class="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              {{ t('terms.section4.content') }}
            </p>

            <p class="text-sm sm:text-base text-muted mt-8 pt-6 border-t border-default">
              Data e përditësimit: {{ new Date().toLocaleDateString('sq-AL') }}
            </p>
          </div>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>
