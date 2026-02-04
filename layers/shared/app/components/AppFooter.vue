<script setup>
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

const quickLinks = computed(() => [
  { label: t('footer.aboutUs'), to: '/rreth-nesh' },
  { label: t('footer.contact'), to: '/kontakt' },
  { label: t('footer.howItWorks'), to: '/#how-it-works' }
])

const popularLocations = computed(() => [
  { label: t('locations.popular.airport'), to: '/makina-me-qera/aeroporti-prishtines' },
  { label: t('locations.popular.prishtine'), to: '/makina-me-qera/prishtine' },
  { label: t('locations.popular.prizren'), to: '/makina-me-qera/prizren' },
  { label: t('locations.popular.peje'), to: '/makina-me-qera/peje' }
])

const contactInfo = computed(() => [
  {
    icon: 'i-lucide-mail',
    label: 'info@krahaso.co',
    href: 'mailto:info@krahaso.co'
  },
  {
    icon: 'i-lucide-phone',
    label: '+383 49 999 408',
    href: 'tel:+38349999408'
  },
  {
    icon: 'i-lucide-map-pin',
    label: 'Rahovec, Kosovë',
    href: null
  }
])

const socialLinks = computed(() => [
  {
    name: 'Facebook',
    icon: 'i-simple-icons-facebook',
    href: 'https://facebook.com/'
  },
  {
    name: 'Instagram',
    icon: 'i-simple-icons-instagram',
    href: 'https://instagram.com/'
  }
])
</script>

<template>
  <UFooter class="bg-transparent border-t border-neutral-400">
    <div class="container mx-auto px-4 pt-12 lg:pt-16 pb-8 lg:pb-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <img
              src="/logoRed.png"
              alt="Krahaso.co"
              class="h-8 w-8 object-contain"
              loading="eager"
            >
            <span class="font-bold text-xl text-neutral-700">
              Krahaso<span class="text-primary-500">.co</span>
            </span>
          </div>
          <p class="text-sm text-neutral-600 leading-relaxed">
            {{ t('footer.description') }}
          </p>
          <div class="flex items-center gap-3">
            <a
              v-for="social in socialLinks"
              :key="social.name"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="w-10 h-10 rounded-full bg-neutral-200 hover:bg-neutral-200 flex items-center justify-center transition-colors duration-200"
              :aria-label="social.name"
            >
              <UIcon
                :name="social.icon"
                class="w-5 h-5 text-neutral-700"
              />
            </a>
          </div>
        </div>

        <!-- Quick Links Column -->
        <div class="space-y-4">
          <h3 class="font-semibold text-lg text-neutral-800">
            {{ t('footer.quickLinks') }}
          </h3>
          <ul class="space-y-2">
            <li
              v-for="link in quickLinks"
              :key="link.to"
            >
              <ULink
                :to="localePath(link.to)"
                class="text-sm text-neutral-600 hover:text-primary-600 transition-colors duration-200"
              >
                {{ link.label }}
              </ULink>
            </li>
          </ul>
        </div>

        <!-- Popular Locations Column -->
        <div class="space-y-4">
          <h3 class="font-semibold text-lg text-neutral-800">
            {{ t('footer.popularLocations') }}
          </h3>
          <ul class="space-y-2">
            <li
              v-for="location in popularLocations"
              :key="location.to"
            >
              <ULink
                :to="localePath(location.to)"
                class="text-sm text-neutral-600 hover:text-primary-600 transition-colors duration-200"
              >
                {{ location.label }}
              </ULink>
            </li>
          </ul>
        </div>

        <!-- Contact Column -->
        <div class="space-y-4">
          <h3 class="font-semibold text-lg text-neutral-800">
            {{ t('footer.contact') }}
          </h3>
          <ul class="space-y-3">
            <li
              v-for="(info, index) in contactInfo"
              :key="index"
              class="flex items-start gap-3"
            >
              <UIcon
                :name="info.icon"
                class="w-5 h-5 text-neutral-500 mt-0.5 shrink-0"
              />
              <component
                :is="info.href ? 'a' : 'span'"
                :href="info.href"
                :class="[
                  'text-sm text-neutral-600',
                  info.href ? 'hover:text-primary-600 transition-colors duration-200' : ''
                ]"
              >
                {{ info.label }}
              </component>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-neutral-300 mt-12 pt-8">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-sm text-neutral-500">
            {{ t('footer.copyright', { year }) }}
          </p>
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <ULink
              :to="localePath('/privacy-policy')"
              class="text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-200"
            >
              {{ t('footer.privacy') }}
            </ULink>
            <ULink
              :to="localePath('/terms-of-service')"
              class="text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-200"
            >
              {{ t('footer.terms') }}
            </ULink>
          </div>
        </div>
      </div>
    </div>
  </UFooter>
</template>
