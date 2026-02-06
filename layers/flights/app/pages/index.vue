<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'

const { t } = useI18n()
const localePath = useLocalePath()
definePageMeta({
  path: '/landing'
})
 
const { search, searchState } = useFlightSearch()
const { getAirportByCode } = useAirports()

// Set default dates on client after mount (ClientOnly handles skeleton during hydration)
onMounted(() => {
  if (!searchState.value.departureDate) {
    const initialDepartureDate = today(getLocalTimeZone())
    searchState.value.departureDate = initialDepartureDate
    searchState.value.returnDate = initialDepartureDate.add({ weeks: 1 })
  }
})

async function onSearch() {
  search()
  navigateTo(localePath('/'))
}

function scrollToSearch() {
  document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })
}

// Popular routes with prices (example starting prices)
const popularRoutes = [
  { from: 'Düsseldorf', fromCode: 'DUS', to: 'Pristina', toCode: 'PRN', price: 89 },
  { from: 'Frankfurt', fromCode: 'FRA', to: 'Pristina', toCode: 'PRN', price: 99 },
  { from: 'München', fromCode: 'MUC', to: 'Pristina', toCode: 'PRN', price: 109 },
  { from: 'Zürich', fromCode: 'ZRH', to: 'Pristina', toCode: 'PRN', price: 119 },
  { from: 'Stuttgart', fromCode: 'STR', to: 'Pristina', toCode: 'PRN', price: 95 },
  { from: 'Basel', fromCode: 'BSL', to: 'Pristina', toCode: 'PRN', price: 105 }
]

// Handle route card click - populate search form
async function onRouteClick(route: typeof popularRoutes[0]) {
  const [origin, destination] = await Promise.all([
    getAirportByCode(route.fromCode),
    getAirportByCode(route.toCode)
  ])

  if (origin && destination) {
    searchState.value.origin = origin
    searchState.value.destination = destination
    // Set departure date to next Saturday
    const now = today(getLocalTimeZone())
    const daysUntilSaturday = (6 - now.toDate(getLocalTimeZone()).getDay() + 7) % 7 || 7
    searchState.value.departureDate = now.add({ days: daysUntilSaturday })
    searchState.value.returnDate = searchState.value.departureDate.add({ weeks: 1 })
  }

  scrollToSearch()
}

const { partners: partnerLogos } = usePartners()

const providers = computed(() => partnerLogos.value.map(p => ({
  id: p.id,
  name: p.name,
  url: p.url
})))

// FAQ items
const faqItems = computed(() => [
  {
    label: t('faq.booking.question'),
    content: t('faq.booking.answer')
  },
  {
    label: t('faq.prices.question'),
    content: t('faq.prices.answer')
  },
  {
    label: t('faq.luggage.question'),
    content: t('faq.luggage.answer')
  },
  {
    label: t('faq.payment.question'),
    content: t('faq.payment.answer')
  }
])

// WhatsApp link
const config = useRuntimeConfig()
const whatsappLink = computed(() => {
  const number = config.public.whatsappNumber.replace(/\D/g, '')
  return `https://wa.me/${number}?text=${encodeURIComponent('Hallo! Ich möchte Flüge suchen.')}`
})

// SEO
useSeoMeta({
  title: t('seo.title'),
  description: t('seo.description')
})
</script>

<template>
  <div>
    <!-- Hero Section with Background -->
    <section
      class="
        relative overflow-visible bg-linear-to-br from-primary-950
        via-primary-900 to-primary-800
      "
    >
      <!-- Background Image with Overlay -->
      <div class="absolute inset-0">
        <NuxtImg
          src="/img/airplane-aviopika_1280.jpg"
          alt="Flugzeug über den Wolken"
          width="1280"
          height="720"
          format="webp"
          quality="80"
          loading="eager"
          fetchpriority="high"
          preload
          class="h-full w-full object-cover object-[center_12%]"
        />
        <div
          class="
            absolute inset-0 bg-linear-to-b from-primary-950/60
            to-primary-900/80
          "
        />
      </div>

      <!-- Hero Content -->
      <div
        class="
          relative z-10 container mx-auto px-4 py-16 pb-20
          sm:py-24 sm:pb-28
          lg:py-36
        "
      >
        <div
          class="
            mb-8 text-center
            sm:mb-10
          "
        >
          <p class="mb-3 font-medium text-primary-300">
            {{ $t('hero.headline') }}
          </p>
          <h1
            class="
              mb-4 text-3xl font-bold tracking-tight text-white
              sm:text-4xl
              lg:text-5xl
            "
          >
            {{ $t('hero.title') }}
          </h1>
          <p class="mx-auto max-w-2xl text-lg text-primary-100/80">
            {{ $t('hero.description') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Search Card (overlaps hero and next section) -->
    <div
      class="
        relative z-20 -mt-20
        sm:-mt-28
      "
    >
      <div
        class="
          container mx-auto px-2
          sm:px-4
        "
      >
        <UCard
          id="search"
          class="
            mx-auto w-full shadow-2xl ring-1 ring-white/20
            md:w-11/12
            lg:w-10/12
            xl:w-8/12
          "
        >
          <FlightSearchForm
            embedded
            @search="onSearch"
          />
        </UCard>
      </div>
    </div>

    <!-- Stats & Trust Badges -->
    <section
      class="
        relative z-10 border-b border-default bg-default pt-12
        sm:pt-14
      "
    >
      <div class="container mx-auto px-4 py-8">
        <div
          class="
            flex flex-wrap items-center justify-center gap-6
            md:gap-10
          "
        >
          <a
            v-for="partner in partnerLogos"
            :key="partner.id"
            :href="partner.url"
            target="_blank"
            rel="noopener noreferrer"
            class="
              flex items-center text-muted transition-colors
              hover:text-default
            "
          >
            <img
              :src="partner.logo"
              :alt="partner.name"
              :class="[
                `
                  h-7 max-w-40 object-contain opacity-70 grayscale transition
                  hover:opacity-100 hover:grayscale-0
                  md:h-8
                `,
                partner.id === 'erifly' ? 'invert' : ''
              ]"
              loading="lazy"
            >
          </a>
        </div>

        <!-- Stats -->
        <div
          class="
            mt-14 grid grid-cols-3 gap-4 text-center
            sm:gap-8
          "
        >
          <div>
            <p
              class="
                text-2xl font-bold text-primary
                sm:text-4xl
              "
            >
              7
            </p>
            <p
              class="
                text-sm text-muted
                sm:text-base
              "
            >
              {{ $t('stats.providers') }}
            </p>
          </div>
          <div>
            <p
              class="
                text-2xl font-bold text-primary
                sm:text-4xl
              "
            >
              50+
            </p>
            <p
              class="
                text-sm text-muted
                sm:text-base
              "
            >
              {{ $t('stats.routes') }}
            </p>
          </div>
          <div>
            <UIcon
              name="i-lucide-check-circle"
              class="
                text-2xl text-primary
                sm:text-4xl
              "
            />
            <p
              class="
                text-sm text-muted
                sm:text-base
              "
            >
              {{ $t('stats.updated') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <UPageSection
      id="how-it-works"
      :title="$t('howItWorks.title')"
      :description="$t('howItWorks.description')"
    >
      <div
        class="
          grid grid-cols-1 gap-8
          md:grid-cols-3
        "
      >
        <div
          v-for="(step, index) in [
            { icon: 'i-lucide-search', key: 'search' },
            { icon: 'i-lucide-git-compare', key: 'compare' },
            { icon: 'i-lucide-mouse-pointer-click', key: 'book' }
          ]"
          :key="step.key"
          class="relative text-center"
        >
          <!-- Step number -->
          <div
            class="
              text-primary-foreground absolute -top-2 left-1/2 flex h-8 w-8
              -translate-x-1/2 items-center justify-center rounded-full
              bg-primary text-sm font-bold text-white
            "
          >
            {{ index + 1 }}
          </div>

          <!-- Icon -->
          <div
            class="
              mx-auto mb-4 flex h-20 w-20 items-center justify-center
              rounded-2xl bg-primary/10
            "
          >
            <UIcon
              :name="step.icon"
              class="text-3xl text-primary"
            />
          </div>

          <!-- Text -->
          <h3 class="mb-2 text-lg font-semibold">
            {{ $t(`howItWorks.steps.${step.key}.title`) }}
          </h3>
          <p class="text-sm text-muted">
            {{ $t(`howItWorks.steps.${step.key}.description`) }}
          </p>

          <!-- Connector arrow (not on last item) -->
          <div
            v-if="index < 2"
            class="
              absolute top-10 -right-4 hidden text-muted
              md:block
            "
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="text-2xl"
            />
          </div>
        </div>
      </div>
    </UPageSection>

    <!-- WhatsApp Bot Section -->
    <section
      class="
        relative overflow-hidden bg-linear-to-br from-green-600 to-green-700
        py-12
        sm:py-16
      "
    >
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-4 left-4">
          <UIcon
            name="i-simple-icons-whatsapp"
            class="text-[200px] text-white"
          />
        </div>
        <div class="absolute right-4 bottom-4 rotate-12">
          <UIcon
            name="i-lucide-message-circle"
            class="text-[150px] text-white"
          />
        </div>
      </div>

      <UContainer class="relative z-10">
        <div
          class="
            flex flex-col items-center gap-8
            lg:flex-row lg:gap-12
          "
        >
          <!-- Content -->
          <div
            class="
              flex-1 text-center
              lg:text-left
            "
          >
            <h2
              class="
                mb-4 text-2xl font-bold text-white
                sm:text-3xl
                lg:text-4xl
              "
            >
              {{ $t('whatsapp.title') }}
            </h2>
            <p class="mb-6 max-w-xl text-lg text-green-100">
              {{ $t('whatsapp.description') }}
            </p>

            <!-- Features -->
            <div
              class="
                mb-8 flex flex-wrap justify-center gap-4
                lg:justify-start
              "
            >
              <div
                v-for="feature in ['fast', 'easy', 'free']"
                :key="feature"
                class="flex items-center gap-2 text-sm text-white/90"
              >
                <UIcon
                  name="i-lucide-check-circle"
                  class="h-5 w-5 text-green-200"
                />
                {{ $t(`whatsapp.features.${feature}`) }}
              </div>
            </div>

            <!-- CTA -->
            <a
              :href="whatsappLink"
              target="_blank"
              rel="noopener noreferrer"
              class="
                inline-flex items-center gap-3 rounded-full bg-white px-6 py-3
                font-semibold text-green-700 shadow-lg transition-all
                hover:scale-105 hover:shadow-xl
              "
            >
              <UIcon
                name="i-simple-icons-whatsapp"
                class="h-6 w-6"
              />
              {{ $t('whatsapp.cta') }}
            </a>
          </div>

          <!-- Phone Mockup -->
          <div class="shrink-0">
            <div
              class="
                relative w-64
                sm:w-72
              "
            >
              <!-- Phone Frame -->
              <div class="rounded-[2.5rem] bg-gray-900 p-3 shadow-2xl">
                <div class="overflow-hidden rounded-4xl bg-white">
                  <!-- WhatsApp Header -->
                  <div class="flex items-center gap-3 bg-green-600 px-4 py-3">
                    <div
                      class="
                        flex h-10 w-10 items-center justify-center rounded-full
                        bg-white/20
                      "
                    >
                      <UIcon
                        name="i-lucide-plane"
                        class="h-5 w-5 text-white"
                      />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-white">
                        Aviopika Bot
                      </p>
                      <p class="text-xs text-green-200">
                        Online
                      </p>
                    </div>
                  </div>
                  <!-- Chat Messages -->
                  <div class="min-h-50 space-y-2 bg-[#e5ddd5] p-3">
                    <!-- User Message -->
                    <div class="flex justify-end">
                      <div
                        class="
                          max-w-[80%] rounded-lg bg-[#dcf8c6] px-3 py-2 shadow
                        "
                      >
                        <p class="text-sm text-gray-800">
                          DUS PRN 15.03
                        </p>
                        <p class="mt-1 text-right text-[10px] text-gray-500">
                          12:34
                        </p>
                      </div>
                    </div>
                    <!-- Bot Response -->
                    <div class="flex justify-start">
                      <div
                        class="max-w-[85%] rounded-lg bg-white px-3 py-2 shadow"
                      >
                        <p class="mb-1 text-sm font-medium text-gray-800">
                          3 Flüge gefunden:
                        </p>
                        <p class="text-xs text-gray-600">
                          ✈️ AirPrishtina <span
                            class="font-semibold text-green-600"
                          >89€</span>
                        </p>
                        <p class="text-xs text-gray-600">
                          ✈️ KosovaFly <span
                            class="font-semibold text-green-600"
                          >95€</span>
                        </p>
                        <p class="text-xs text-gray-600">
                          ✈️ Dituria <span class="font-semibold text-green-600">99€</span>
                        </p>
                        <p class="mt-1 text-right text-[10px] text-gray-500">
                          12:34
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Popular Routes -->
    <UPageSection
      id="routes"
      :title="$t('routes.title')"
      :description="$t('routes.description')"
    >
      <div
        class="
          grid grid-cols-1 gap-4
          md:grid-cols-2
          lg:grid-cols-3
        "
      >
        <div
          v-for="route in popularRoutes"
          :key="`${route.fromCode}-${route.toCode}`"
          class="
            group relative cursor-pointer rounded-xl border border-default
            bg-default p-4 transition-all duration-300
            hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg
            hover:shadow-primary/10
          "
          @click="onRouteClick(route)"
        >
          <div class="flex items-center justify-between">
            <!-- Route visualization -->
            <div class="flex flex-1 items-center gap-2">
              <!-- Origin -->
              <div class="min-w-15 text-center">
                <p class="font-mono text-lg font-bold text-primary">
                  {{ route.fromCode }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{ route.from }}
                </p>
              </div>

              <!-- Flight path -->
              <div class="flex flex-1 items-center px-2">
                <div
                  class="
                    h-px flex-1 border-t-2 border-dashed border-muted
                    transition-colors
                    group-hover:border-primary/50
                  "
                />
                <UIcon
                  name="i-lucide-plane"
                  class="
                    mx-1 text-muted transition-all duration-300
                    group-hover:translate-x-1 group-hover:text-primary
                  "
                />
                <div
                  class="
                    h-px flex-1 border-t-2 border-dashed border-muted
                    transition-colors
                    group-hover:border-primary/50
                  "
                />
              </div>

              <!-- Destination -->
              <div class="min-w-15 text-center">
                <p class="font-mono text-lg font-bold text-primary">
                  {{ route.toCode }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{ route.to }}
                </p>
              </div>
            </div>

            <!-- Price -->
            <div class="ml-4 border-l border-default pl-4 text-right">
              <p class="text-xs text-muted">
                {{ $t('common.from') }}
              </p>
              <p class="text-xl font-bold text-primary">
                {{ route.price }}€
              </p>
            </div>
          </div>
        </div>
      </div>
    </UPageSection>

    <!-- Trust Section - Providers -->
    <section class="border-y border-default bg-muted/30">
      <div class="container mx-auto px-4 py-12">
        <h2 class="mb-8 text-center text-xl font-semibold">
          {{ $t('providers.title') }}
        </h2>
        <div
          class="
            grid grid-cols-2 items-center justify-items-center gap-6
            md:grid-cols-4
          "
        >
          <a
            v-for="provider in providers"
            :key="provider.id"
            :href="provider.url"
            target="_blank"
            rel="noopener noreferrer"
            class="
              flex items-center justify-center rounded-lg border border-default
              bg-default px-6 py-4 transition-all
              hover:border-primary/50
            "
          >
            <span
              class="
                font-semibold text-muted transition-colors
                hover:text-primary
              "
            >{{ provider.name }}</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <UPageSection
      id="features"
      :title="$t('features.title')"
      :description="$t('features.description')"
      :features="[{
        icon: 'i-lucide-search',
        title: $t('features.compare.title'),
        description: $t('features.compare.description')
      }, {
        icon: 'i-lucide-plane',
        title: $t('features.direct.title'),
        description: $t('features.direct.description')
      }, {
        icon: 'i-lucide-clock',
        title: $t('features.realtime.title'),
        description: $t('features.realtime.description')
      }, {
        icon: 'i-lucide-shield-check',
        title: $t('features.secure.title'),
        description: $t('features.secure.description')
      }, {
        icon: 'i-lucide-smartphone',
        title: $t('features.mobile.title'),
        description: $t('features.mobile.description')
      }, {
        icon: 'i-lucide-heart',
        title: $t('features.family.title'),
        description: $t('features.family.description')
      }]"
    />

    <!-- CTA -->
    <section
      class="
        relative overflow-hidden bg-linear-to-br from-slate-950 via-primary-950
        to-primary-900 py-16
        sm:py-24
      "
    >
      <!-- Ambient background -->
      <div class="absolute inset-0">
        <div
          class="
            absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-500/20
            blur-3xl
          "
        />
        <div
          class="
            absolute -right-24 -bottom-28 h-80 w-80 rounded-full bg-amber-400/10
            blur-3xl
          "
        />
        <div class="absolute inset-0 opacity-15">
          <div class="absolute top-10 left-10">
            <UIcon
              name="i-lucide-plane"
              class="rotate-45 text-8xl text-primary-300"
            />
          </div>
          <div class="absolute right-10 bottom-10">
            <UIcon
              name="i-lucide-plane"
              class="-rotate-45 text-8xl text-primary-300"
            />
          </div>
        </div>
      </div>

      <UContainer class="relative z-10">
        <div
          class="
            mx-auto grid max-w-6xl items-center gap-6
            lg:grid-cols-[1.2fr_0.8fr]
          "
        >
          <div class="text-left">
            <p class="mb-3 text-sm tracking-wide text-primary-200/90 uppercase">
              {{ $t('features.direct.title') }}
            </p>
            <h2
              class="
                mb-4 text-3xl leading-tight font-bold text-white
                sm:text-4xl
                lg:text-5xl
              "
            >
              {{ $t('cta.title') }}
            </h2>
            <p class="mb-8 max-w-xl text-lg text-primary-100/90">
              {{ $t('cta.description') }}
            </p>
            <div class="flex flex-wrap items-center gap-4">
              <UButton
                size="xl"
                color="neutral"
                variant="solid"
                icon="i-lucide-search"
                class="
                  bg-white text-primary-800 shadow-xl
                  hover:bg-primary-50
                "
                @click="scrollToSearch"
              >
                {{ $t('cta.button') }}
              </UButton>
              <div class="flex items-center gap-2 text-sm text-primary-100/80">
                <UIcon
                  name="i-lucide-shield-check"
                  class="text-primary-200"
                />
                <span>{{ $t('features.secure.title') }}</span>
              </div>
            </div>
          </div>

          <div
            class="
              rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm
            "
          >
            <div class="mb-6 flex items-center gap-3">
              <div
                class="
                  flex h-10 w-10 items-center justify-center rounded-full
                  bg-primary-500/20
                "
              >
                <UIcon
                  name="i-lucide-badge-check"
                  class="text-primary-200"
                />
              </div>
              <div>
                <p class="font-semibold text-white">
                  {{ $t('features.direct.title') }}
                </p>
                <p class="text-sm text-primary-100/70">
                  {{ $t('features.direct.description') }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="badge in [
                  { icon: 'i-lucide-badge-check', key: 'noFees' },
                  { icon: 'i-lucide-shield-check', key: 'directBooking' },
                  { icon: 'i-lucide-lock', key: 'secureData' }
                ]"
                :key="badge.key"
                class="
                  inline-flex items-center gap-2 rounded-full border
                  border-white/15 bg-white/10 px-3 py-1.5 text-xs
                  text-primary-100
                "
              >
                <UIcon
                  :name="badge.icon"
                  class="text-primary-200"
                />
                <span>{{ $t(`trustBadges.${badge.key}`) }}</span>
              </div>
            </div>
            <div
              class="mt-6 flex items-center gap-3 text-sm text-primary-100/80"
            >
              <UIcon
                name="i-lucide-clock"
                class="text-primary-200"
              />
              <span>{{ $t('features.realtime.title') }}</span>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Testimonials -->
    <section class="border-y border-default bg-muted/30">
      <div class="container mx-auto px-4 py-16">
        <div class="mb-12 text-center">
          <h2 class="mb-2 text-2xl font-bold">
            {{ $t('testimonials.title') }}
          </h2>
          <p class="text-muted">
            {{ $t('testimonials.description') }}
          </p>
        </div>

        <div
          class="
            mx-auto grid max-w-5xl grid-cols-1 gap-6
            md:grid-cols-3
          "
        >
          <div
            v-for="testimonial in [
              { name: 'Arben K.', location: 'Düsseldorf', key: 'arben' },
              { name: 'Dafina B.', location: 'Zürich', key: 'fatima' },
              { name: 'Driton H.', location: 'München', key: 'driton' }
            ]"
            :key="testimonial.key"
            class="rounded-xl border border-default bg-default p-6"
          >
            <!-- Stars -->
            <div class="mb-3 flex gap-1">
              <UIcon
                v-for="i in 5"
                :key="i"
                name="i-lucide-star"
                class="fill-yellow-500 text-yellow-500"
              />
            </div>

            <!-- Quote -->
            <p class="mb-4 text-sm italic">
              "{{ $t(`testimonials.quotes.${testimonial.key}`) }}"
            </p>

            <!-- Author -->
            <div class="flex items-center gap-3">
              <div
                class="
                  flex h-10 w-10 items-center justify-center rounded-full
                  bg-primary/10
                "
              >
                <UIcon
                  name="i-lucide-user"
                  class="text-primary"
                />
              </div>
              <div>
                <p class="text-sm font-semibold">
                  {{ testimonial.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ testimonial.location }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <UPageSection
      id="faq"
      :title="$t('faq.title')"
      :description="$t('faq.description')"
    >
      <UAccordion
        :items="faqItems"
        class="mx-auto max-w-3xl"
        :ui="{
          trigger: 'text-base sm:text-lg font-medium py-4',
          content: 'text-base text-muted pb-4'
        }"
      />
    </UPageSection>
  </div>
</template>
