<script setup>
// Relative imports so Vite resolves without ~ (avoids virtual:nuxt/css.mjs resolution errors)
import './assets/css/main.css'
import './assets/css/tokens.css'

// Preload primary font file for faster rendering
useHead({
  link: [
    {
      rel: 'preload',
      href: '/fonts/manrope-latin-wght-normal.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
  ],
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', duration: 5000, max: 5 }">
    <NuxtLoadingIndicator color="repeating-linear-gradient(to right,#d91e2e 0%,#d91e2e 100%)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>