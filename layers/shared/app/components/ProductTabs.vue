<script setup lang="ts">
const props = withDefaults(defineProps<{ dark?: boolean }>(), { dark: false })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const activeProduct = computed(() => {
  const path = route.path.replace(/^\/(sq|de|en)(\/|$)/i, '$2') || '/'
  if (/\/(fluturime|flights|fluege)(\/|$)/.test(path)) return 'flights'
  if (/\/(makina|cars|autos)(\/|$)/.test(path)) return 'cars'
  return 'cars'
})

const tabs = computed(() => [
  {
    key: 'cars',
    icon: 'i-lucide-car',
    label: t('landing.searchType.cars'),
    to: localePath('makina'),
    disabled: false
  },
  {
    key: 'flights',
    icon: 'i-lucide-plane',
    label: t('landing.searchType.flights'),
    to: localePath('fluturime'),
    disabled: false
  },
  {
    key: 'hotels',
    icon: 'i-lucide-building-2',
    label: t('landing.searchType.hotels'),
    to: null,
    disabled: true
  },
  {
    key: 'insurance',
    icon: 'i-lucide-shield-check',
    label: t('landing.searchType.insurance'),
    to: null,
    disabled: true
  }
])
</script>

<template>
  <nav
    role="navigation"
    aria-label="Product categories"
    class="flex flex-wrap justify-start gap-3 sm:gap-4"
  >
    <template v-for="tab in tabs" :key="tab.key">
      <NuxtLink
        v-if="!tab.disabled"
        :to="tab.to!"
        class="flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl transition-colors"
      >
        <span
          :class="[
            'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-sm transition-colors border',
            activeProduct === tab.key
              ? 'bg-primary-100 border-primary-500'
              : props.dark
                ? 'bg-white/10 border-white/20'
                : 'bg-white border-neutral-200'
          ]"
          aria-hidden="true"
        >
          <UIcon
            :name="tab.icon"
            :class="[
              'h-6 w-6 sm:h-7 sm:w-7',
              activeProduct === tab.key
                ? 'text-primary-600'
                : props.dark
                  ? 'text-white/70 hover:text-white'
                  : 'text-neutral-400 hover:text-neutral-600'
            ]"
          />
        </span>
        <span
          :class="[
            'text-sm font-medium',
            activeProduct === tab.key
              ? props.dark ? 'text-white' : 'text-neutral-900'
              : props.dark ? 'text-white/60' : 'text-neutral-500'
          ]"
        >
          {{ tab.label }}
        </span>
      </NuxtLink>

      <UTooltip
        v-else
        :text="t('landing.searchType.comingSoon')"
      >
        <button
          type="button"
          class="flex flex-col items-center gap-1.5 rounded-xl transition-colors cursor-default opacity-75"
          @click.prevent
        >
          <span
            :class="[
              'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-sm transition-colors border',
              props.dark ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-200'
            ]"
            aria-hidden="true"
          >
            <UIcon
              :name="tab.icon"
              :class="['h-6 w-6 sm:h-7 sm:w-7', props.dark ? 'text-white/30' : 'text-neutral-400']"
            />
          </span>
          <span :class="['text-sm font-medium', props.dark ? 'text-white/30' : 'text-neutral-400']">
            {{ tab.label }}
          </span>
        </button>
      </UTooltip>
    </template>
  </nav>
</template>
