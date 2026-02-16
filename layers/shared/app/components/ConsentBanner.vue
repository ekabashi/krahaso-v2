<script setup lang="ts">
/**
 * Consent Banner – minimal cookie bar
 *
 * - Fixed bottom bar, Accept / Reject / Customize
 * - Language switch so user can read in their language before deciding
 * - Link to cookie policy (localePath)
 */

const COOKIE_KEY = 'i18n_locale'

const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()
const consent = useConsent()
const localeCookie = useCookie<string | undefined>(COOKIE_KEY, {
  default: () => undefined,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  path: '/',
})

// Reactive: only show banner if no consent exists.
// Rendering is gated in template with ClientOnly to avoid Teleport hydration mismatches.
const showBanner = computed(() => !consent.hasConsent.value)
const showCustomize = ref(false)

const analyticsConsent = ref(true)
const marketingConsent = ref(true)

const locales = [
  { code: 'sq' as const, name: 'Shqip' },
  { code: 'en' as const, name: 'English' },
  { code: 'de' as const, name: 'Deutsch' },
]

function acceptAll() {
  consent.acceptAll()
  showCustomize.value = false
}

function rejectAll() {
  consent.rejectAll()
  showCustomize.value = false
}

function saveCustom() {
  consent.setConsent(analyticsConsent.value, marketingConsent.value)
  showCustomize.value = false
}

function toggleCustomize() {
  showCustomize.value = !showCustomize.value
}

function switchLanguage(code: 'sq' | 'en' | 'de') {
  if (code === locale.value) return
  
  // Set cookie BEFORE navigation so middleware sees correct locale
  localeCookie.value = code === 'sq' ? undefined : code
  
  navigateTo(switchLocalePath(code))
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
    <Transition name="consent-slide">
      <div
        v-if="showBanner"
        class="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-default shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        role="dialog"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
      >
        <!-- Main bar -->
        <div v-if="!showCustomize">
          <div class="container mx-auto max-w-6xl px-4 py-3 sm:py-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <p id="consent-description" class="text-sm leading-snug text-muted">
                  {{ t('consent.description') }}
                  <NuxtLink
                    :to="localePath('/cookie-policy')"
                    class="text-muted underline underline-offset-2 hover:text-foreground"
                  >
                    {{ t('consent.learnMore') }}
                  </NuxtLink>
                </p>
                <div class="flex shrink-0 items-center gap-1" role="group" aria-label="Language">
                  <span class="mr-1 hidden text-xs text-muted sm:inline">|</span>
                  <template v-for="(loc, idx) in locales" :key="loc.code">
                    <template v-if="idx > 0">
                      <span class="px-0.5 text-muted">·</span>
                    </template>
                    <button
                      type="button"
                      :class="[
                        'rounded px-1.5 py-0.5 text-xs transition-colors',
                        locale === loc.code
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted hover:bg-muted/50 hover:text-foreground',
                      ]"
                      @click="switchLanguage(loc.code)"
                    >
                      {{ loc.name }}
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <UButton color="neutral" variant="ghost" size="sm" class="text-muted" @click="toggleCustomize">
                  {{ t('consent.customize') }}
                </UButton>
                <UButton color="neutral" variant="ghost" size="sm" class="text-muted" @click="rejectAll">
                  {{ t('consent.rejectAll') }}
                </UButton>
                <UButton color="primary" variant="solid" size="sm" @click="acceptAll">
                  {{ t('consent.acceptAll') }}
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Customize panel -->
        <div v-else>
          <div class="container mx-auto max-w-6xl px-4 py-4">
            <div class="mb-3 flex items-center justify-between">
              <div class="flex min-w-0 items-center gap-3">
                <h2 id="consent-title" class="shrink-0 text-sm font-semibold text-foreground">
                  {{ t('consent.manageTitle') }}
                </h2>
                <div class="flex shrink-0 items-center gap-1">
                  <template v-for="(loc, idx) in locales" :key="'c-' + loc.code">
                    <template v-if="idx > 0">
                      <span class="px-0.5 text-xs text-muted">·</span>
                    </template>
                    <button
                      type="button"
                      :class="[
                        'rounded px-1.5 py-0.5 text-xs transition-colors',
                        locale === loc.code
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted hover:bg-muted/50 hover:text-foreground',
                      ]"
                      @click="switchLanguage(loc.code)"
                    >
                      {{ loc.name }}
                    </button>
                  </template>
                </div>
              </div>
              <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="xs" class="shrink-0" @click="toggleCustomize" />
            </div>

            <div class="mb-4 space-y-2">
              <div class="flex items-center justify-between border-b border-default py-2">
                <div>
                  <p class="text-sm font-medium text-foreground">
                    {{ t('consent.categories.essential.title') }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ t('consent.categories.essential.alwaysActive') }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between border-b border-default py-2">
                <div>
                  <p class="text-sm font-medium text-foreground">
                    {{ t('consent.categories.analytics.title') }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ t('consent.categories.analytics.description') }}
                  </p>
                </div>
                <UCheckbox v-model="analyticsConsent" size="sm" />
              </div>
              <div class="flex items-center justify-between border-b border-default py-2">
                <div>
                  <p class="text-sm font-medium text-foreground">
                    {{ t('consent.categories.marketing.title') }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ t('consent.categories.marketing.description') }}
                  </p>
                </div>
                <UCheckbox v-model="marketingConsent" size="sm" />
              </div>
            </div>

            <div class="flex gap-2">
              <UButton color="neutral" variant="ghost" size="sm" @click="toggleCustomize">
                {{ t('consent.cancel') }}
              </UButton>
              <UButton color="primary" variant="solid" size="sm" @click="saveCustom">
                {{ t('consent.savePreferences') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.consent-slide-enter-active,
.consent-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.consent-slide-enter-from,
.consent-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
