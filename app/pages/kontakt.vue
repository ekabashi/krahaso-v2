<script setup lang="ts">
const { t } = useI18n()
useSeo({ title: `Krahaso – ${t('core.nav.kontakt')}` })
</script>

<template>
  <div>
    <h1>{{ $t('core.nav.kontakt') }}</h1>
    <p>{{ $t('core.intro.kontakt') }}</p>
  </div>
</template>
