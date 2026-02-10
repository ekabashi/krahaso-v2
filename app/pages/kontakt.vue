<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig()

useSeoPage({
  title: () => `${t('contact.title')} - Krahaso.co`,
  description: () => t('contact.description'),
  canonical: '/kontakt',
  ogImage: () => `${(config.public as { siteUrl?: string }).siteUrl ?? 'https://krahaso.co'}/logoRed.png`,
})

const contactInfo = computed(() => [
  {
    icon: 'i-lucide-mail',
    title: t('contact.info.email'),
    value: 'info@krahaso.co',
    link: 'mailto:kontakt@krahaso.co'
  },
  {
    icon: 'i-lucide-phone',
    title: t('contact.info.phone'),
    value: '+383 49 999 408',
    link: 'tel:+38349999408'
  },
  {
    icon: 'i-lucide-clock',
    title: t('contact.info.hours'),
    value: t('contact.info.hoursDesc'),
    link: null
  }
])

useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        'name': t('contact.title'),
        'description': t('contact.description'),
        'url': 'https://krahaso.co/kontakt',
        'contactPoint': {
          '@type': 'ContactPoint',
          'email': 'kontakt@krahaso.co',
          'telephone': '+383 44 123 456',
          'contactType': 'customer service',
          'availableLanguage': ['sq', 'de', 'en']
        }
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
            'name': t('contact.title'),
            'item': 'https://krahaso.co/kontakt'
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
          { label: $t('contact.title') }
        ]"
        class="mb-6 sm:mb-8"
      />

      <!-- Hero Section -->
      <div class="mb-8 sm:mb-12 text-center">
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 sm:mb-6">
          {{ t('contact.title').toUpperCase() }}
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-4xl font-bold mb-4 sm:mb-6 text-foreground">
          {{ t('contact.subtitle') }}
        </h1>
        <p class="text-md sm:text-xl text-muted max-w-3xl mx-auto">
          {{ t('contact.description') }}
        </p>
      </div>

      <!-- Contact Information Section -->
      <div class="mb-8 sm:mb-12">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div
            v-for="info in contactInfo"
            :key="info.title"
            class="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-primary/30 p-6 sm:p-8 text-center shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            <!-- Decorative top accent -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary-500 to-primary-600" />
            
            <div class="flex flex-col items-center space-y-3 sm:space-y-4">
              <div class="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10">
                <UIcon
                  :name="info.icon"
                  class="h-7 w-7 sm:h-8 sm:w-8 text-primary"
                />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-base sm:text-lg mb-2 text-neutral-900 dark:text-white">
                  {{ info.title }}
                </h3>
                <component
                  :is="info.link ? 'a' : 'p'"
                  :href="info.link"
                  :class="[
                    'text-sm sm:text-base',
                    info.link ? 'text-primary hover:underline' : 'text-neutral-500 dark:text-neutral-400'
                  ]"
                >
                  {{ info.value }}
                </component>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
