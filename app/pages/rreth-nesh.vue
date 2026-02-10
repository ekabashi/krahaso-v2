<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

useSeoPage({
  title: () => `${t('about.title')} - Krahaso.co`,
  description: () => t('about.description'),
  canonical: '/rreth-nesh',
  ogImage: () => `${(config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'}/logoRed.png`,
})

const stats = computed(() => [
  {
    value: t('about.stats.partners.value'),
    label: t('about.stats.partners.label')
  },
  {
    value: t('about.stats.searches.value'),
    label: t('about.stats.searches.label')
  },
  {
    value: t('about.stats.support.value'),
    label: t('about.stats.support.label')
  }
])

useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        'name': t('about.title'),
        'description': t('about.description'),
        'url': 'https://krahaso.co/rreth-nesh'
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
            'name': t('about.title'),
            'item': 'https://krahaso.co/rreth-nesh'
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
          { label: $t('about.title') }
        ]"
        class="mb-6 sm:mb-8"
      />

      <!-- Hero Section -->
      <div class="mb-8 sm:mb-12 text-center">
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 sm:mb-6">
          {{ t('about.title').toUpperCase() }}
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-4xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ t('about.description') }}
        </h1>
      </div>

      <!-- Statistics Section -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-primary/30 p-6 sm:p-8 text-center shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <!-- Decorative top accent -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary-500 to-primary-600" />
          
          <!-- Value -->
          <div class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary mb-2 sm:mb-3">
            {{ stat.value }}
          </div>
          
          <!-- Label -->
          <div class="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-medium">
            {{ stat.label }}
          </div>
        </div>
      </div>

      <!-- Mission and What We Offer Section -->
      <section class="py-12 sm:py-16 bg-white dark:bg-neutral-900 border-y border-neutral-100 dark:border-neutral-800 mb-12 sm:mb-16">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            <!-- Mission Section -->
            <div class="relative">
              <div class="absolute -left-4 top-0 bottom-0 w-1 bg-linear-to-b from-primary-500 to-primary-600 rounded-full" />
              <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {{ t('about.mission.title') }}
              </h2>
              <div class="space-y-3 text-base sm:text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
                <p>
                  {{ t('about.mission.description') }}
                </p>
              </div>
            </div>

            <!-- What We Offer Section -->
            <div class="relative">
              <div class="absolute -left-4 top-0 bottom-0 w-1 bg-linear-to-b from-primary-500 to-primary-600 rounded-full" />
              <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {{ t('about.whatWeOffer.title') }}
              </h2>
              <div class="space-y-3 text-base sm:text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
                <div class="flex items-start gap-3">
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                    <UIcon
                      name="i-lucide-check"
                      class="h-3 w-3"
                    />
                  </div>
                  <p>{{ t('about.whatWeOffer.item1') }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                    <UIcon
                      name="i-lucide-check"
                      class="h-3 w-3"
                    />
                  </div>
                  <p>{{ t('about.whatWeOffer.item2') }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                    <UIcon
                      name="i-lucide-check"
                      class="h-3 w-3"
                    />
                  </div>
                  <p>{{ t('about.whatWeOffer.item3') }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                    <UIcon
                      name="i-lucide-check"
                      class="h-3 w-3"
                    />
                  </div>
                  <p>{{ t('about.whatWeOffer.item4') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Choose Us Section -->
      <section class="mb-12 sm:mb-16">
        <div class="max-w-4xl mx-auto px-4 sm:px-6">
          <div class="relative">
            <div class="absolute -left-4 top-0 bottom-0 w-1 bg-linear-to-b from-primary-500 to-primary-600 rounded-full" />
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              {{ t('about.whyChooseUs.title') }}
            </h2>
            <div class="space-y-3 text-base sm:text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
              <p>
                {{ t('about.whyChooseUs.description') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <UCard
        :ui="{ body: 'p-8 sm:p-12' }"
        class="bg-linear-to-br from-primary-600 to-primary-700 text-white"
      >
        <div class="max-w-3xl mx-auto text-center">
          <h2 class="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
            {{ t('about.cta.title') }}
          </h2>
          <p class="text-base sm:text-lg text-primary-100 mb-6 sm:mb-8 leading-relaxed">
            {{ t('about.cta.description') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <UButton
              :to="localePath('fluturime')"
              size="lg"
              color="neutral"
              variant="solid"
              trailing-icon="i-lucide-arrow-right"
              class="bg-white text-primary-700 hover:bg-primary-50 w-full sm:w-auto"
            >
              {{ t('nav.flights') }}
            </UButton>
            <UButton
              :to="localePath('makina')"
              size="lg"
              color="neutral"
              variant="solid"
              trailing-icon="i-lucide-arrow-right"
              class="bg-white text-primary-700 hover:bg-primary-50 w-full sm:w-auto"
            >
              {{ t('nav.cars') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
