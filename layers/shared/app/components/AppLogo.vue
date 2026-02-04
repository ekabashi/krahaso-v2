<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
    :aria-label="$t('shared.nav.home')"
  >
    <img
      src="/logoRed.png"
      alt="Krahaso.co"
      class="h-10 w-10 sm:h-10 sm:w-10 object-contain"
      loading="eager"
    >

    <!-- Text -->
    <span class="font-bold text-lg sm:text-xl text-default">
      Krahaso<span class="text-primary-600">.co</span>
    </span>
  </NuxtLink>
</template>

<style scoped>
.flex:hover {
  transition: transform 0.2s ease;
}

.flex:hover {
  transform: scale(1.02);
}
</style>

