<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

useSeoPage({
  title: () => `${t('about.title')} - Krahaso.co`,
  description: () => t('about.description'),
  canonical: '/rreth-nesh'
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
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ t('about.description') }}
        </h1>
      </div>

      <!-- Statistics Section -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
        <UCard
          v-for="stat in stats"
          :key="stat.label"
          :ui="{ body: 'p-6 sm:p-8' }"
          class="text-center"
        >
          <div class="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-2 sm:mb-3">
            {{ stat.value }}
          </div>
          <div class="text-sm sm:text-base text-muted">
            {{ stat.label }}
          </div>
        </UCard>
      </div>

      <!-- Mission and What We Offer Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-16">
        <!-- Mission Section -->
        <div>
          <h2 class="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">
            {{ t('about.mission.title') }}
          </h2>
          <div class="space-y-4 sm:space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
            <p>
              {{ t('about.mission.description') }}
            </p>
          </div>
        </div>

        <!-- What We Offer Section -->
        <div>
          <h2 class="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">
            {{ t('about.whatWeOffer.title') }}
          </h2>
          <UCard
            :ui="{ body: 'p-6 sm:p-8' }"
            class="bg-primary/5 border-primary/20"
          >
            <ul class="space-y-3 sm:space-y-4">
              <li class="flex items-start gap-3">
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                  <UIcon
                    name="i-lucide-check"
                    class="h-4 w-4"
                  />
                </div>
                <span class="text-sm sm:text-base text-muted-foreground">{{ t('about.whatWeOffer.item1') }}</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                  <UIcon
                    name="i-lucide-check"
                    class="h-4 w-4"
                  />
                </div>
                <span class="text-sm sm:text-base text-muted-foreground">{{ t('about.whatWeOffer.item2') }}</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                  <UIcon
                    name="i-lucide-check"
                    class="h-4 w-4"
                  />
                </div>
                <span class="text-sm sm:text-base text-muted-foreground">{{ t('about.whatWeOffer.item3') }}</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-0.5">
                  <UIcon
                    name="i-lucide-check"
                    class="h-4 w-4"
                  />
                </div>
                <span class="text-sm sm:text-base text-muted-foreground">{{ t('about.whatWeOffer.item4') }}</span>
              </li>
            </ul>
          </UCard>
        </div>
      </div>

      <!-- Why Choose Us Section -->
      <div class="mb-12 sm:mb-16">
        <h2 class="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ t('about.whyChooseUs.title') }}
        </h2>
        <UCard :ui="{ body: 'p-6 sm:p-8' }">
          <p class="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {{ t('about.whyChooseUs.description') }}
          </p>
        </UCard>
      </div>

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
              :to="localePath('/fluturime')"
              size="lg"
              color="neutral"
              variant="solid"
              trailing-icon="i-lucide-arrow-right"
              class="bg-white text-primary-700 hover:bg-primary-50 w-full sm:w-auto"
            >
              {{ t('nav.flights') }}
            </UButton>
            <UButton
              :to="localePath('/makina')"
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
