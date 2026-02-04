<script setup lang="ts">
const { locale, locales } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const LOCALE_NAMES: Record<string, string> = {
  sq: 'Shqip',
  de: 'Deutsch',
  en: 'English',
}

function getFlagEmoji(code: string): string {
  const flags: Record<string, string> = {
    de: '🇩🇪',
    en: '🇬🇧',
    sq: '🇽🇰',
  }
  return flags[code] ?? '🌐'
}

const availableLocales = computed(() => {
  return (locales.value as Array<{ code: string }>).map((l) => ({
    code: l.code,
    name: LOCALE_NAMES[l.code] ?? l.code,
    flag: getFlagEmoji(l.code),
  }))
})

const currentLocale = computed(() => {
  const current = availableLocales.value.find((l) => l.code === locale.value)
  return current ?? { code: 'sq', name: 'Shqip', flag: '🇽🇰' }
})

// Use pathForLocale so we get /en/, /sq/ etc. instead of wrong /sq/en (switchLocalePath bug)
function pathForLocale(code: string) {
  const pathOnly = route.path.replace(/^\/(sq|de|en)(\/|$)/i, '$2') || '/'
  return localePath(pathOnly, code as 'sq' | 'de' | 'en')
}

const items = computed(() =>
  availableLocales.value.map((l) => ({
    label: `${l.flag} ${l.name}`,
    to: pathForLocale(l.code),
  })),
)
</script>

<template>
  <UDropdownMenu
    :items="items"
    :popper="{ placement: 'bottom-end' }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      size="sm"
      class="gap-1"
      :aria-label="`Switch language, current: ${currentLocale.name}`"
    >
      <span class="text-base">{{ currentLocale.flag }}</span>
      <span class="hidden text-xs sm:inline">{{ currentLocale.code.toUpperCase() }}</span>
    </UButton>
  </UDropdownMenu>
</template>
