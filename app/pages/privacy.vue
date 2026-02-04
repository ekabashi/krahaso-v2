<script setup lang="ts">
const { t } = useI18n()
useSeo({ title: `Krahaso – ${t('core.nav.privacy')}` })
</script>

<template>
  <div>
    <h1>{{ $t('core.nav.privacy') }}</h1>
    <p>{{ $t('core.intro.privacy') }}</p>
  </div>
</template>
