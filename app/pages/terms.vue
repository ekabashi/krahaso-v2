<script setup lang="ts">
const { t } = useI18n()
useSeo({ title: `Krahaso – ${t('core.nav.terms')}` })
</script>

<template>
  <div>
    <h1>{{ $t('core.nav.terms') }}</h1>
    <p>{{ $t('core.intro.terms') }}</p>
  </div>
</template>
