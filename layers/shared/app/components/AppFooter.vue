<script setup lang="ts">
const localePath = useLocalePath()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-auto border-t border-gray-200 dark:border-gray-800">
    <div class="mx-auto max-w-7xl px-4 py-6">
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        {{ $t('shared.footer.copyright', { year }) }}
      </p>
      <nav class="mt-2 flex flex-wrap justify-center gap-4 text-sm">
        <NuxtLink :to="localePath('/')" class="hover:underline">
          {{ $t('shared.nav.home') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/flights')" class="hover:underline">
          {{ $t('shared.nav.flights') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/makina-me-qera')" class="hover:underline">
          {{ $t('shared.nav.cars') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/kontakt')" class="hover:underline">
          {{ $t('core.nav.kontakt') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/privacy')" class="hover:underline">
          {{ $t('core.nav.privacy') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/terms')" class="hover:underline">
          {{ $t('core.nav.terms') }}
        </NuxtLink>
      </nav>
    </div>
  </footer>
</template>
