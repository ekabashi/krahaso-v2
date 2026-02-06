<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

useSeoPage({
  title: () => `${t('cookiePolicy.title')} - Krahaso.co`,
  description: () => t('cookiePolicy.description'),
  canonical: localePath('/cookie-policy'),
  ogImage: () => `${config.public.siteUrl}/logoRed.png`,
})

const siteUrl = config.public.siteUrl || 'https://krahaso.co'
const cookiePolicyUrl = `${siteUrl}${localePath('/cookie-policy')}`

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: t('cookiePolicy.title'),
        description: t('cookiePolicy.description'),
        url: cookiePolicyUrl,
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('nav.home'), item: siteUrl },
          { '@type': 'ListItem', position: 2, name: t('cookiePolicy.title'), item: cookiePolicyUrl },
        ],
      }),
    },
  ],
})

const localeToDateLocale = (loc: string) => {
  if (loc === 'sq') return 'sq-AL'
  if (loc === 'de') return 'de-DE'
  return 'en-GB'
}
const formattedDate = computed(() =>
  new Date().toLocaleDateString(localeToDateLocale(locale.value)),
)
</script>

<template>
  <div>
    <UContainer class="py-8 sm:py-12">
      <UBreadcrumb
        :items="[
          { label: $t('nav.home'), to: localePath('/') },
          { label: $t('cookiePolicy.title') },
        ]"
        class="mb-6 sm:mb-8"
      />

      <div class="mb-8 text-center sm:mb-12">
        <div
          class="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary sm:mb-6"
        >
          {{ t('cookiePolicy.title').toUpperCase() }}
        </div>
        <h1 class="mb-4 text-3xl font-bold text-foreground sm:mb-6 sm:text-4xl lg:text-5xl">
          {{ t('cookiePolicy.subtitle') }}
        </h1>
        <p class="mx-auto max-w-3xl text-lg text-muted sm:text-xl">
          {{ t('cookiePolicy.description') }}
        </p>
      </div>

      <div class="mx-auto max-w-4xl">
        <UCard :ui="{ body: 'p-6 sm:p-8 lg:p-10' }">
          <div class="prose prose-sm max-w-none sm:prose-base">
            <h2 class="mb-4 text-xl font-bold text-foreground sm:text-2xl">
              {{ t('cookiePolicy.section1.title') }}
            </h2>
            <p class="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {{ t('cookiePolicy.section1.content') }}
            </p>

            <h2 class="mb-4 text-xl font-bold text-foreground sm:text-2xl">
              {{ t('cookiePolicy.section2.title') }}
            </h2>
            <p class="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {{ t('cookiePolicy.section2.content') }}
            </p>

            <h2 class="mb-4 text-xl font-bold text-foreground sm:text-2xl">
              {{ t('cookiePolicy.section3.title') }}
            </h2>
            <p class="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {{ t('cookiePolicy.section3.content') }}
            </p>

            <h2 class="mb-4 text-xl font-bold text-foreground sm:text-2xl">
              {{ t('cookiePolicy.section4.title') }}
            </h2>
            <p class="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {{ t('cookiePolicy.section4.content') }}
            </p>

            <p class="mt-8 border-t border-default pt-6 text-sm text-muted sm:text-base">
              {{ t('cookiePolicy.lastUpdated') }}: {{ formattedDate }}
            </p>
          </div>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>
