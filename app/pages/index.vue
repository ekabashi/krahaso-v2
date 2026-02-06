<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'

const { t, locale } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const { availableLocations, getLocationImage } = useAvailableLocations()

useSeoPage({
  title: t('landing.seo.title'),
  description: t('landing.seo.description'),
  canonical: '/',
  ogImage: () => `${config.public.siteUrl}/logoRed.png`,
})

const { partners: partnerLogos } = usePartners()

const whatsappLink = computed(() => {
  const rawNumber = String(config.public.whatsappNumber || '')
  const number = rawNumber.replace(/\D/g, '') || '38349999408'
  return `https://wa.me/${number}?text=${encodeURIComponent(t('landing.whatsapp.chat.userMessage1'))}`
})

const activeTab = useState('homepageTab', () => 0)
const isCars = computed(() => activeTab.value === 0)
const isFlights = computed(() => activeTab.value === 1)

const homepageStats = computed(() => {
  if (isFlights.value) {
    return [
      { value: String(partnerLogos.value.length), label: t('landing.stats.providers'), icon: null },
      { value: '50+', label: t('landing.stats.routes'), icon: null },
      { value: null, label: t('landing.stats.verified'), icon: 'i-lucide-check-circle' }
    ]
  }

  return [
    { value: '24/7', label: t('landing.stats.carsSupport'), icon: null },
    { value: '100+', label: t('landing.stats.carsFleet'), icon: null },
    { value: null, label: t('landing.stats.verified'), icon: 'i-lucide-check-circle' }
  ]
})

function setActiveTab(value: string | number): void {
  const numValue = typeof value === 'string' ? Number(value) : value
  if (numValue === 0 || numValue === 1) {
    activeTab.value = numValue
  }
}

const { searchState, navigateToFlightsSearch } = useFlightSearch()

onMounted(() => {
  if (!searchState.value.departureDate) {
    const initialDepartureDate = today(getLocalTimeZone())
    searchState.value.departureDate = initialDepartureDate
    searchState.value.returnDate = initialDepartureDate.add({ weeks: 1 })
  }
})

const popularRoutes = computed(() => [
  { from: t('landing.routes.popular.prishtine'), to: t('landing.routes.popular.dusseldorf'), slug: 'prishtine-dusseldorf', code: 'PRN-DUS' },
  { from: t('landing.routes.popular.prishtine'), to: t('landing.routes.popular.zurich'), slug: 'prishtine-zurich', code: 'PRN-ZRH' },
  { from: t('landing.routes.popular.prishtine'), to: t('landing.routes.popular.vienna'), slug: 'prishtine-vienna', code: 'PRN-VIE' },
  { from: t('landing.routes.popular.prishtine'), to: t('landing.routes.popular.frankfurt'), slug: 'prishtine-frankfurt', code: 'PRN-FRA' },
  { from: t('landing.routes.popular.prishtine'), to: t('landing.routes.popular.munich'), slug: 'prishtine-munich', code: 'PRN-MUC' },
  { from: t('landing.routes.popular.prishtine'), to: t('landing.routes.popular.amsterdam'), slug: 'prishtine-amsterdam', code: 'PRN-AMS' }
])

const currentLocale = computed(() => locale.value as LocaleCode)

const popularLocations = computed(() => {
  // Use availableLocations if loaded, otherwise fallback to first 4 popular locations from LOCATIONS
  const locationsToUse = availableLocations.value.length > 0 
    ? availableLocations.value 
    : LOCATIONS.filter(loc => loc.pickup).slice(0, 4)
  
  return locationsToUse
    .slice(0, 4)
    .map((loc: LocationDef) => ({
      name: loc.names[currentLocale.value],
      slug: loc.slugs[currentLocale.value],
      image: getLocationImage(loc)
    }))
})

const trustFeatures = [
  {
    icon: 'i-lucide-shield-check',
    title: t('landing.features.verified.title'),
    description: t('landing.features.verified.description'),
    color: 'primary'
  },
  {
    icon: 'i-lucide-tag',
    title: t('landing.features.transparent.title'),
    description: t('landing.features.transparent.description'),
    color: 'primary'
  },
  {
    icon: 'i-lucide-zap',
    title: t('landing.features.fast.title'),
    description: t('landing.features.fast.description'),
    color: 'primary'
  },
  {
    icon: 'i-lucide-headphones',
    title: t('landing.features.support.title'),
    description: t('landing.features.support.description'),
    color: 'primary'
  }
]

type FaqItem = {
  label: string
  content: string
}

const flightFaqs = computed<FaqItem[]>(() => [
  {
    label: t('landing.flights.faq.question1'),
    content: t('landing.flights.faq.answer1')
  },
  {
    label: t('landing.flights.faq.question2'),
    content: t('landing.flights.faq.answer2')
  },
  {
    label: t('landing.flights.faq.question3'),
    content: t('landing.flights.faq.answer3')
  },
  {
    label: t('landing.flights.faq.question4'),
    content: t('landing.flights.faq.answer4')
  },
  {
    label: t('landing.flights.faq.question5'),
    content: t('landing.flights.faq.answer5')
  },
  {
    label: t('landing.flights.faq.question6'),
    content: t('landing.flights.faq.answer6')
  }
])

const carFaqs = computed<FaqItem[]>(() => [
  {
    label: t('landing.cars.faq.question1'),
    content: t('landing.cars.faq.answer1')
  },
  {
    label: t('landing.cars.faq.question2'),
    content: t('landing.cars.faq.answer2')
  },
  {
    label: t('landing.cars.faq.question3'),
    content: t('landing.cars.faq.answer3')
  },
  {
    label: t('landing.cars.faq.question4'),
    content: t('landing.cars.faq.answer4')
  },
  {
    label: t('landing.cars.faq.question5'),
    content: t('landing.cars.faq.answer5')
  },
  {
    label: t('landing.cars.faq.question6'),
    content: t('landing.cars.faq.answer6')
  }
])

const currentFaqs = computed(() => isFlights.value ? flightFaqs.value : carFaqs.value)

async function onFlightSearch() {
  await navigateToFlightsSearch()
}

function onCarSearch(params: Record<string, string>) {
  if (import.meta.client) {
    const url = router.resolve({ path: localePath('makina-search'), query: params }).href
    void navigateTo(url, { external: true })
    return
  }
  router.push({ path: localePath('makina-search'), query: params })
}

// SEO structured data
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'Krahaso.co',
        'url': 'https://krahaso.co',
        'description': t('landing.seo.description'),
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': 'https://krahaso.co/flights?from={search_term_string}&to={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'Krahaso.co',
        'url': 'https://krahaso.co',
        'logo': 'https://krahaso.co/logo.png',
        'description': t('landing.seo.description'),
        'sameAs': []
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': currentFaqs.value.map(faq => ({
          '@type': 'Question',
          'name': faq.label,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.content
          }
        }))
      })
    }
  ]
}))
</script>

<template>
  <div class="relative">
    <!-- Animated Background -->
    <div class="fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-primary-50" />
      <!-- Animated gradient orbs -->
      <div class="absolute top-0 -left-1/4 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl animate-float" />
      <div class="absolute top-1/4 -right-1/4 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl animate-float-delayed" />
      <div class="absolute bottom-0 left-1/4 w-96 h-96 bg-primary-100/30 rounded-full blur-3xl animate-float-slow" />
      <!-- Animated gradient mesh -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse-slow" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.08),transparent_50%)] animate-pulse-slower" />
    </div>

    <!-- Hero Section - Dynamic based on tab -->
    <LandingHeroSection
      :type="isFlights ? 'flights' : 'cars'"
      :title="isFlights ? $t('landing.hero.flights.title') : $t('landing.hero.title')"
      :title-highlight="isFlights ? $t('landing.hero.flights.titleHighlight') : $t('landing.hero.titleHighlight')"
      :description="isFlights ? $t('landing.hero.flights.description') : $t('landing.hero.description')"
    />

    <!-- Search Forms Section -->
    <div
      class="relative z-20 -mt-12 sm:-mt-16 lg:-mt-20 xl:-mt-28"
    >
      <div class="container mx-auto px-2 sm:px-4 lg:px-6">
        <div class="max-w-6xl mx-auto relative">
          <!-- Search type icons -->
          <div
            role="group"
            aria-label="Search type"
            class="absolute left-6 top-3 -translate-y-1/2 z-10 flex flex-wrap justify-start gap-3 sm:gap-4 md:left-8"
          >
            <button
              type="button"
              :aria-pressed="activeTab === 0"
              class="flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl transition-colors"
              @click="setActiveTab(0)"
            >
              <span
                :class="[
                  'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-sm transition-colors border',
                  activeTab === 0 ? 'bg-primary-100 border-primary-500' : 'bg-white border-gray-200'
                ]"
                aria-hidden
              >
                <UIcon
                  :name="'i-lucide-car'"
                  :class="[
                    'h-6 w-6 sm:h-7 sm:w-7',
                    activeTab === 0 ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                  ]"
                />
              </span>
              <span
                :class="[
                  'text-sm font-medium',
                  activeTab === 0 ? 'text-gray-900' : 'text-gray-500'
                ]"
              >
                {{ t('landing.searchType.cars') }}
              </span>
            </button>
            <button
              type="button"
              :aria-pressed="activeTab === 1"
              class="flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl transition-colors"
              @click="setActiveTab(1)"
            >
              <span
                :class="[
                  'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-sm transition-colors border',
                  activeTab === 1 ? 'bg-primary-100 border-primary-500' : 'bg-white border-gray-200'
                ]"
                aria-hidden
              >
                <UIcon
                  :name="'i-lucide-plane'"
                  :class="[
                    'h-6 w-6 sm:h-7 sm:w-7',
                    activeTab === 1 ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                  ]"
                />
              </span>
              <span
                :class="[
                  'text-sm font-medium',
                  activeTab === 1 ? 'text-gray-900' : 'text-gray-500'
                ]"
              >
                {{ t('landing.searchType.flights') }}
              </span>
            </button>

            <UTooltip
              :text="t('landing.searchType.comingSoon')"
              :popper="{ placement: 'bottom' }"
            >
              <button
                type="button"
                class="flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl transition-colors cursor-default opacity-75"
                @click.prevent
              >
                <span
                  class="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white shadow-sm transition-colors border border-gray-200"
                  aria-hidden
                >
                  <UIcon
                    name="i-lucide-building-2"
                    class="h-6 w-6 sm:h-7 sm:w-7 text-gray-400"
                  />
                </span>
                <span class="text-sm font-medium text-gray-400">
                  {{ t('landing.searchType.hotels') }}
                </span>
              </button>
            </UTooltip>

            <UTooltip
              :text="t('landing.searchType.comingSoon')"
              :popper="{ placement: 'bottom' }"
            >
              <button
                type="button"
                class="flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl transition-colors cursor-default opacity-75"
                @click.prevent
              >
                <span
                  class="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white shadow-sm transition-colors border border-gray-200"
                  aria-hidden
                >
                  <UIcon
                    name="i-lucide-shield-check"
                    class="h-6 w-6 sm:h-7 sm:w-7 text-gray-400"
                  />
                </span>
                <span class="text-sm font-medium text-gray-400">
                  {{ t('landing.searchType.insurance') }}
                </span>
              </button>
            </UTooltip>
          </div>

          <div
            class="w-full bg-white rounded-3xl shadow-2xl border border-gray-100 pt-14 pb-6 px-6 md:pt-16 md:pb-8 md:px-8 transition-all duration-300"
          >
            <div v-if="isFlights">
              <FlightSearchForm
                embedded
                @search="onFlightSearch"
              />
            </div>
            <div v-else>
              <CarSearchForm
                embedded
                @search="onCarSearch"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats & Trust Badges Section (shared for flights & cars) -->
    <section
      v-if="isFlights || isCars"
      class="relative z-10 border-b border-default pt-8 sm:pt-12 lg:pt-14"
    >
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <!-- Partner Logos vetëm për fluturime -->
        <div
          v-if="isFlights"
          class="flex flex-wrap max-w-6xl mx-auto items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-10"
        >
          <a
            v-for="partner in partnerLogos"
            :key="partner.id"
            :href="partner.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center text-muted transition-colors hover:text-default"
          >
            <img
              :src="partner.logo"
              :alt="partner.name"
              :class="[
                'h-5 sm:h-6 md:h-7 lg:h-8 max-w-24 sm:max-w-32 md:max-w-40 object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0',
                partner.id === 'erifly' ? 'invert' : ''
              ]"
              loading="lazy"
            >
          </a>
        </div>

        <div class="max-w-6xl mx-auto mt-6 sm:mt-8 lg:mt-14 grid grid-cols-3 gap-2 sm:gap-4 lg:gap-8 text-center">
          <div
            v-for="stat in homepageStats"
            :key="stat.label"
          >
            <p
              v-if="stat.value"
              class="text-xl sm:text-2xl lg:text-4xl font-bold text-primary"
            >
              {{ stat.value }}
            </p>
            <UIcon
              v-else-if="stat.icon"
              :name="stat.icon"
              class="text-xl sm:text-2xl lg:text-4xl text-primary mx-auto"
            />
            <p class="text-xs sm:text-sm lg:text-base text-muted wrap-break-word">
              {{ stat.label }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <UPageSection
      v-if="isFlights"
      id="how-it-works"
      :title="t('landing.howItWorks.title')"
      :description="t('landing.howItWorks.description')"
    >
      <div class="max-w-6xl mx-auto grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
        <div
          v-for="(step, index) in [
            { icon: 'i-lucide-search', key: 'search' },
            { icon: 'i-lucide-git-compare', key: 'compare' },
            { icon: 'i-lucide-mouse-pointer-click', key: 'book' }
          ]"
          :key="step.key"
          class="relative text-center px-4 sm:px-0"
        >
          <!-- Step icon -->
          <div
            class="relative mx-auto mb-3 sm:mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary/10"
          >
            <!-- Step number -->
            <!-- Step number -->
            <div
              class="text-primary-foreground absolute -top-2 left-4/5 flex h-7 w-7 sm:h-8 sm:w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-bold text-white"
            >
              {{ index + 1 }}
            </div>

            <UIcon
              :name="step.icon"
              class="text-2xl sm:text-3xl text-primary"
            />
          </div>

          <!-- Text -->
          <h3 class="mb-1 sm:mb-2 text-base sm:text-lg font-semibold">
            {{ t(`landing.howItWorks.steps.${step.key}.title`) }}
          </h3>
          <p class="text-xs sm:text-sm text-muted wrap-break-word">
            {{ t(`landing.howItWorks.steps.${step.key}.description`) }}
          </p>

          <!-- Connector arrow (not on last item) -->
          <div
            v-if="index < 2"
            class="absolute top-8 sm:top-10 -right-2 sm:-right-4 hidden text-muted md:block"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="text-xl sm:text-2xl"
            />
          </div>
        </div>
      </div>
    </UPageSection>

    <!-- WhatsApp Bot Section (only for flights) -->
    <UPageSection
      v-if="isFlights"
      class="relative overflow-hidden bg-linear-to-br from-green-600 to-green-700 py-12 sm:py-16"
    >
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

      <UContainer class="relative z-10 px-4 sm:px-6">
        <div class="flex flex-col items-center gap-6 sm:gap-8 lg:flex-row lg:gap-12">
          <!-- Content -->
          <div class="flex-1 text-center lg:text-left">
            <h2 class="mb-3 sm:mb-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
              {{ t('landing.whatsapp.title') }}
            </h2>
            <p class="mb-4 sm:mb-6 max-w-xl text-sm sm:text-base lg:text-lg text-green-100">
              {{ t('landing.whatsapp.description') }}
            </p>

            <!-- Features -->
            <div class="mb-6 sm:mb-8 flex flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start">
              <div
                v-for="feature in ['fast', 'easy', 'free']"
                :key="feature"
                class="flex items-center gap-2 text-xs sm:text-sm text-white/90"
              >
                <UIcon
                  name="i-lucide-check-circle"
                  class="h-4 w-4 sm:h-5 sm:w-5 text-green-200 shrink-0"
                />
                <span class="wrap-break-word">{{ t(`landing.whatsapp.features.${feature}`) }}</span>
              </div>
            </div>

            <!-- CTA -->
            <a
              :href="whatsappLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 sm:gap-3 rounded-full bg-white px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-green-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl w-full sm:w-auto justify-center"
            >
              <UIcon
                name="i-simple-icons-whatsapp"
                class="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
              />
              <span class="wrap-break-word">{{ t('landing.whatsapp.cta') }}</span>
            </a>
          </div>

          <!-- Phone Mockup -->
          <div class="shrink-0 w-full sm:w-auto">
            <div class="relative w-full max-w-[280px] mx-auto sm:w-64 lg:w-72">
              <!-- Phone Frame -->
              <div class="rounded-[2.5rem] bg-gray-900 p-3 shadow-2xl">
                <div class="overflow-hidden rounded-4xl bg-white">
                  <!-- WhatsApp Header -->
                  <div class="flex items-center gap-3 bg-green-600 px-4 py-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"
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
                  <div class="h-80 overflow-y-auto bg-gray-50 p-4 space-y-3">
                    <!-- User: Pershendetje -->
                    <div class="flex justify-end">
                      <div
                        class="max-w-[80%] rounded-lg rounded-br-none bg-green-100 p-3 text-sm shadow whitespace-pre-line"
                      >
                        {{ t('landing.whatsapp.chat.userMessage1') }}
                      </div>
                    </div>

                    <!-- Bot: Greeting with language selection -->
                    <div class="flex justify-start">
                      <div
                        class="max-w-[80%] rounded-lg rounded-bl-none bg-white p-3 text-sm shadow whitespace-pre-line"
                      >
                        {{ t('landing.whatsapp.chat.botGreeting') }}
                      </div>
                    </div>

                    <!-- User: Language selection -->
                    <div class="flex justify-end">
                      <div
                        class="max-w-[80%] rounded-lg rounded-br-none bg-green-100 p-3 text-sm shadow whitespace-pre-line"
                      >
                        {{ t('landing.whatsapp.chat.userLanguage') }}
                      </div>
                    </div>

                    <!-- Bot: Welcome message -->
                    <div class="flex justify-start">
                      <div
                        class="max-w-[80%] rounded-lg rounded-bl-none bg-white p-3 text-sm shadow whitespace-pre-line"
                      >
                        {{ t('landing.whatsapp.chat.botWelcome') }}
                      </div>
                    </div>

                    <!-- User: Flight search -->
                    <div class="flex justify-end">
                      <div
                        class="max-w-[80%] rounded-lg rounded-br-none bg-green-100 p-3 text-sm shadow whitespace-pre-line"
                      >
                        {{ t('landing.whatsapp.chat.userFlightSearch') }}
                      </div>
                    </div>

                    <!-- Bot: Flight results -->
                    <div class="flex justify-start">
                      <div
                        class="max-w-[80%] rounded-lg rounded-bl-none bg-white p-3 text-sm shadow whitespace-pre-line"
                      >
                        {{ t('landing.whatsapp.chat.botFlightResults') }}
                      </div>
                    </div>
                  </div>

                  <!-- Input Field -->
                  <div class="flex items-center gap-2 bg-gray-100 p-3">
                    <UInput
                      :placeholder="t('landing.whatsapp.chat.inputPlaceholder')"
                      class="flex-1"
                      size="sm"
                      disabled
                    />
                    <UButton
                      icon="i-lucide-send"
                      color="primary"
                      variant="solid"
                      size="sm"
                      square
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </UPageSection>

    <!-- How it works -->
    <UPageSection
      v-if="isCars"
      id="how-it-works"
      :title="t('landing.cars.howItWorks.title')"
      :description="t('landing.cars.howItWorks.description')"
      class="mb-4 sm:mb-6"
    >
      <div class="max-w-6xl mx-auto grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
        <div
          v-for="(step, index) in [
            { icon: 'i-lucide-map-pin', key: 'search' },
            { icon: 'i-lucide-git-compare', key: 'compare' },
            { icon: 'i-lucide-mouse-pointer-click', key: 'book' }
          ]"
          :key="step.key"
          class="relative text-center px-4 sm:px-0"
        >
          <!-- Icon -->
          <div
            class="relative mx-auto mb-3 sm:mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary/10"
          >
            <!-- Step number -->
            <div
              class="text-primary-foreground absolute -top-2 left-4/5 flex h-7 w-7 sm:h-8 sm:w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-bold text-white"
            >
              {{ index + 1 }}
            </div>

            <UIcon
              :name="step.icon"
              class="text-2xl sm:text-3xl text-primary"
            />
          </div>

          <!-- Text -->
          <h3 class="mb-1 sm:mb-2 text-base sm:text-lg font-semibold">
            {{ t(`landing.cars.howItWorks.steps.${step.key}.title`) }}
          </h3>
          <p class="text-xs sm:text-sm text-muted wrap-break-word">
            {{ t(`landing.cars.howItWorks.steps.${step.key}.description`) }}
          </p>

          <!-- Connector arrow (not on last item) -->
          <div
            v-if="index < 2"
            class="absolute top-8 sm:top-10 -right-2 sm:-right-4 hidden text-muted md:block"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="text-xl sm:text-2xl"
            />
          </div>
        </div>
      </div>
    </UPageSection>

    <!-- Flights Section -->
    <UPageSection
      v-if="isFlights"
      class="w-full"
    >
      <div class="max-w-6xl mx-auto px-4">
        <div class="relative group">
          <!-- Background Decorative Glow -->
          <div class="absolute -inset-4 bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          <div class="relative overflow-hidden rounded-[1.5rem] bg-white border border-gray-100 shadow-2xl shadow-primary/5">
            <div class="flex flex-col lg:flex-row">
              <!-- Left Side: Visual/Branding -->
              <div class="lg:w-[40%] bg-primary p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
                <!-- Decorative circles -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div class="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl" />
                <div class="relative z-10">
                  <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md mb-8 border border-white/20">
                    <UIcon
                      name="i-lucide-plane"
                      class="h-6 w-6 text-white"
                    />
                  </div>
                  <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                    {{ t('landing.seo.content.flights.title') }}
                  </h2>
                  <div class="h-1 w-16 bg-white/30 rounded-full mb-8" />
                  <p class="text-primary-50/90 text-base sm:text-lg leading-relaxed">
                    {{ t('landing.seo.content.flights.description') }}
                  </p>
                </div>

                <div class="relative z-10 mt-12 flex items-center gap-4">
                  <div class="flex -space-x-2">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="h-8 w-8 rounded-full border-2 border-primary-700 bg-primary-100 flex items-center justify-center text-primary-700"
                    >
                      <UIcon
                        name="i-lucide-user"
                        class="h-4 w-4"
                      />
                    </div>
                  </div>
                  <span class="text-sm text-white/80 font-medium">+1000 users daily</span>
                </div>
              </div>

              <!-- Right Side: Benefits -->
              <div class="lg:w-[60%] p-8 sm:p-12 bg-white flex flex-col justify-center">
                <h3 class="text-xl font-bold text-gray-900 mb-10 flex items-center gap-3">
                  <span class="h-6 w-1 bg-primary rounded-full" />
                  {{ t('landing.seo.content.flights.why.title') }}
                </h3>

                <div class="space-y-8">
                  <div
                    v-for="point in [
                      { key: 'point1', icon: 'i-lucide-zap', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { key: 'point2', icon: 'i-lucide-shield-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { key: 'point3', icon: 'i-lucide-handshake', color: 'text-purple-600', bg: 'bg-purple-50' },
                      { key: 'point4', icon: 'i-lucide-clock', color: 'text-orange-600', bg: 'bg-orange-50' }
                    ]"
                    :key="point.key"
                    class="group/item flex items-center gap-6 transition-all duration-300"
                  >
                    <div :class="['flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-500 group-hover/item:scale-110 group-hover/item:shadow-lg', point.bg]">
                      <UIcon
                        :name="point.icon"
                        :class="['h-6 w-6', point.color]"
                      />
                    </div>
                    <div>
                      <p class="text-gray-700 text-base sm:text-lg font-medium leading-tight group-hover/item:text-gray-900 transition-colors">
                        {{ t(`landing.seo.content.flights.why.${point.key}`) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UPageSection>

    <!-- Cars Section -->
    <UPageSection
      v-if="isCars"
      class="w-full"
    >
      <div class="max-w-6xl mx-auto px-4">
        <div class="relative group">
          <!-- Background Decorative Glow -->
          <div class="absolute -inset-4 bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          <div class="relative overflow-hidden rounded-[1.5rem] bg-white border border-gray-100 shadow-2xl shadow-primary/5">
            <div class="flex flex-col lg:flex-row">
              <!-- Left Side: Visual/Branding -->
              <div class="lg:w-[40%] bg-primary p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
                <!-- Decorative circles -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div class="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl" />
                <div class="relative z-10">
                  <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md mb-8 border border-white/20">
                    <UIcon
                      name="i-lucide-car"
                      class="h-6 w-6 text-white"
                    />
                  </div>
                  <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                    {{ t('landing.seo.content.cars.title') }}
                  </h2>
                  <div class="h-1 w-16 bg-white/30 rounded-full mb-8" />
                  <p class="text-primary-50/90 text-base sm:text-lg leading-relaxed">
                    {{ t('landing.seo.content.cars.description') }}
                  </p>
                </div>

                <div class="relative z-10 mt-12 flex items-center gap-4">
                  <div class="flex -space-x-2">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="h-8 w-8 rounded-full border-2 border-primary-700 bg-primary-100 flex items-center justify-center text-primary-700"
                    >
                      <UIcon
                        name="i-lucide-user"
                        class="h-4 w-4"
                      />
                    </div>
                  </div>
                  <span class="text-sm text-white/80 font-medium">+1000 users daily</span>
                </div>
              </div>

              <!-- Right Side: Benefits -->
              <div class="lg:w-[60%] p-8 sm:p-12 bg-white flex flex-col justify-center">
                <h3 class="text-xl font-bold text-gray-900 mb-10 flex items-center gap-3">
                  <span class="h-6 w-1 bg-primary rounded-full" />
                  {{ t('landing.seo.content.cars.why.title') }}
                </h3>

                <div class="space-y-8">
                  <div
                    v-for="point in [
                      { key: 'point1', icon: 'i-lucide-search', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { key: 'point2', icon: 'i-lucide-shield-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { key: 'point3', icon: 'i-lucide-map-pin', color: 'text-purple-600', bg: 'bg-purple-50' },
                      { key: 'point4', icon: 'i-lucide-lock', color: 'text-orange-600', bg: 'bg-orange-50' }
                    ]"
                    :key="point.key"
                    class="group/item flex items-center gap-6 transition-all duration-300"
                  >
                    <div :class="['flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-500 group-hover/item:scale-110 group-hover/item:shadow-lg', point.bg]">
                      <UIcon
                        :name="point.icon"
                        :class="['h-6 w-6', point.color]"
                      />
                    </div>
                    <div>
                      <p class="text-gray-700 text-base sm:text-lg font-medium leading-tight group-hover/item:text-gray-900 transition-colors">
                        {{ t(`landing.seo.content.cars.why.${point.key}`) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UPageSection>

    <!-- Features Section -->
    <UPageSection
      :title="t('landing.features.title')"
      :description="t('landing.features.description')"
    >
      <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <UCard
          v-for="feature in trustFeatures"
          :key="feature.title"
          :ui="{ body: 'p-4 sm:p-6' }"
          class="hover:shadow-lg transition-shadow"
        >
          <div class="flex flex-col items-center text-center space-y-2 sm:space-y-3">
            <div
              :class="[
                'flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl',
                `bg-${feature.color}-500/10`
              ]"
            >
              <UIcon
                :name="feature.icon"
                :class="`text-2xl sm:text-3xl text-${feature.color}-600`"
              />
            </div>
            <h3 class="text-base sm:text-lg font-semibold wrap-break-word">
              {{ feature.title }}
            </h3>
            <p class="text-xs sm:text-sm text-muted wrap-break-word">
              {{ feature.description }}
            </p>
          </div>
        </UCard>
      </div>
    </UPageSection>

    <!-- Popular Routes Section -->
    <UPageSection
      v-if="isFlights"
      :title="t('landing.routes.title')"
      :description="t('landing.routes.description')"
    >
      <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        <NuxtLink
          v-for="route in popularRoutes"
          :key="route.slug"
          :to="localePath(`/fluturime/${route.slug}`)"
          class="group relative block"
        >
          <div class="relative overflow-hidden rounded-2xl bg-white border border-primary/10 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
            <!-- Top Decoration Line -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/20 via-primary/70 to-primary/20" />


            <div class="p-5 sm:p-6">
              <!-- Route Visualization -->
              <div class="flex items-center justify-between mb-6 relative">
                <!-- Origin -->
                <div class="text-center z-10">
                  <span class="block text-2xl font-bold text-gray-900 mb-1">{{ route.code.split('-')[0] }}</span>
                  <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Origin</span>
                </div>

                <!-- Flight Path Graphic -->
                <div class="flex-1 px-4 flex flex-col items-center relative">
                  <div class="w-full h-[2px] bg-gray-100 relative overflow-hidden">
                    <div class="absolute inset-0 bg-primary/30 w-full -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    <!-- Dots -->
                    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200" />
                    <div class="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200" />
                  </div>
                  <UIcon
                    name="i-lucide-plane"
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary"
                  />
                </div>

                <!-- Destination -->
                <div class="text-center z-10">
                  <span class="block text-2xl font-bold text-gray-900 mb-1">{{ route.code.split('-')[1] }}</span>
                  <span class="block text-xs text-gray-400 font-medium tracking-wide uppercase">Destinacion</span>
                </div>
              </div>

              <!-- Route Details -->
              <div class="flex items-center justify-between pt-4 border-t border-dashed border-gray-100">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-primary">
                    {{ route.from }} → {{ route.to }}
                  </span>
                  <span class="text-xs text-gray-400 mt-0.5">{{ t('landing.routes.compare') }}</span>
                </div>


                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="h-4 w-4 text-primary"
                  />
                </div>
              </div>
            </div>

            <!-- Side Cutouts (Ticket Style) -->
            <div class="absolute top-[88px] -left-1.5 w-3 h-3 rounded-full bg-gray-50 border border-t-transparent border-l-transparent border-gray-100 rotate-45" />
            <div class="absolute top-[88px] -right-1.5 w-3 h-3 rounded-full bg-gray-50 border border-t-transparent border-r-transparent border-gray-100 -rotate-45" />
          </div>
        </NuxtLink>
      </div>
    </UPageSection>

    <!-- Popular Locations Section (for cars) -->
    <UPageSection
      v-if="isCars"
      :title="t('landing.locations.popular.title')"
      :description="t('landing.locations.popular.description')"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <NuxtLink
          v-for="location in popularLocations"
          :key="location.slug"
          :to="localePath({ name: 'makina-location', params: { location: location.slug } })"
          class="group relative h-96 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 block"
        >
          <!-- Background Image -->
          <img
            :src="location.image"
            :alt="location.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          >

          <!-- Overlay -->
          <div
            class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"
          />

          <!-- Content -->
          <div
            class="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
          >
            <h3 class="text-2xl font-bold text-white mb-2">
              {{ location.name }}
            </h3>
            <div
              class="flex items-center text-white/80 text-sm group-hover:text-white transition-colors"
            >
              <span>{{ t('landing.routes.compare') }}</span> <!-- Reusing 'Krahasoni çmimet' text if available or fallback to a new key -->
              <UIcon
                name="i-heroicons-arrow-right"
                class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </div>
        </NuxtLink>
      </div>
    </UPageSection>

    <!-- FAQ Section -->
    <UPageSection
      :title="t('landing.faq.title')"
      :description="t('landing.faq.description')"
    >
      <div class="w-full lg:w-3xl mx-auto px-4 sm:px-6">
        <UAccordion :items="currentFaqs" />
      </div>
    </UPageSection>

    <!-- CTA Section -->
    <UPageSection
      class="bg-linear-to-br from-primary-600 to-primary-700 text-white"
    >
      <div class="max-w-2xl mx-auto text-center px-4 sm:px-6">
        <h2 class="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
          {{ t('landing.cta.title') }}
        </h2>
        <p class="text-base sm:text-lg mb-6 sm:mb-8 text-primary-100">
          {{ t('landing.cta.description') }}
        </p>
        <div class="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <UButton
            :to="localePath('/fluturime')"
            size="lg"
            :variant="isFlights ? 'solid' : 'outline'"
            trailing-icon="i-lucide-arrow-right"
            :class="[
              'w-full sm:w-auto',
              isFlights
                ? 'bg-white text-primary-700 hover:bg-primary-50'
                : 'border-white text-white hover:bg-white/10'
            ]"
          >
            {{ t('landing.cta.flights') }}
          </UButton>
          <UButton
            :to="localePath('makina')"
            size="lg"
            :variant="isCars ? 'solid' : 'outline'"
            trailing-icon="i-lucide-arrow-right"
            :class="[
              'w-full sm:w-auto',
              isCars
                ? 'bg-white text-primary-700 hover:bg-primary-50'
                : 'border-white text-white hover:bg-white/10'
            ]"
          >
            {{ t('landing.cta.cars') }}
          </UButton>
        </div>
      </div>
    </UPageSection>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

@keyframes float-delayed {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(-30px, 30px) scale(0.9);
  }
  66% {
    transform: translate(20px, -20px) scale(1.1);
  }
}

@keyframes float-slow {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(40px, -40px) scale(1.15);
  }
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes pulse-slower {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

.animate-float {
  animation: float 20s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float-delayed 25s ease-in-out infinite;
}

.animate-float-slow {
  animation: float-slow 30s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}

.animate-pulse-slower {
  animation: pulse-slower 12s ease-in-out infinite;
}
</style>
