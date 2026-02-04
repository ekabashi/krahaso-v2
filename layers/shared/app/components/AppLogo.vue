<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="flex items-center gap-2 font-bold text-lg text-default hover:opacity-90 transition-opacity"
    :aria-label="$t('shared.nav.home')"
  >
    <span class="text-primary-600 dark:text-primary-400">Krahaso</span>
    <span class="text-muted">.co</span>
  </NuxtLink>
</template>
