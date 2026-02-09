<script setup lang="ts">
// Extended page type for fluege content
interface FlugePage {
  title?: string
  description?: string
  origin?: string
  destination?: string
  originCity?: string
  destinationCity?: string
  image?: string
}

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const localePath = useLocalePath()

// Reserved slugs: fluturime index in other locales – redirect to localized fluturime page
// (DE uses ASCII path /fluge to avoid redirect loop with [slug] when path contained /flüge)
const slugParam = route.params.slug as string
const reservedFlightsSlugs = ['flights', 'fluturime', 'flüge', 'fluge']
if (slugParam && reservedFlightsSlugs.includes(slugParam)) {
  const targetPath = localePath('fluturime')
  if (route.path !== targetPath) {
    await navigateTo(targetPath)
  }
}

// WhatsApp link with pre-filled message
const whatsappLink = computed(() => {
  const number = config.public.whatsappNumber?.replace(/[^0-9]/g, '') || ''
  const message = `${origin.value} ${destination.value}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
})

const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection('fluege').path(route.path).first()
})

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  })
}

// Cast to extended type
const flugePage = page.value as FlugePage

// Extract route data
const origin = computed(() => flugePage?.origin || '')
const destination = computed(() => flugePage?.destination || '')
const originCity = computed(() => flugePage?.originCity || '')
const destinationCity = computed(() => flugePage?.destinationCity || '')
const image = computed(() => flugePage?.image || '')

// SEO
useSeoMeta({
  title: page.value.title as string,
  description: page.value.description as string,
  ogTitle: page.value.title as string,
  ogDescription: page.value.description as string,
  ogImage: flugePage.image
})

// Search link with pre-filled airports (keeps current locale)
const searchLink = computed(() => ({
  path: localePath('fluturime-search'),
  query: {
    from: origin.value,
    to: destination.value
  }
}))

// Related routes (excluding current)
const relatedRoutes = computed(() => {
  const routes = [
    { from: 'DUS', to: 'PRN', fromCity: 'Düsseldorf', toCity: 'Pristina', slug: 'duesseldorf-pristina' },
    { from: 'PRN', to: 'DUS', fromCity: 'Pristina', toCity: 'Düsseldorf', slug: 'pristina-duesseldorf' },
    { from: 'MUC', to: 'PRN', fromCity: 'München', toCity: 'Pristina', slug: 'muenchen-pristina' },
    { from: 'PRN', to: 'MUC', fromCity: 'Pristina', toCity: 'München', slug: 'pristina-muenchen' }
  ]
  return routes.filter(r => !(r.from === origin.value && r.to === destination.value))
})
</script>

<template>
  <div>
    <!-- Hero Section with Overlay -->
    <div
      class="
        relative h-75 w-full
        md:h-100
      "
    >
      <!-- Background Image -->
      <NuxtImg
        v-if="image"
        :src="image"
        :alt="page?.title"
        class="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <!-- Gradient Overlay -->
      <div
        class="
          absolute inset-0 bg-linear-to-t from-black/80 via-black/50 to-black/30
        "
      />

      <!-- Hero Content -->
      <div
        class="
          absolute inset-0 flex flex-col items-center justify-center px-4
          text-white
        "
      >
        <!-- Route Badge -->
        <div
          class="
            mb-4 flex items-center gap-3 rounded-full bg-white/10 px-6 py-2
            backdrop-blur-sm
          "
        >
          <span class="font-mono text-lg font-bold">{{ origin }}</span>
          <UIcon
            name="i-lucide-plane"
            class="h-5 w-5"
          />
          <span class="font-mono text-lg font-bold">{{ destination }}</span>
        </div>

        <h1
          class="
            mb-3 text-center text-2xl font-bold drop-shadow-lg
            md:text-4xl
          "
        >
          {{ originCity }} → {{ destinationCity }}
        </h1>

        <p
          class="
            mb-6 max-w-xl text-center text-sm text-white/90
            md:text-base
          "
        >
          {{ page?.description }}
        </p>

        <!-- CTA Button -->
        <NuxtLink :to="searchLink">
          <UButton
            size="xl"
            color="primary"
            class="px-8 shadow-lg"
          >
            <UIcon
              name="i-lucide-search"
              class="mr-2 h-5 w-5"
            />
            {{ t('flights.search.searchFlights') }}
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <UContainer class="py-8">
      <!-- Feature Boxes -->
      <div
        class="
          relative z-10 -mt-12 mb-8 grid grid-cols-2 gap-3
          md:grid-cols-4
        "
      >
        <UCard
          class="text-center shadow-lg"
          :ui="{ body: 'p-4' }"
        >
          <UIcon
            name="i-lucide-clock"
            class="mx-auto mb-2 h-8 w-8 text-primary-500"
          />
          <p class="text-2xl font-bold">
            ~2h
          </p>
          <p
            class="
              text-xs text-gray-500
              dark:text-gray-400
            "
          >
            {{ t('flights.duration') || 'Flugzeit' }}
          </p>
        </UCard>

        <UCard
          class="text-center shadow-lg"
          :ui="{ body: 'p-4' }"
        >
          <UIcon
            name="i-lucide-building-2"
            class="mx-auto mb-2 h-8 w-8 text-primary-500"
          />
          <p class="text-2xl font-bold">
            5
          </p>
          <p
            class="
              text-xs text-gray-500
              dark:text-gray-400
            "
          >
            {{ t('flights.providers') || 'Anbieter' }}
          </p>
        </UCard>

        <UCard
          class="text-center shadow-lg"
          :ui="{ body: 'p-4' }"
        >
          <UIcon
            name="i-lucide-plane-takeoff"
            class="mx-auto mb-2 h-8 w-8 text-primary-500"
          />
          <p class="text-2xl font-bold">
            Direkt
          </p>
          <p
            class="
              text-xs text-gray-500
              dark:text-gray-400
            "
          >
            {{ t('flights.connection') || 'Verbindung' }}
          </p>
        </UCard>

        <UCard
          class="text-center shadow-lg"
          :ui="{ body: 'p-4' }"
        >
          <UIcon
            name="i-lucide-badge-check"
            class="mx-auto mb-2 h-8 w-8 text-primary-500"
          />
          <p class="text-2xl font-bold">
            100%
          </p>
          <p
            class="
              text-xs text-gray-500
              dark:text-gray-400
            "
          >
            {{ t('flights.independent') || 'Unabhängig' }}
          </p>
        </UCard>
      </div>

      <!-- Content -->
      <!-- <article
        class="
          prose
          dark:prose-invert
          prose-sm
          md:prose-base
          mb-8 max-w-none
        "
      >
        <ContentRenderer
          v-if="page"
          :value="page as any"
        />
      </article> -->

      <!-- Related Routes -->
      <div class="mb-8">
        <h2 class="mb-3 text-lg font-semibold">
          {{ t('routes.related') }}
        </h2>
        <div
          class="
            grid grid-cols-1 gap-3
            sm:grid-cols-3
          "
        >
          <NuxtLink
            v-for="r in relatedRoutes"
            :key="r.slug"
            :to="localePath({ name: 'fluturime-route', params: { route: r.slug } })"
            class="block"
          >
            <UCard
              class="
                transition-all
                hover:ring-2 hover:ring-primary-500
              "
              :ui="{ body: 'p-3' }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-primary-500">{{ r.from }}</span>
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="h-4 w-4 text-gray-400"
                  />
                  <span class="font-mono font-bold text-primary-500">{{ r.to }}</span>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="h-4 w-4 text-gray-400"
                />
              </div>
              <p
                class="
                  mt-1 text-xs text-gray-500
                  dark:text-gray-400
                "
              >{{ r.fromCity }} → {{ r.toCity }}</p>
            </UCard>
          </NuxtLink>
        </div>
      </div>

      <!-- WhatsApp Promotion Banner -->
      <div
        class="
          mb-8 rounded-xl bg-linear-to-r from-green-50 to-green-100 p-4
          sm:p-6
          dark:from-green-900/20 dark:to-green-800/20
        "
      >
        <div
          class="
            flex flex-col items-center gap-4
            sm:flex-row
          "
        >
          <div
            class="
              flex h-12 w-12 shrink-0 items-center justify-center rounded-full
              bg-green-500
            "
          >
            <UIcon
              name="i-simple-icons-whatsapp"
              class="h-7 w-7 text-white"
            />
          </div>
          <div
            class="
              flex-1 text-center
              sm:text-left
            "
          >
            <h3
              class="
                font-semibold text-gray-900
                dark:text-white
              "
            >
              {{ t('whatsapp.title') }}
            </h3>
            <p
              class="
                text-sm text-gray-600
                dark:text-gray-300
              "
            >
              {{ t('whatsapp.description') }}
            </p>
          </div>
          <a
            :href="whatsappLink"
            target="_blank"
            rel="noopener noreferrer"
            class="
              inline-flex shrink-0 items-center gap-2 rounded-full bg-green-500
              px-5 py-2.5 font-medium text-white transition-colors
              hover:bg-green-600
            "
          >
            <UIcon
              name="i-simple-icons-whatsapp"
              class="h-5 w-5"
            />
            {{ t('whatsapp.cta') }}
          </a>
        </div>
      </div>

      <!-- Disclaimer -->
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        :ui="{ description: 'text-xs' }"
      >
        <template #description>
          Aviopika ist ein unabhängiger Preisvergleich. Wir verkaufen keine Flugtickets. Alle Preise ohne Gewähr.
        </template>
      </UAlert>
    </UContainer>
  </div>
</template>
